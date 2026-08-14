import * as XLSX from 'xlsx';

/**
 * Infer human readable proper field names based on column position & data patterns
 */
export const inferFieldHeader = (keyName, index, sampleVal = '') => {
  const strKey = String(keyName || '').trim();
  const lowerKey = strKey.toLowerCase();

  // If key is already a valid descriptive header, preserve it:
  if (
    lowerKey.includes('sr') || lowerKey.includes('serial') || lowerKey.includes('s.no') || lowerKey.includes('s_no') ||
    lowerKey.includes('roll') || lowerKey.includes('enroll') || lowerKey.includes('id') || lowerKey.includes('code') ||
    lowerKey.includes('candidate') || lowerKey.includes('name') || lowerKey.includes('student') ||
    lowerKey.includes('subject') || lowerKey.includes('marks') || lowerKey.includes('total') ||
    lowerKey.includes('percent') || lowerKey.includes('status') || lowerKey.includes('grade') ||
    lowerKey.includes('scheme') || lowerKey.includes('year') || lowerKey.includes('branch') ||
    lowerKey.includes('class') || lowerKey.includes('course') || lowerKey.includes('fee') || lowerKey.includes('fees')
  ) {
    return strKey;
  }

  // If strKey is already a meaningful text name (not a generic Col 1 or empty placeholder):
  if (strKey && !/^col\s*\d+$/i.test(strKey) && !/^__empty/i.test(strKey) && !/^\d+$/.test(strKey)) {
    return strKey;
  }

  // Fallback position-based heuristic only for unnamed columns
  if (index === 0) return 'Sr. No';
  if (index === 1) return 'Enrollment No';
  if (index === 2) return 'Candidate Name';
  if (index === 3) return 'Scheme';
  if (index === 4) return 'Year';
  if (index === 5) return 'Exam Fees';
  if (index === 6) return 'Tuition Fees';
  
  return strKey.startsWith('Col ') ? `Field ${index + 1}` : (strKey || `Field ${index + 1}`);
};

/**
 * Clean & promote header rows if the first data row contains actual column titles
 */
const promoteHeadersIfPresent = (columns, jsonData, titleInfo) => {
  if (!jsonData || jsonData.length === 0) return { columns, jsonData, titleInfo };

  // Keywords commonly found in table headers
  const headerKeywords = [
    'sr', 'no', 'num', 'roll', 'enroll', 'id', 'candidate', 'student', 
    'name', 'scheme', 'year', 'class', 'branch', 'subject', 'marks', 
    'fees', 'total', 'status', 'percent', 'percentage', 'grade', 'remark'
  ];

  // Detect if current columns are actually student data values (e.g. "25623600001", "DHANGAR PAYAL SANJAY")
  const isColumnStudentData = columns.some(col => {
    const str = String(col).trim();
    return (str.length > 7 && !isNaN(Number(str))) || // 10-digit enrollment number
           (str.includes(' ') && str === str.toUpperCase() && str.length > 8 && !str.includes('COLLEGE') && !str.includes('PHARMACY'));
  });

  if (isColumnStudentData) {
    // Reconstruct Student #1 row from columns
    const student1Row = {};
    const cleanColumns = columns.map((col, idx) => inferFieldHeader(col, idx, col));

    columns.forEach((col, idx) => {
      student1Row[cleanColumns[idx]] = col;
    });

    // Re-map existing jsonData rows to cleanColumns
    const remappedData = jsonData.map(row => {
      const newRow = {};
      const rowVals = Object.values(row);
      cleanColumns.forEach((cleanCol, idx) => {
        newRow[cleanCol] = rowVals[idx] !== undefined ? rowVals[idx] : '';
      });
      return newRow;
    });

    // Place Student #1 back at position 0
    const fullJsonData = [student1Row, ...remappedData];

    return {
      columns: cleanColumns,
      jsonData: fullJsonData,
      titleInfo
    };
  }

  // Check if current columns contain banner titles or generic Col names
  const firstColText = String(columns[0] || '').toLowerCase();
  const isCurrentHeaderBanner = firstColText.includes('college') || 
                                firstColText.includes('university') || 
                                firstColText.includes('pharmacy') || 
                                firstColText.includes('institute') || 
                                firstColText.includes('school') ||
                                firstColText.startsWith('col ') ||
                                firstColText.includes('__empty');

  // Inspect first row of jsonData
  const firstRowObj = jsonData[0];
  const firstRowVals = Object.values(firstRowObj).map(v => String(v || '').trim());

  // Check if first row contains column title keywords or string labels
  const matchedKeywords = firstRowVals.filter(val => {
    const lower = val.toLowerCase();
    return headerKeywords.some(kw => lower.includes(kw));
  }).length;

  const nonNumericVals = firstRowVals.filter(val => val !== '' && isNaN(Number(val))).length;

  // If current header is a banner OR first row has 2+ header keywords:
  if (isCurrentHeaderBanner || matchedKeywords >= 2) {
    let newTitleInfo = titleInfo;
    if (isCurrentHeaderBanner && columns[0] && !columns[0].startsWith('Col ')) {
      newTitleInfo = columns[0];
    }

    const oldKeys = Object.keys(firstRowObj);
    const newColumns = [];

    oldKeys.forEach((oldKey, idx) => {
      let newName = String(firstRowObj[oldKey] || '').trim();
      if (!newName || newName.startsWith('__EMPTY')) {
        newName = `Col ${idx + 1}`;
      }
      let uniqueName = newName;
      let counter = 1;
      while (newColumns.includes(uniqueName)) {
        uniqueName = `${newName}_${counter}`;
        counter++;
      }
      newColumns.push(uniqueName);
    });

    const newJsonData = jsonData.slice(1).map(row => {
      const newRow = {};
      oldKeys.forEach((oldKey, idx) => {
        newRow[newColumns[idx]] = row[oldKey];
      });
      return newRow;
    });

    return {
      columns: newColumns,
      jsonData: newJsonData,
      titleInfo: newTitleInfo
    };
  }

  return { columns, jsonData, titleInfo };
};

