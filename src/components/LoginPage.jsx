import React, { useState } from 'react';
import { 
  ShieldCheck, 
  GraduationCap, 
  FileSpreadsheet, 
  Lock, 
  Mail, 
  UserCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

export const LoginPage = ({ onLogin, theme, setTheme, uploadedFiles = [] }) => {
  const [activeTab, setActiveTab] = useState('student'); // 'student' | 'admin'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Credentials Form State
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Student Credentials Form State
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    if (activeTab === 'admin') {
      const cleanEmail = adminEmail.trim().toLowerCase();
      const cleanPassword = adminPassword.trim();

      if (!cleanEmail || !cleanPassword) {
        setErrorMsg('Please enter both Admin Email and Password.');
        setIsSubmitting(false);
        return;
      }

      if (cleanEmail === 'admin@gmail.com' && cleanPassword === '12345') {
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } catch (fbErr) {
          if (fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
            try {
              await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            } catch (createErr) {
              console.log('Firebase Auth fallback:', createErr.message);
            }
          }
        }
        onLogin('admin', { email: adminEmail, name: 'Admin User', role: 'admin' });
      } else {
        setErrorMsg('Invalid Admin credentials! Use Email: Admin@gmail.com & Password: 12345');
        setIsSubmitting(false);
        return;
      }
    } else {
      const cleanStudentId = studentId.trim();
      const cleanPassword = studentPassword.trim();

      if (!cleanStudentId || !cleanPassword) {
        setErrorMsg('Please enter both Roll Number / Student ID and Password.');
        setIsSubmitting(false);
        return;
      }

      const isDefaultStudent = (cleanStudentId.toLowerCase() === 'student' || cleanStudentId.toLowerCase() === 'student@gmail.com' || cleanStudentId.toLowerCase() === 'stu-2024-001') && (cleanPassword === '123' || cleanPassword === '12345');

      let foundStudent = null;
      if (uploadedFiles.length > 0) {
        const searchQ = cleanStudentId.toLowerCase();

        for (const file of uploadedFiles) {
          for (const sheet of (file.sheets || [])) {
            for (const row of (sheet.data || [])) {
              const hasMatch = Object.values(row).some(val => 
                String(val).toLowerCase().includes(searchQ)
              );
              if (hasMatch) {
                foundStudent = { 
                  row, 
                  columns: sheet.columns || Object.keys(row),
                  fileName: file.fileName, 
                  sheetName: sheet.name,
                  titleInfo: sheet.titleInfo
                };
                break;
              }
            }
            if (foundStudent) break;
          }
          if (foundStudent) break;
        }
      }

      if (isDefaultStudent || foundStudent || cleanPassword === '123') {
        const studentEmail = cleanStudentId.includes('@') ? cleanStudentId : `${cleanStudentId.toLowerCase().replace(/\s+/g, '')}@student.eduexcel.com`;
        try {
          await signInWithEmailAndPassword(auth, studentEmail, '123456');
        } catch (fbErr) {
          try {
            await createUserWithEmailAndPassword(auth, studentEmail, '123456');
          } catch (cErr) {
            console.log('Firebase Student Auth fallback:', cErr.message);
          }
        }
        onLogin('student', { studentId: cleanStudentId, name: cleanStudentId, result: foundStudent });
      } else {
        setErrorMsg('Invalid Student credentials! Use Roll No/ID: Student & Password: 123');
        setIsSubmitting(false);
        return;
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="login-wrapper">
      <div className="login-background-glow">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>

      <div className="login-container">
        {/* Brand Banner */}
        <div className="login-brand-header">
          <div className="login-logo-circle">
            <FileSpreadsheet size={32} className="login-logo-icon" />
          </div>
          <h1 className="login-brand-title">EduExcel Portal</h1>
          <p className="login-brand-sub">Academic Repository & Management System</p>
        </div>

        {/* Login Glass Card */}
        <div className="login-card glass-card">
          {/* Dual Role Selector Tabs */}
          <div className="login-role-tabs">
            <button
              type="button"
              className={`login-role-tab ${activeTab === 'admin' ? 'active admin' : ''}`}
              onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
            >
              <ShieldCheck size={18} />
              <span>Admin Login</span>
            </button>
            <button
              type="button"
              className={`login-role-tab ${activeTab === 'student' ? 'active student' : ''}`}
              onClick={() => { setActiveTab('student'); setErrorMsg(''); }}
            >
              <GraduationCap size={18} />
              <span>Student Login</span>
            </button>
          </div>

          {/* Form Header Info */}
          <div className="login-form-header">
            <h3>{activeTab === 'admin' ? 'Administrator Portal' : 'Student Result Portal'}</h3>
            <p>
              {activeTab === 'admin' 
                ? 'Sign in to manage datasets, Excel files, and academic records.' 
                : 'Sign in with your Roll Number to check your academic scores and records.'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="login-alert alert alert-danger">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {activeTab === 'admin' ? (
              <>
                <div className="login-field-group">
                  <label className="login-label">Admin Email / Username</label>
                  <div className="login-input-wrapper">
                    <Mail size={18} className="login-input-icon" />
                    <input 
                      type="text"
                      className="login-input"
                      placeholder="Admin@gmail.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-field-group">
                  <label className="login-label">Password</label>
                  <div className="login-input-wrapper">
                    <Lock size={18} className="login-input-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="login-field-group">
                  <label className="login-label">Roll Number / Student ID</label>
                  <div className="login-input-wrapper">
                    <UserCheck size={18} className="login-input-icon" />
                    <input 
                      type="text"
                      className="login-input"
                      placeholder="Student"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="login-field-group">
                  <label className="login-label">Password / Security PIN</label>
                  <div className="login-input-wrapper">
                    <Lock size={18} className="login-input-icon" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      className="login-input"
                      placeholder="••••••••"
                      value={studentPassword}
                      onChange={(e) => setStudentPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      className="btn-toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              className={`btn btn-primary login-submit-btn ${activeTab === 'student' ? 'btn-student' : ''}`}
              disabled={isSubmitting}
            >
              <span>{isSubmitting ? 'Authenticating...' : `Sign In to ${activeTab === 'admin' ? 'Admin Portal' : 'Student Portal'}`}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Footer Note */}
        <p className="login-footer-text">
          Protected by EduExcel Security System • All rights reserved
        </p>
      </div>
    </div>
  );
};
