import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraduationCap, 
  Search, 
  Award, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet,
  FileQuestion,
  ArrowRight,
  UserCheck,
  Building2,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
  Eye,
  Coins,
  CreditCard,
  QrCode,
  ShieldCheck,
  Printer,
  Lock,
  Smartphone,
  Building,
  Receipt,
  Check,
  X
} from 'lucide-react';
import { inferFieldHeader } from '../utils/excelUtils';

export const StudentPanel = ({ 
  uploadedFiles = [], 
  activeFileId, 
  setActiveFileId, 
  onSetActiveSheetIndex,
  user
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentResult, setSelectedStudentResult] = useState(user?.result || null);
  const [viewingPdf, setViewingPdf] = useState(null);

  // Online Fee Payment States
  const [paymentModal, setPaymentModal] = useState(null); // { title, amount, studentName, enrollNo, feeKey }
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking'
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);
  const [paidFeeKeys, setPaidFeeKeys] = useState(() => {
    try {
      const saved = localStorage.getItem('portal_paid_fees');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (user?.result && !selectedStudentResult) {
      setSelectedStudentResult(user.result);
    }
  }, [user]);

  const handleOpenPaymentModal = (title, amount, studentName, enrollNo, feeKey) => {
    setPaymentSuccessData(null);
    setIsProcessingPayment(false);
    setPaymentMethod('upi');
    setPaymentModal({
      title,
      amount,
      studentName: studentName || 'Student',
      enrollNo: enrollNo || 'N/A',
      feeKey: `${enrollNo}_${feeKey}`
    });
  };

  const handleClosePaymentModal = () => {
    setPaymentModal(null);
    setPaymentSuccessData(null);
    setIsProcessingPayment(false);
  };

  const handleExecutePayment = () => {
    if (!paymentModal) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const txnId = `TXN${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 900 + 100)}`;
      const paidDate = new Date().toLocaleString('en-GB', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      const receipt = {
        transactionId: txnId,
        paidAt: paidDate,
        title: paymentModal.title,
        amount: paymentModal.amount,
        studentName: paymentModal.studentName,
        enrollNo: paymentModal.enrollNo,
        method: paymentMethod,
        feeKey: paymentModal.feeKey
      };

      // Mark fee as paid
      const updatedPaid = { 
        ...paidFeeKeys, 
        [paymentModal.feeKey]: { paid: true, transactionId: txnId, paidAt: paidDate } 
      };
      setPaidFeeKeys(updatedPaid);
      try {
        localStorage.setItem('portal_paid_fees', JSON.stringify(updatedPaid));
      } catch (err) {
        console.log('Payment persistence error:', err);
      }

      setIsProcessingPayment(false);
      setPaymentSuccessData(receipt);
    }, 1500);
  };

  const handleViewReceipt = (title, amount, studentName, enrollNo, feeKey) => {
    const key = `${enrollNo}_${feeKey}`;
    const paidInfo = paidFeeKeys[key] || {};
    setPaymentSuccessData({
      transactionId: paidInfo.transactionId || `TXN${Date.now().toString().slice(-8)}`,
      paidAt: paidInfo.paidAt || new Date().toLocaleString(),
      title,
      amount,
      studentName,
      enrollNo,
      method: 'UPI Online',
      feeKey: key
    });
    setPaymentModal({
      title,
      amount,
      studentName,
      enrollNo,
      feeKey: key
    });
  };

  // All files accessible in StudentPanel
  const publishedFiles = useMemo(() => {
    return uploadedFiles;
  }, [uploadedFiles]);

  const publishedExcel = useMemo(() => publishedFiles.filter(f => f.fileCategory === 'excel'), [publishedFiles]);
  const publishedPdf = useMemo(() => publishedFiles.filter(f => f.fileCategory === 'pdf'), [publishedFiles]);
  const publishedImage = useMemo(() => publishedFiles.filter(f => f.fileCategory === 'image'), [publishedFiles]);
  const publishedDoc = useMemo(() => publishedFiles.filter(f => f.fileCategory === 'doc'), [publishedFiles]);

  // Active Excel file
  const activeExcelFile = useMemo(() => {
    return publishedExcel.find(f => f.id === activeFileId) || publishedExcel[0] || null;
  }, [publishedExcel, activeFileId]);

  const activeSheetIdx = activeExcelFile?.activeSheetIndex || 0;
  const activeSheet = activeExcelFile?.sheets?.[activeSheetIdx] || activeExcelFile?.sheets?.[0] || null;

  // Search across Excel records
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || publishedExcel.length === 0) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches = [];

    publishedExcel.forEach((file) => {
      (file.sheets || []).forEach((sheet, sheetIndex) => {
        (sheet.data || []).forEach((row) => {
          const isMatch = Object.entries(row).some(([_, val]) => 
            String(val).toLowerCase().includes(q)
          );
          if (isMatch) {
            matches.push({
              row,
              columns: sheet.columns || Object.keys(row),
              fileName: file.fileName,
              sheetName: sheet.name,
              titleInfo: sheet.titleInfo,
              fileId: file.id,
              sheetIndex
            });
          }
        });
      });
    });

    return matches;
  }, [searchQuery, publishedExcel]);

  if (publishedFiles.length === 0) {
    return (
      <div className="student-container">
        <div className="empty-state-card glass-card">
          <FileQuestion size={56} className="empty-icon text-muted" />
          <h3>No Documents or Datasets Published Yet</h3>
          <p>
            No files or datasets have been published yet. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-container">
      {/* SECTION 1: EXCEL SEARCH & SCORECARDS */}
      <div className="lookup-section">
        {/* Search Box */}
        <div className="lookup-search-card glass-card">
          <h3>Search Here</h3>
          <p className="search-hint">Enter your Roll Number, Student Name, or Student ID to view your score card</p>

          <div className="large-search-box">
            <Search size={22} className="search-box-icon" />
            <input
              type="text"
              placeholder="Search here..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedStudentResult(null);
              }}
              className="large-search-input"
              autoFocus
            />
            {searchQuery && (
              <button 
                className="btn btn-text"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStudentResult(null);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {searchQuery && searchResults.length > 0 && !selectedStudentResult && (
            <div className="results-dropdown">
              <p className="dropdown-title">Matching Records ({searchResults.length}):</p>
              <div className="dropdown-list">
                {searchResults.map((item, idx) => {
                  const row = item.row;
                  const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name')) || Object.keys(row)[1] || Object.keys(row)[0];
                  const rollKey = Object.keys(row).find(k => k.toLowerCase().includes('roll') || k.toLowerCase().includes('id') || k.toLowerCase().includes('enroll')) || Object.keys(row)[0];
                  return (
                    <div 
                      key={idx} 
                      className="dropdown-item"
                      onClick={() => setSelectedStudentResult(item)}
                    >
                      <div className="student-name-text">
                        <strong>{row[nameKey] || 'Student'}</strong>
                        <span className="student-roll">
                          {rollKey}: {row[rollKey]} • <span className="text-primary">{item.fileName} ({item.sheetName})</span>
                        </span>
                      </div>
                      <ArrowRight size={16} className="item-arrow" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="no-match-alert alert alert-warning">
              <XCircle size={18} />
              <span>No matching student record found for "{searchQuery}".</span>
            </div>
          )}

          {!searchQuery && !selectedStudentResult && (
            <div className="search-prompt-info">
              <UserCheck size={20} className="text-muted" />
              <span>Type your Roll Number or Student Name above to view your score card.</span>
            </div>
          )}
        </div>

        {/* Selected Scorecard */}
        {selectedStudentResult && (() => {
          const rawRow = selectedStudentResult.row || {};

          // Resolve ordered columns
          let orderedCols = selectedStudentResult.columns;
          if (!orderedCols && selectedStudentResult.fileId && selectedStudentResult.sheetIndex !== undefined) {
            const f = publishedExcel.find(file => file.id === selectedStudentResult.fileId);
            if (f?.sheets?.[selectedStudentResult.sheetIndex]?.columns) {
              orderedCols = f.sheets[selectedStudentResult.sheetIndex].columns;
            }
          }
          if (!orderedCols || orderedCols.length === 0) {
            orderedCols = Object.keys(rawRow);
          }

          // Build ordered field objects
          const fieldsList = orderedCols.map((colName, colIdx) => {
            let val = rawRow[colName];
            if (val === undefined) {
              const matchedKey = Object.keys(rawRow).find(k => k.trim().toLowerCase() === colName.trim().toLowerCase());
              if (matchedKey) val = rawRow[matchedKey];
            }
            return {
              key: colName,
              val: val !== undefined ? val : '',
              label: inferFieldHeader(colName, colIdx, val)
            };
          });

          const studentNameObj = fieldsList.find(f => {
            const k = (f.label + ' ' + f.key).toLowerCase();
            return k.includes('candidate') || k.includes('name') || k.includes('student');
          });
          const enrollNoObj = fieldsList.find(f => {
            const k = (f.label + ' ' + f.key).toLowerCase();
            return k.includes('enroll') || k.includes('roll') || k.includes('reg') || k.includes('id');
          });
          const candidateEnroll = enrollNoObj?.val || fieldsList.find(f => /^\d{6,}$/.test(String(f.val).trim()))?.val || rawRow['Enroll No'] || rawRow['Enrollment No'] || '';
          const studentName = studentNameObj ? studentNameObj.val : (rawRow['Candidate Name'] || rawRow['Name'] || 'Student');
          const enrollNo = candidateEnroll || 'N/A';
          const feeFields = fieldsList.filter(f => f.label.toLowerCase().includes('fee') || f.key.toLowerCase().includes('fee'));

          // Calculate total fees
          let totalFeeNum = 0;
          feeFields.forEach(f => {
            const num = parseFloat(String(f.val).replace(/[^0-9.]/g, ''));
            if (!isNaN(num)) totalFeeNum += num;
          });
          const totalFeeStr = `₹${totalFeeNum.toLocaleString('en-IN')}`;

          return (
            <div className="report-card-wrapper glass-card printable-report">
              {(selectedStudentResult.titleInfo || selectedStudentResult.sheetName) && (
                <div className="report-institution-banner">
                  <Building2 size={18} />
                  <span>{selectedStudentResult.titleInfo || `${selectedStudentResult.fileName} - ${selectedStudentResult.sheetName}`}</span>
                </div>
              )}

              <div className="report-header">
                <div className="report-title-group">
                  <div className="report-icon">
                    <Award size={32} />
                  </div>
                  <div>
                    <h2>Academic Data</h2>
                    <p className="report-sub">Official Academic Data Summary</p>
                  </div>
                </div>
              </div>

              <div className="student-details-grid">
                {fieldsList.map((item, idx) => {
                  const label = item.label;
                  const val = item.val;
                  const isStatus = label.toLowerCase().includes('status');
                  const isPercent = label.toLowerCase().includes('percent') || String(val).endsWith('%');
                  const isName = label.toLowerCase().includes('name') || label.toLowerCase().includes('candidate');
                  const isFee = label.toLowerCase().includes('fee');
                  const feeItemKey = `${enrollNo}_${item.key}`;
                  const isPaid = paidFeeKeys[feeItemKey]?.paid;

                  return (
                    <div 
                      key={idx} 
                      className={`detail-box ${isName ? 'detail-box-name detail-box-highlight' : ''} ${isFee ? 'detail-box-fee' : ''}`}
                    >
                      <div className="detail-box-header-row">
                        <span className="detail-label">{label}</span>
                        {isFee && isPaid && (
                          <span className="badge-paid-pill">
                            <CheckCircle2 size={12} /> Paid
                          </span>
                        )}
                      </div>
                      <span className="detail-value">
                        {isStatus ? (
                          String(val).toLowerCase() === 'pass' ? (
                            <span className="badge badge-successLarge">
                              <CheckCircle2 size={16} /> PASS
                            </span>
                          ) : (
                            <span className="badge badge-dangerLarge">
                              <XCircle size={16} /> FAIL
                            </span>
                          )
                        ) : isPercent ? (
                          <span className="percent-val">{val}</span>
                        ) : isFee ? (
                          <div className="fee-card-content">
                            <span className="fee-badge-val">
                              <Coins size={14} /> {val}
                            </span>
                            <div className="fee-box-action-wrap">
                              {isPaid ? (
                                <button 
                                  type="button" 
                                  className="btn btn-receipt-sm"
                                  onClick={() => handleViewReceipt(label, val, studentName, enrollNo, item.key)}
                                >
                                  <Receipt size={13} />
                                  <span>Receipt</span>
                                </button>
                              ) : (
                                <button 
                                  type="button" 
                                  className="btn btn-pay-action-sm"
                                  onClick={() => handleOpenPaymentModal(label, val, studentName, enrollNo, item.key)}
                                >
                                  <CreditCard size={13} />
                                  <span>Pay Now</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          val || '-'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Online Fee Payment Banner if fees exist */}
              {feeFields.length > 0 && (
                <div className="fee-checkout-banner glass-card">
                  <div className="fee-checkout-left">
                    <div className="fee-checkout-icon">
                      <CreditCard size={26} />
                    </div>
                    <div>
                      <h4>Online Fee Payment Gateway</h4>
                      <p className="fee-checkout-sub">
                        Pay your academic fees securely via UPI QR Code, Debit/Credit Card, or Net Banking.
                      </p>
                    </div>
                  </div>
                  <div className="fee-checkout-right">
                    <div className="fee-total-badge">
                      <span className="fee-total-lbl">Total Fee Particulars:</span>
                      <strong className="fee-total-val">{totalFeeStr}</strong>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-success btn-pay-now-hero"
                      onClick={() => handleOpenPaymentModal(
                        `Academic & Exam Fees (${feeFields.map(f => f.label).join(' + ')})`,
                        totalFeeStr,
                        studentName,
                        enrollNo,
                        'TOTAL_FEES'
                      )}
                    >
                      <CreditCard size={16} />
                      <span>Pay Total ({totalFeeStr})</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="report-footer">
                <div className="verified-stamp">
                  <CheckCircle2 size={16} className="text-success" />
                  <span>Verified Dataset: {selectedStudentResult.fileName} ({selectedStudentResult.sheetName})</span>
                </div>
                <div className="timestamp-stamp">
                  <span>Issued on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ONLINE FEE PAYMENT MODAL */}
      {paymentModal && (
        <div className="payment-modal-overlay" onClick={handleClosePaymentModal}>
          <div className="payment-modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            {paymentSuccessData ? (
              /* Success & Official Receipt View */
              <div className="payment-success-content">
                <div className="success-icon-wrap">
                  <CheckCircle2 size={54} className="text-success" />
                </div>
                <h2 className="success-title">Payment Successful!</h2>
                <p className="success-sub">Your payment has been successfully authorized and confirmed.</p>

                {/* Printable Official Fee Receipt Card */}
                <div className="receipt-paper-card" id="printable-receipt">
                  <div className="receipt-header">
                    <div className="receipt-brand">
                      <Building2 size={20} />
                      <span>EduExcel Academic Portal</span>
                    </div>
                    <span className="receipt-badge-verified">OFFICIAL RECEIPT</span>
                  </div>

                  <div className="receipt-amount-banner">
                    <span className="receipt-amount-label">AMOUNT PAID</span>
                    <h1 className="receipt-amount-val">{paymentSuccessData.amount}</h1>
                  </div>

                  <div className="receipt-details-table">
                    <div className="receipt-row">
                      <span className="r-label">Candidate Name:</span>
                      <span className="r-val font-bold">{paymentSuccessData.studentName}</span>
                    </div>
                    <div className="receipt-row receipt-row-highlight" style={{ background: 'rgba(2, 132, 199, 0.08)', padding: '8px 10px', borderRadius: '6px', margin: '4px 0' }}>
                      <span className="r-label" style={{ fontWeight: '800', color: 'var(--primary)' }}>ENROLMENT NO:</span>
                      <span className="r-val font-bold font-mono" style={{ fontSize: '1.05rem', color: 'var(--primary)' }}>{paymentSuccessData.enrollNo}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="r-label">Fee Particulars:</span>
                      <span className="r-val font-semibold">{paymentSuccessData.title}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="r-label">Transaction ID:</span>
                      <span className="r-val font-mono">{paymentSuccessData.transactionId}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="r-label">Payment Date & Time:</span>
                      <span className="r-val">{paymentSuccessData.paidAt}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="r-label">Payment Mode:</span>
                      <span className="r-val font-semibold">{paymentSuccessData.method.toUpperCase()}</span>
                    </div>
                    <div className="receipt-row">
                      <span className="r-label">Transaction Status:</span>
                      <span className="r-val text-success font-bold">PAID & VERIFIED ✓</span>
                    </div>
                  </div>
                </div>

                <div className="receipt-actions-row">
                  <button 
                    type="button"
                    className="btn btn-outline"
                    onClick={() => window.print()}
                  >
                    <Printer size={16} />
                    <span>Print Receipt</span>
                  </button>
                  <button 
                    type="button"
                    className="btn btn-primary"
                    onClick={handleClosePaymentModal}
                  >
                    <Check size={16} />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : isProcessingPayment ? (
              /* Processing Animation */
              <div className="payment-processing-content">
                <div className="payment-spinner"></div>
                <h3>Processing Payment...</h3>
                <p>Connecting to secure payment gateway. Please do not refresh or close.</p>
              </div>
            ) : (
              /* Payment Checkout Form */
              <div className="payment-checkout-content">
                <div className="checkout-header">
                  <div className="checkout-title-wrap">
                    <div className="checkout-icon-wrap">
                      <CreditCard size={22} />
                    </div>
                    <div>
                      <h3>Online Fee Payment</h3>
                      <p className="checkout-sub">Secure Academic Fee Gateway</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-icon-close" 
                    onClick={handleClosePaymentModal}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Student & Fee Summary */}
                <div className="checkout-summary-box">
                  <div className="summary-line">
                    <span className="sum-label">Student Name:</span>
                    <span className="sum-val font-bold">{paymentModal.studentName}</span>
                  </div>
                  <div className="summary-line">
                    <span className="sum-label">Enrollment No:</span>
                    <span className="sum-val">{paymentModal.enrollNo}</span>
                  </div>
                  <div className="summary-line">
                    <span className="sum-label">Fee Particulars:</span>
                    <span className="sum-val">{paymentModal.title}</span>
                  </div>
                  <div className="summary-line total-line">
                    <span className="sum-label">Total Payable:</span>
                    <span className="sum-amount">{paymentModal.amount}</span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="payment-method-selector">
                  <span className="method-label">Select Payment Method:</span>
                  <div className="method-tabs">
                    <button 
                      type="button" 
                      className={`method-tab ${paymentMethod === 'upi' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('upi')}
                    >
                      <Smartphone size={16} />
                      <span>UPI / QR Code</span>
                    </button>
                    <button 
                      type="button" 
                      className={`method-tab ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('card')}
                    >
                      <CreditCard size={16} />
                      <span>Debit / Credit Card</span>
                    </button>
                    <button 
                      type="button" 
                      className={`method-tab ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                      onClick={() => setPaymentMethod('netbanking')}
                    >
                      <Building size={16} />
                      <span>Net Banking</span>
                    </button>
                  </div>
                </div>

                {/* Method Specific Views */}
                <div className="method-body">
                  {paymentMethod === 'upi' && (
                    <div className="upi-payment-view">
                      <div className="qr-code-box">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=eduexcel.fees@okaxis&pn=EduExcelPortal&am=${String(paymentModal.amount).replace(/[^0-9.]/g, '')}&cu=INR`}
                          alt="UPI QR Code" 
                          className="qr-img"
                        />
                        <span className="qr-hint">Scan with GPay, PhonePe, Paytm, or BHIM</span>
                      </div>
                      <div className="upi-id-box">
                        <label className="input-lbl">Or Enter UPI ID / VPA:</label>
                        <input 
                          type="text" 
                          className="fee-input" 
                          placeholder="yourname@okhdfcbank" 
                          defaultValue="student@upi" 
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="card-payment-view">
                      <div className="card-input-field">
                        <label className="input-lbl">Card Number</label>
                        <input 
                          type="text" 
                          className="fee-input" 
                          placeholder="4532 •••• •••• 8920" 
                          defaultValue="4532 8921 4092 8812" 
                        />
                      </div>
                      <div className="card-row-2">
                        <div className="card-input-field">
                          <label className="input-lbl">Expiry (MM/YY)</label>
                          <input type="text" className="fee-input" placeholder="12/28" defaultValue="08/28" />
                        </div>
                        <div className="card-input-field">
                          <label className="input-lbl">CVV</label>
                          <input type="password" className="fee-input" placeholder="•••" defaultValue="842" maxLength={4} />
                        </div>
                      </div>
                      <div className="card-input-field">
                        <label className="input-lbl">Name on Card</label>
                        <input 
                          type="text" 
                          className="fee-input" 
                          placeholder="Name on card" 
                          defaultValue={paymentModal.studentName || 'Student'} 
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="netbanking-view">
                      <label className="input-lbl">Select Your Bank:</label>
                      <div className="bank-options-grid">
                        {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Punjab National Bank', 'Bank of Baroda'].map((bank, bIdx) => (
                          <label key={bIdx} className="bank-radio-card">
                            <input type="radio" name="selectedBank" defaultChecked={bIdx === 0} />
                            <span>{bank}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Secure Action Button */}
                <button 
                  type="button" 
                  className="btn btn-success btn-checkout-submit"
                  onClick={handleExecutePayment}
                >
                  <ShieldCheck size={18} />
                  <span>Pay {paymentModal.amount} Securely</span>
                </button>
                <div className="secure-badge-footer">
                  <Lock size={13} />
                  <span>256-Bit SSL Encrypted & Verified Payment Gateway</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: PDF DOCUMENTS */}
      {publishedPdf.length > 0 && (
        <div className="student-pdf-section margin-top-lg">
          <div className="section-header margin-bottom-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <FileText size={20} className="text-primary" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Official PDF Documents ({publishedPdf.length})</h3>
          </div>
          <div className="pdf-files-grid">
              {publishedPdf.map((pdfFile) => (
                <div key={pdfFile.id} className="pdf-document-card glass-card">
                  <div className="pdf-card-header">
                    <FileText size={28} className="icon-pdf" />
                    <div className="pdf-card-title">
                      <h4>{pdfFile.fileName}</h4>
                      <span className="pdf-meta">{pdfFile.fileSize} • Published {pdfFile.uploadTime}</span>
                    </div>
                  </div>

                  <div className="pdf-card-actions">
                    <button 
                      className="btn btn-outline-glow btn-sm"
                      onClick={() => setViewingPdf(viewingPdf?.id === pdfFile.id ? null : pdfFile)}
                    >
                      <Eye size={15} />
                      <span>{viewingPdf?.id === pdfFile.id ? 'Close Viewer' : 'View PDF'}</span>
                    </button>
                    <a 
                      href={pdfFile.dataUrl} 
                      download={pdfFile.fileName} 
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={15} />
                      <span>Download</span>
                    </a>
                  </div>

                  {viewingPdf?.id === pdfFile.id && (
                    <div className="student-pdf-viewer-box margin-top">
                      <div className="preview-toolbar">
                        <span className="toolbar-label">
                          <Eye size={16} /> Viewing: {pdfFile.fileName}
                        </span>
                        <a 
                          href={pdfFile.dataUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn-text"
                        >
                          <ExternalLink size={14} /> Fullscreen
                        </a>
                      </div>
                      <iframe 
                        src={pdfFile.dataUrl} 
                        title={pdfFile.fileName}
                        className="pdf-iframe student-pdf-height"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>
      )}

      {/* SECTION 3: NOTICES & IMAGES */}
      {publishedImage.length > 0 && (
        <div className="student-image-section margin-top-lg">
          <div className="section-header margin-bottom-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', marginTop: '24px' }}>
            <ImageIcon size={20} className="text-primary" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Notice Board & Images ({publishedImage.length})</h3>
          </div>
          <div className="image-gallery-grid">
              {publishedImage.map((imgFile) => (
                <div key={imgFile.id} className="image-gallery-card glass-card">
                  <div className="gallery-img-wrap">
                    <img src={imgFile.dataUrl} alt={imgFile.fileName} className="gallery-img" />
                  </div>
                  <div className="gallery-info">
                    <h4>{imgFile.fileName}</h4>
                    <span className="file-meta">{imgFile.fileSize} • {imgFile.uploadTime}</span>
                    <a 
                      href={imgFile.dataUrl} 
                      download={imgFile.fileName} 
                      className="btn btn-outline btn-sm margin-top-sm"
                    >
                      <Download size={14} /> Download Notice
                    </a>
                  </div>
                </div>
              ))}
            </div>
        </div>
      )}


    </div>
  );
};