/**
 * Reads an Excel file buffer and returns parsed sheets data with smart header detection & title row stripping
 * @param {File} file 
 * @returns {Promise<{ fileName: string, sheets: Array<{ name: string, data: Array<Object>, columns: string[], titleInfo: string }> }>}
 */
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheets = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          
          // Extract raw rows as 2D matrix
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (!rawRows || rawRows.length === 0) {
            return { name: sheetName, data: [], columns: [], titleInfo: '' };
          }

          // Keywords that indicate a title/banner row rather than column headers
          const titleKeywords = [
            'college', 'university', 'institute', 'school', 'pharmacy',
            'department', 'faculty', 'academy', 'examination', 'result',
            'report', 'marksheet', 'statement', 'session', 'academic'
          ];

          const isTitleRow = (row) => {
            if (!row || row.length === 0) return true;
            const filled = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '');
            if (filled.length === 0) return true;
            
            if (filled.length <= 2) return true;

            const rowText = filled.map(c => String(c).toLowerCase()).join(' ');
            return titleKeywords.some(kw => rowText.includes(kw));
          };

          // Find the true header row
          let headerRowIndex = 0;
          let foundHeader = false;
          let titleInfo = '';

          for (let r = 0; r < Math.min(15, rawRows.length); r++) {
            const row = rawRows[r] || [];
            const filledCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
            
            if (isTitleRow(row)) {
              if (filledCells.length > 0 && !titleInfo) {
                titleInfo = filledCells.map(c => String(c).trim()).join(' - ');
              }
              continue;
            }

            headerRowIndex = r;
            foundHeader = true;
            break;
          }

          if (!foundHeader) {
            let maxCells = 0;
            for (let r = 0; r < Math.min(15, rawRows.length); r++) {
              const row = rawRows[r] || [];
              const count = row.filter(c => c !== null && c !== undefined && String(c).trim() !== '').length;
              if (count > maxCells) {
                maxCells = count;
                headerRowIndex = r;
              }
            }
          }

          const rawHeaderRow = rawRows[headerRowIndex] || [];
          let columns = [];
          const colIndexMap = [];

          rawHeaderRow.forEach((cellVal, colIdx) => {
            let colName = String(cellVal || '').trim();
            
            if (!colName || colName.startsWith('__EMPTY')) {
              colName = `Col ${colIdx + 1}`;
            }

            let uniqueName = colName;
            let counter = 1;
            while (columns.includes(uniqueName)) {
              uniqueName = `${colName}_${counter}`;
              counter++;
            }

            columns.push(uniqueName);
            colIndexMap.push({ rawIdx: colIdx, key: uniqueName });
          });

          let jsonData = [];
          for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;
            
            const isBlank = row.every(c => c === null || c === undefined || String(c).trim() !== '');
            if (isBlank) continue;

            const rowObj = {};
            colIndexMap.forEach(({ rawIdx, key }) => {
              const val = row[rawIdx];
              rowObj[key] = (val !== undefined && val !== null) ? val : '';
            });

            jsonData.push(rowObj);
          }

          const promoted = promoteHeadersIfPresent(columns, jsonData, titleInfo);
          columns = promoted.columns;
          jsonData = promoted.jsonData;
          titleInfo = promoted.titleInfo;

          const activeColumns = columns.filter(colKey => {
            if (colKey.startsWith('Col ')) {
              const hasData = jsonData.some(row => row[colKey] !== '' && row[colKey] !== null && row[colKey] !== undefined);
              return hasData;
            }
            return true;
          });

          return {
            name: sheetName,
            data: jsonData,
            columns: activeColumns.length > 0 ? activeColumns : columns,
            titleInfo,
            headerRowIndex
          };
        });

        resolve({
          fileName: file.name,
          uploadTime: new Date().toLocaleString(),
          sheets
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Calculates metrics from tabular data
 */
export const calculateDataMetrics = (rows, columns) => {
  if (!rows || rows.length === 0) return { totalRows: 0, totalCols: 0, numericMetrics: {} };

  const totalRows = rows.length;
  const totalCols = columns.length;

  let passCount = 0;
  let failCount = 0;
  let hasStatusCol = false;

  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key.toLowerCase().includes('status')) {
        hasStatusCol = true;
        const val = String(row[key]).toLowerCase();
        if (val === 'pass' || val === 'passed' || val === 'promoted') passCount++;
        if (val === 'fail' || val === 'failed') failCount++;
      }
    });
  });

  return {
    totalRows,
    totalCols,
    hasStatusCol,
    passCount,
    failCount
  };
};

/**
 * LocalStorage helpers
 */
const STORAGE_KEY = 'excel_admin_student_portal_data';

export const savePortalData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

export const getPortalData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return null;
  }
};
