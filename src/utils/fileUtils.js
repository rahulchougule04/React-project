import { parseExcelFile } from './excelUtils';
import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs,
  collection 
} from 'firebase/firestore';

/**
 * Format bytes to human readable string (KB, MB, etc.)
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Reads a single file and converts it into a standardized File Object for storage & preview
 */
export const parseUploadedFile = (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const id = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const uploadTime = new Date().toLocaleString();
      const fileSize = formatFileSize(file.size);
      const fileSizeBytes = file.size;

      // 1. Excel / CSV files
      if (['xlsx', 'xls', 'csv'].includes(ext)) {
        const excelParsed = await parseExcelFile(file);
        resolve({
          id,
          fileName: file.name,
          fileCategory: 'excel',
          fileType: file.type || `application/${ext}`,
          fileSize,
          fileSizeBytes,
          uploadTime,
          isPublished: true,
          sheets: excelParsed.sheets,
          activeSheetIndex: 0
        });
        return;
      }

      // 2. PDF files
      if (ext === 'pdf' || file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id,
            fileName: file.name,
            fileCategory: 'pdf',
            fileType: 'application/pdf',
            fileSize,
            fileSizeBytes,
            uploadTime,
            isPublished: true,
            dataUrl: e.target.result
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      // 3. Image files
      if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id,
            fileName: file.name,
            fileCategory: 'image',
            fileType: file.type || `image/${ext}`,
            fileSize,
            fileSizeBytes,
            uploadTime,
            isPublished: true,
            dataUrl: e.target.result
          });
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      // 4. Text & Document files
      const reader = new FileReader();
      if (['txt', 'json', 'csv', 'md'].includes(ext)) {
        reader.onload = (e) => {
          resolve({
            id,
            fileName: file.name,
            fileCategory: 'doc',
            fileType: file.type || 'text/plain',
            fileSize,
            fileSizeBytes,
            uploadTime,
            isPublished: true,
            textContent: e.target.result
          });
        };
        reader.readAsText(file);
      } else {
        reader.onload = (e) => {
          resolve({
            id,
            fileName: file.name,
            fileCategory: 'doc',
            fileType: file.type || 'application/octet-stream',
            fileSize,
            fileSizeBytes,
            uploadTime,
            isPublished: true,
            dataUrl: e.target.result
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Parses batch of files in parallel and returns results & errors
 */
export const parseBatchFiles = async (fileList) => {
  const files = Array.from(fileList || []);
  const results = [];
  const errors = [];

  for (const file of files) {
    try {
      const parsed = await parseUploadedFile(file);
      results.push(parsed);
    } catch (err) {
      console.error(`Failed to parse file ${file.name}`, err);
      errors.push(`${file.name}: Unable to read file`);
    }
  }

  return { results, errors };
};

/**
 * LocalStorage management for all portal files
 */
const STORAGE_KEY = 'edu_excel_portal_all_files';

export const savePortalFiles = (filesData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filesData));
  } catch (e) {
    console.error('Failed to save files to localStorage', e);
  }
};

export const getPortalFiles = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }

    // Fallback migration check for old excel key
    const oldRaw = localStorage.getItem('excel_admin_student_portal_data');
    if (oldRaw) {
      const oldParsed = JSON.parse(oldRaw);
      if (oldParsed && oldParsed.excelData) {
        const migratedFile = {
          id: 'file_legacy_' + Date.now(),
          fileName: oldParsed.excelData.fileName || 'Uploaded_Excel.xlsx',
          fileCategory: 'excel',
          fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileSize: '150 KB',
          uploadTime: oldParsed.excelData.uploadTime || new Date().toLocaleString(),
          isPublished: oldParsed.isPublished ?? true,
          sheets: oldParsed.excelData.sheets || [],
          activeSheetIndex: oldParsed.activeSheetIndex || 0
        };
        return {
          uploadedFiles: [migratedFile],
          activeFileId: migratedFile.id
        };
      }
    }

    return null;
  } catch (e) {
    console.error('Failed to read portal files from localStorage', e);
    return null;
  }
};

/**
 * Firebase Firestore document persistence
 */
export const saveFileToFirebase = async (fileObj) => {
  try {
    if (!fileObj || !fileObj.id) return;
    const cleanData = JSON.parse(JSON.stringify(fileObj));
    await setDoc(doc(db, 'files', fileObj.id), cleanData, { merge: true });
    console.log(`✅ [Firestore: payment-f9b39] Saved document "${fileObj.fileName}" (ID: ${fileObj.id})`);
  } catch (err) {
    console.error(`❌ [Firestore: payment-f9b39] Failed to save document "${fileObj?.fileName}":`, err);
  }
};

export const deleteFileFromFirebase = async (fileId) => {
  try {
    if (!fileId) return;
    await deleteDoc(doc(db, 'files', fileId));
    console.log(`✅ [Firestore: payment-f9b39] Deleted document (ID: ${fileId})`);
  } catch (err) {
    console.error(`❌ [Firestore: payment-f9b39] Failed to delete document (ID: ${fileId}):`, err);
  }
};

export const clearAllFilesFromFirebase = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'files'));
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'files', docSnap.id)));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Failed to clear files from Firebase Firestore:', err);
  }
};
