import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  SlidersHorizontal,
  XCircle,
  FileSpreadsheet,
  Building2,
  Scissors,
  Coins,
  Trash2,
  Pencil,
  Check,
  X
} from 'lucide-react';

export const DataTable = ({ columns, data, title, sheetName, titleInfo, onOpenFeeModal, onRemoveColumn }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [customHeaders, setCustomHeaders] = useState(null);
  const [customRows, setCustomRows] = useState(null);

  // Row Editing State
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editingRowData, setEditingRowData] = useState({});

  const handleStartEditRow = (globalIdx, rowObj) => {
    setEditingRowIndex(globalIdx);
    setEditingRowData({ ...rowObj });
  };

  const handleSaveEditRow = (globalIdx) => {
    const updatedRows = [...activeDataRows];
    updatedRows[globalIdx] = { ...editingRowData };
    setCustomRows(updatedRows);
    setEditingRowIndex(null);
    setEditingRowData({});
  };

  const handleCancelEditRow = () => {
    setEditingRowIndex(null);
    setEditingRowData({});
  };

  const activeColumns = customHeaders || columns;
  const activeDataRows = customRows || data;

  const handlePromoteNextRow = () => {
    if (!activeDataRows || activeDataRows.length === 0) return;
    const firstRow = activeDataRows[0];
    const oldKeys = Object.keys(firstRow);
    
    const newCols = [];
    oldKeys.forEach((key, i) => {
      let val = String(firstRow[key] || '').trim();
      if (!val || val.startsWith('__EMPTY')) {
        val = `Col ${i + 1}`;
      }
      let uniqueVal = val;
      let counter = 1;
      while (newCols.includes(uniqueVal)) {
        uniqueVal = `${val}_${counter}`;
        counter++;
      }
      newCols.push(uniqueVal);
    });

    const newRows = activeDataRows.slice(1).map(row => {
      const newRow = {};
      oldKeys.forEach((oldKey, i) => {
        newRow[newCols[i]] = row[oldKey];
      });
      return newRow;
    });

    setCustomHeaders(newCols);
    setCustomRows(newRows);
    setCurrentPage(1);
  };

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return activeDataRows;
    const query = searchTerm.toLowerCase();
    return activeDataRows.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(query)
      );
    });
  }, [activeDataRows, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      // Handle numbers if applicable
      const numA = Number(valA);
      const numB = Number(valB);

      if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (colKey) => {
    setSortConfig(prev => {
      if (prev.key === colKey) {
        if (prev.direction === 'asc') return { key: colKey, direction: 'desc' };
        return { key: null, direction: 'asc' };
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  const formatCellValue = (col, value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted">-</span>;
    }

    const valStr = String(value);

    // Status Badge check
    if (col.toLowerCase().includes('status')) {
      const lower = valStr.toLowerCase();
      if (lower === 'pass' || lower === 'passed' || lower === 'promoted') {
        return <span className="badge badge-success">{valStr}</span>;
      }
      if (lower === 'fail' || lower === 'failed') {
        return <span className="badge badge-danger">{valStr}</span>;
      }
    }

    // Fee Column formatting
    if (col.toLowerCase().includes('fee')) {
      return (
        <span className="badge badge-fee">
          <Coins size={13} /> {valStr}
        </span>
      );
    }

    // Percentage check
    if (col.toLowerCase().includes('percent') || valStr.endsWith('%')) {
      return <span className="font-numeric bold-text">{valStr}</span>;
    }

    // High Score / Marks check
    if (typeof value === 'number' && value >= 90) {
      return <span className="font-numeric text-highlight">{value}</span>;
    }

    return valStr;
  };

  return (
    <div className="table-card">
      {/* Institution Title Banner if parsed from Excel top rows */}
      {titleInfo && (
        <div className="institution-banner">
          <Building2 size={18} />
          <span>{titleInfo}</span>
        </div>
      )}

      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="toolbar-info">
          <h3>{title || `Sheet: ${sheetName || 'Data'}`}</h3>
          <span className="record-count-badge">{filteredData.length} records</span>
        </div>

        <div className="toolbar-controls">


          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search all records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
            {searchTerm && (
              <button 
                className="clear-search-btn" 
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>



          {/* Page Size Selector */}
          <div className="page-size-selector">
            <SlidersHorizontal size={16} />
            <select 
              value={pageSize} 
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Container (Table View) */}
      <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th className="row-number-header">#</th>
                {(() => {
                  let tableFeeCounter = 0;
                  const headerCols = activeColumns.map((col, idx) => {
                    const isSorted = sortConfig.key === col;
                    let displayCol = col;
                    const cleanCol = String(col).trim().toLowerCase();
                    if (cleanCol.includes('fee')) {
                      tableFeeCounter++;
                      if (cleanCol === 'fees' || cleanCol === 'fee' || cleanCol.startsWith('fees_') || cleanCol.startsWith('fee_')) {
                        if (tableFeeCounter === 1) displayCol = 'Exam Fees';
                        else if (tableFeeCounter === 2) displayCol = 'Tuition Fees';
                      }
                    }

                    return (
                      <th 
                        key={idx} 
                        className="sortable-header"
                        title={`Click to sort by ${col}`}
                      >
                        <div className="header-cell-content">
                          <span onClick={() => handleSort(col)} className="header-title-text">{displayCol}</span>
                          <span className="sort-icon" onClick={() => handleSort(col)}>
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                            ) : (
                              <ArrowUpDown size={13} className="sort-icon-muted" />
                            )}
                          </span>
                          {onRemoveColumn && (
                            <button
                              type="button"
                              className="btn-remove-col"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to remove column "${displayCol}" from this sheet?`)) {
                                  onRemoveColumn(col);
                                }
                              }}
                              title={`Remove column "${displayCol}"`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  });

                  headerCols.push(
                    <th key="action-col" style={{ width: '90px', textAlign: 'center' }}>Action</th>
                  );
                  return headerCols;
                })()}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row, rowIndex) => {
                  const globalIdx = (currentPage - 1) * pageSize + rowIndex;
                  const isEditingThisRow = editingRowIndex === globalIdx;

                  return (
                    <tr key={rowIndex} className={`table-row hover-highlight ${isEditingThisRow ? 'row-editing' : ''}`}>
                      <td className="row-number-cell">
                        {globalIdx + 1}
                      </td>
                      {activeColumns.map((col, colIndex) => (
                        <td key={colIndex}>
                          {isEditingThisRow ? (
                            <input 
                              type="text" 
                              className="table-edit-input"
                              value={editingRowData[col] ?? ''} 
                              onChange={(e) => setEditingRowData(prev => ({ ...prev, [col]: e.target.value }))}
                            />
                          ) : (
                            formatCellValue(col, row[col])
                          )}
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        {isEditingThisRow ? (
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button 
                              type="button"
                              className="btn btn-primary btn-xs"
                              title="Save Changes"
                              onClick={() => handleSaveEditRow(globalIdx)}
                            >
                              <Check size={14} />
                            </button>
                            <button 
                              type="button"
                              className="btn btn-outline btn-xs"
                              title="Cancel"
                              onClick={handleCancelEditRow}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            className="btn btn-outline btn-xs"
                            title="Edit Row"
                            onClick={() => handleStartEditRow(globalIdx, row)}
                          >
                            <Pencil size={13} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={activeColumns.length + 1} className="empty-table-cell">
                    <div className="empty-state">
                      <FileSpreadsheet size={40} className="empty-icon" />
                      <p className="empty-title">No matching data found</p>
                      <p className="empty-desc">
                        {searchTerm 
                          ? `No records match "${searchTerm}". Try a different keyword.` 
                          : "This sheet contains no rows."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>


      {/* Pagination Footer */}
      <div className="table-pagination">
        <div className="pagination-info">
          Showing <strong>{filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
          <strong>{Math.min(currentPage * pageSize, filteredData.length)}</strong> of{' '}
          <strong>{filteredData.length}</strong> entries
        </div>

        <div className="pagination-nav">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>

          <span className="page-indicator">
            Page {currentPage} of {totalPages}
          </span>

          <button
            className="pagination-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
