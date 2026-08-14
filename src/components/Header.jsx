import React from 'react';
import { 
  FileSpreadsheet, 
  ShieldCheck, 
  GraduationCap, 
  Sun, 
  Moon,
  LogOut
} from 'lucide-react';

export const Header = ({ 
  activeRole, 
  setActiveRole, 
  onClearData, 
  hasData, 
  fileCount = 0,
  theme, 
  setTheme,
  onLogout,
  user
}) => {
  return (
    <>
      <header className="app-header">
        <div className="header-container">
          {/* Brand / Logo */}
          <div className="brand-logo">
            <div className="logo-icon-wrapper">
              <FileSpreadsheet className="logo-icon" size={26} />
            </div>
            <div>
              <h1 className="brand-title">EduExcel Portal</h1>
              <p className="brand-subtitle">Smart Analytics & File Repository</p>
            </div>
          </div>
          {/* Center Role Toggle - Only for Admin */}
          {user?.role === 'student' ? (
            <div className="badge badge-success" style={{ display: 'flex', gap: '6px', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
              <GraduationCap size={16} />
              <span>Student Portal</span>
            </div>
          ) : (
            <div className="role-switcher">
              <button
                className={`role-btn ${activeRole === 'admin' ? 'active admin' : ''}`}
                onClick={() => setActiveRole('admin')}
              >
                <ShieldCheck size={18} />
                <span>Admin Panel</span>
              </button>
              <button
                className={`role-btn ${activeRole === 'student' ? 'active student' : ''}`}
                onClick={() => setActiveRole('student')}
              >
                <GraduationCap size={18} />
                <span>Student Panel</span>
              </button>
            </div>
          )}
          <div className="header-actions">
            {hasData && (
              <span className="header-file-badge" title={`${fileCount} file(s) loaded`}>
                <FileSpreadsheet size={14} /> {fileCount} file{fileCount > 1 ? 's' : ''}
              </span>
            )}
            <button 
              className="theme-toggle-btn" 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {onLogout && (
              <button 
                className="btn btn-outline btn-sm btn-logout" 
                onClick={onLogout}
                title="Sign out of your session"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

