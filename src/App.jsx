import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { StudentPanel } from './components/StudentPanel';
import { LoginPage } from './components/LoginPage';
import { 
  getPortalFiles, 
  savePortalFiles,
  saveFileToFirebase,
  deleteFileFromFirebase,
  clearAllFilesFromFirebase
} from './utils/fileUtils';
import { auth, db } from './firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState('student'); // 'student' | 'admin'
  const [theme, setTheme] = useState('light');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);

  // Listen to persistent Firebase Authentication session state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && !user) {
        const isStudent = firebaseUser.email?.toLowerCase().includes('student');
        const role = isStudent ? 'student' : 'admin';
        setUser({ email: firebaseUser.email, uid: firebaseUser.uid, role });
        setActiveRole(role);
        setIsAuthenticated(true);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = (role, userData) => {
    setActiveRole(role);
    setUser({ ...userData, role });
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.log('Firebase SignOut notice:', err);
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  // Apply theme class to body
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Load initial data from localStorage if exists
  useEffect(() => {
    const saved = getPortalFiles();
    if (saved && saved.uploadedFiles && saved.uploadedFiles.length > 0) {
      setUploadedFiles(saved.uploadedFiles);
      setActiveFileId(saved.activeFileId || saved.uploadedFiles[0].id);
    }
  }, []);

  // Real-time Cloud Firestore synchronization for files
  useEffect(() => {
    const q = collection(db, 'files');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesFromFirebase = [];
      snapshot.forEach((docSnap) => {
        filesFromFirebase.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (filesFromFirebase.length > 0) {
        setUploadedFiles(filesFromFirebase);
        setActiveFileId(prev => (prev && filesFromFirebase.some(f => f.id === prev)) ? prev : filesFromFirebase[0].id);
        savePortalFiles({ uploadedFiles: filesFromFirebase, activeFileId: filesFromFirebase[0].id });
      }
    }, (err) => {
      console.log('Firestore live sync notice:', err.message);
    });
    return () => unsubscribe();
  }, []);

  const persistData = (files, currentActiveId) => {
    setUploadedFiles(files);
    setActiveFileId(currentActiveId);
    savePortalFiles({
      uploadedFiles: files,
      activeFileId: currentActiveId
    });
    files.forEach(f => saveFileToFirebase(f));
  };

  const handleAddFiles = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const updated = [...uploadedFiles, ...newFiles];
    const newActiveId = activeFileId || newFiles[0].id;
    persistData(updated, newActiveId);
    newFiles.forEach(f => saveFileToFirebase(f));
  };

  const handleTogglePublish = (fileId) => {
    const updated = uploadedFiles.map(file => {
      if (file.id === fileId) {
        return { ...file, isPublished: !file.isPublished };
      }
      return file;
    });
    persistData(updated, activeFileId);
  };

  const handleTogglePublishAll = (publishState) => {
    const updated = uploadedFiles.map(file => ({ ...file, isPublished: publishState }));
    persistData(updated, activeFileId);
  };

  const handleTogglePublishBatch = (fileIds, publishState) => {
    const idSet = new Set(fileIds);
    const updated = uploadedFiles.map(file => {
      if (idSet.has(file.id)) {
        return { ...file, isPublished: publishState };
      }
      return file;
    });
    persistData(updated, activeFileId);
  };

  const handleDeleteFile = (fileId) => {
    const updated = uploadedFiles.filter(file => file.id !== fileId);
    const newActiveId = updated.length > 0 ? (activeFileId === fileId ? updated[0].id : activeFileId) : null;
    persistData(updated, newActiveId);
    deleteFileFromFirebase(fileId);
  };

  const handleDeleteBatch = (fileIds) => {
    const idSet = new Set(fileIds);
    const updated = uploadedFiles.filter(file => !idSet.has(file.id));
    const newActiveId = updated.length > 0 ? (idSet.has(activeFileId) ? updated[0].id : activeFileId) : activeFileId;
    persistData(updated, newActiveId);
    fileIds.forEach(id => deleteFileFromFirebase(id));
  };

  const handleSetActiveSheetIndex = (fileId, sheetIndex) => {
    const updated = uploadedFiles.map(file => {
      if (file.id === fileId) {
        return { ...file, activeSheetIndex: sheetIndex };
      }
      return file;
    });
    persistData(updated, activeFileId);
  };

  const handleApplyBulkFees = (targetFileId, feeTitle, amountStr, targetScope) => {
    const updated = uploadedFiles.map(file => {
      if (targetScope === 'file' || file.id === targetFileId) {
        if (file.fileCategory !== 'excel' || !file.sheets) return file;
        const updatedSheets = file.sheets.map((sheet, idx) => {
          if (targetScope === 'sheet' && idx !== (file.activeSheetIndex || 0)) {
            return sheet;
          }
          const hasFeeCol = sheet.columns.some(col => 
            col.toLowerCase().trim() === feeTitle.toLowerCase().trim()
          );
          let newCols = [...sheet.columns];
          if (!hasFeeCol) {
            newCols.push(feeTitle);
          }
          const newRows = sheet.data.map(row => {
            return {
              ...row,
              [feeTitle]: amountStr
            };
          });
          return {
            ...sheet,
            columns: newCols,
            data: newRows
          };
        });
        return {
          ...file,
          sheets: updatedSheets
        };
      }
      return file;
    });
    persistData(updated, activeFileId);
  };

  const handleRemoveColumn = (targetFileId, sheetIdx, columnNameToRemove) => {
    const updated = uploadedFiles.map(file => {
      if (file.id === targetFileId && file.fileCategory === 'excel' && file.sheets) {
        const updatedSheets = file.sheets.map((sheet, idx) => {
          if (idx === sheetIdx) {
            const newCols = sheet.columns.filter(col => col !== columnNameToRemove);
            const newRows = sheet.data.map(row => {
              const newRow = { ...row };
              delete newRow[columnNameToRemove];
              return newRow;
            });
            return {
              ...sheet,
              columns: newCols,
              data: newRows
            };
          }
          return sheet;
        });
        return {
          ...file,
          sheets: updatedSheets
        };
      }
      return file;
    });
    persistData(updated, activeFileId);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all uploaded files? This action cannot be undone.')) {
      setUploadedFiles([]);
      setActiveFileId(null);
      savePortalFiles(null);
      clearAllFilesFromFirebase();
    }
  };

  if (!isAuthenticated) {
    return (
      <LoginPage 
        onLogin={handleLogin}
        theme={theme}
        setTheme={setTheme}
        uploadedFiles={uploadedFiles}
      />
    );
  }

  return (
    <div className="app-wrapper">
      <Header
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onClearData={handleClearData}
        hasData={uploadedFiles.length > 0}
        fileCount={uploadedFiles.length}
        theme={theme}
        setTheme={setTheme}
        onLogout={handleLogout}
        user={user}
      />

      <main className="main-content">
        {activeRole === 'admin' ? (
          <AdminPanel
            uploadedFiles={uploadedFiles}
            activeFileId={activeFileId}
            setActiveFileId={(id) => persistData(uploadedFiles, id)}
            onAddFiles={handleAddFiles}
            onTogglePublish={handleTogglePublish}
            onTogglePublishAll={handleTogglePublishAll}
            onTogglePublishBatch={handleTogglePublishBatch}
            onDeleteFile={handleDeleteFile}
            onDeleteBatch={handleDeleteBatch}
            onSetActiveSheetIndex={handleSetActiveSheetIndex}
            onApplyBulkFees={handleApplyBulkFees}
            onRemoveColumn={handleRemoveColumn}
            onClearData={handleClearData}
          />
        ) : (
          <StudentPanel
            uploadedFiles={uploadedFiles}
            activeFileId={activeFileId}
            setActiveFileId={(id) => persistData(uploadedFiles, id)}
            onSetActiveSheetIndex={handleSetActiveSheetIndex}
            user={user}
          />
        )}
      </main>
    </div>
  );
}

export default App;
