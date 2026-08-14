import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Layers, 
  CheckCircle2, 
  Table as TableIcon, 
  Hash, 
  AlertCircle, 
  FileCheck, 
  Share2, 
  Users,
  Trash2,
  Plus,
  Globe,
  FileMinus,
  CheckCheck,
  FileText,
  Image as ImageIcon,
  File,
  Download,
  ExternalLink,
  Eye,
  Coins,
  Pencil,
  Check,
  X
} from 'lucide-react';
import { DataTable } from './DataTable';
import { calculateDataMetrics } from '../utils/excelUtils';
import { parseBatchFiles } from '../utils/fileUtils';

export const AdminPanel = ({ 
  uploadedFiles = [], 
  activeFileId,
  setActiveFileId,
  onAddFiles,
  onTogglePublish,
  onTogglePublishAll,
  onTogglePublishBatch,
  onDeleteFile,
  onDeleteBatch,
  onSetActiveSheetIndex,
  onApplyBulkFees,
  onRemoveColumn,
  onClearData
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all'); // 'all' | 'excel' | 'pdf' | 'image' | 'doc'

  // Bulk Fee Management State
  const [showFeePanel, setShowFeePanel] = useState(false);
  const [feeColumnTitle, setFeeColumnTitle] = useState('Exam Fees');
  const [feeInputAmount, setFeeInputAmount] = useState('500');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [applyScope, setApplyScope] = useState('sheet');
  const [feeSuccessMsg, setFeeSuccessMsg] = useState('');

  const handleExecuteApplyFees = (e) => {
    if (e) e.preventDefault();
    if (!feeColumnTitle.trim()) {
      alert('Please specify a fee column header name.');
      return;
    }
    if (!feeInputAmount.trim()) {
      alert('Please enter a fee amount.');
      return;
    }
    const formattedAmount = `${currencySymbol}${feeInputAmount.trim()}`;
    onApplyBulkFees(activeFileId, feeColumnTitle.trim(), formattedAmount, applyScope);
    setFeeSuccessMsg(`Successfully applied ${feeColumnTitle.trim()} (${formattedAmount})!`);
    setTimeout(() => setFeeSuccessMsg(''), 4000);
  };

  const handleExecuteApplyFeesWithParams = (title, amount) => {
    const formattedAmount = `${currencySymbol}${amount}`;
    onApplyBulkFees(activeFileId, title, formattedAmount, applyScope);
    setFeeSuccessMsg(`Successfully applied ${title} (${formattedAmount})!`);
    setTimeout(() => setFeeSuccessMsg(''), 4000);
  };

  const handleQuickAddFee = (type) => {
    if (type === 'exam') {
      setFeeColumnTitle('Exam Fees');
      setFeeInputAmount('500');
      setShowFeePanel(true);
    } else if (type === 'tuition') {
      setFeeColumnTitle('Tuition Fees');
      setFeeInputAmount('50000');
      setShowFeePanel(true);
    }
  };

  // File Rename State
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingFileName, setEditingFileName] = useState('');

  const handleStartRename = (e, fileId, currentName) => {
    e.stopPropagation();
    setEditingFileId(fileId);
    setEditingFileName(currentName);
  };

  const handleSaveRename = (e, fileId) => {
    e.stopPropagation();
    const file = uploadedFiles.find(f => f.id === fileId);
    if (file && editingFileName.trim()) {
      file.fileName = editingFileName.trim();
    }
    setEditingFileId(null);
    setEditingFileName('');
  };

  const fileInputRef = useRef(null);

  const toggleSelectFile = (fileId) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    const currentFilteredIds = filteredFiles.map(f => f.id);
    const allSelected = currentFilteredIds.length > 0 && currentFilteredIds.every(id => selectedFileIds.includes(id));
    if (allSelected) {
      setSelectedFileIds(prev => prev.filter(id => !currentFilteredIds.includes(id)));
    } else {
      const combined = new Set([...selectedFileIds, ...currentFilteredIds]);
      setSelectedFileIds(Array.from(combined));
    }
  };

  const handleBatchPublish = (publishState) => {
    if (selectedFileIds.length === 0) return;
    if (onTogglePublishBatch) {
      onTogglePublishBatch(selectedFileIds, publishState);
    }
  };

  const handleBatchDelete = () => {
    if (selectedFileIds.length === 0) return;
    if (onDeleteBatch) {
      onDeleteBatch(selectedFileIds);
      setSelectedFileIds([]);
    }
  };

  const handleFilesSelected = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError('');
    setUploading(true);

    try {
      const { results, errors } = await parseBatchFiles(fileList);
      if (errors.length > 0) {
        setUploadError(errors.join(' | '));
      }
      if (results.length > 0) {
        onAddFiles(results);
      }
    } catch (err) {
      console.error(err);
      setUploadError('Failed to parse one or more uploaded files.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const filteredFiles = uploadedFiles.filter(file => {
    if (selectedCategoryFilter === 'all') return true;
    return file.fileCategory === selectedCategoryFilter;
  });

  const activeFile = uploadedFiles.find(f => f.id === activeFileId) || uploadedFiles[0] || null;
  const activeSheetIdx = activeFile?.activeSheetIndex || 0;
  const activeSheet = activeFile?.sheets?.[activeSheetIdx] || null;
  const activeMetrics = activeSheet ? calculateDataMetrics(activeSheet.data, activeSheet.columns) : null;

  // Aggregate Stats
  const excelCount = uploadedFiles.filter(f => f.fileCategory === 'excel').length;
  const pdfCount = uploadedFiles.filter(f => f.fileCategory === 'pdf').length;
  const imageCount = uploadedFiles.filter(f => f.fileCategory === 'image').length;
  const docCount = uploadedFiles.filter(f => f.fileCategory === 'doc').length;
  const publishedCount = uploadedFiles.filter(f => f.isPublished).length;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'excel': return <FileSpreadsheet size={20} className="icon-excel" />;
      case 'pdf': return <FileText size={20} className="icon-pdf" />;
      case 'image': return <ImageIcon size={20} className="icon-image" />;
      default: return <File size={20} className="icon-doc" />;
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'excel': return 'category-badge-excel';
      case 'pdf': return 'category-badge-pdf';
      case 'image': return 'category-badge-image';
      default: return 'category-badge-doc';
    }
  };

  return (
    <div className="admin-container">
      {/* Admin Welcome Banner */}
      <div className="admin-banner glass-card">
        <div className="banner-content">
          <div className="badge badge-admin">
            <Users size={14} /> Admin Workspace
          </div>
          <h2>Multi-Format File Repository & Management</h2>
          <p>
            Upload PDF documents, Excel spreadsheets, Images, and Text/Docs. Inspect live previews and manage datasets.
          </p>
        </div>
        <div className="banner-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Plus size={18} />
            <span>{uploading ? 'Uploading Files...' : 'Upload Files (PDF, Excel, Images)'}</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input accepting ALL files */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.length && handleFilesSelected(e.target.files)}
        accept=".pdf, .xlsx, .xls, .csv, .png, .jpg, .jpeg, .webp, .gif, .svg, .txt, .doc, .docx"
        multiple
        style={{ display: 'none' }}
      />

      {/* Upload Error / Info Alert */}
      {uploadError && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* If No Files Uploaded Yet: Dropzone */}
      {uploadedFiles.length === 0 ? (
        <div 
          className={`dropzone glass-card ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-content">
            <div className="dropzone-icon-pulse">
              <UploadCloud size={52} className="dropzone-icon" />
            </div>
            <h3>Drag & Drop ALL your Files here</h3>
            <p className="dropzone-sub">Upload PDF documents, Excel datasets, Images (.png/.jpg), and Text/Docs</p>
            <div className="dropzone-cta">
              <span className="btn btn-outline-glow">
                <Plus size={18} /> Browse Files
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Category Statistics */}
          <div className="multi-file-stats-grid">
            <div className="metric-card glass-card">
              <div className="metric-icon sheets-icon">
                <Layers size={22} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{uploadedFiles.length}</span>
                <span className="metric-label">Total Uploaded Files</span>
              </div>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-icon pass-icon">
                <ImageIcon size={22} />
              </div>
              <div className="metric-data">
                <span className="metric-value text-success">{imageCount}</span>
                <span className="metric-label">Notices & Images</span>
              </div>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-icon sheets-icon">
                <FileSpreadsheet size={22} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{excelCount}</span>
                <span className="metric-label">Excel Datasets</span>
              </div>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-icon rows-icon">
                <FileText size={22} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{pdfCount}</span>
                <span className="metric-label">PDF Documents</span>
              </div>
            </div>
          </div>



          {/* Repository File Library Section */}
          <div className="datasets-manager-card glass-card">
            <div className="datasets-header">
              <div className="datasets-title-group">
                <h3>Uploaded File Library ({uploadedFiles.length})</h3>
                <span className="datasets-sub">Select files using checkboxes to delete in batch</span>
              </div>

              <div className="datasets-actions">
                {selectedFileIds.length > 0 ? (
                  <>
                    <span className="selected-count-badge">
                      {selectedFileIds.length} Selected
                    </span>
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleBatchDelete}
                      title="Delete selected files"
                    >
                      <Trash2 size={16} />
                      <span>Delete Selected ({selectedFileIds.length})</span>
                    </button>
                    <button 
                      className="btn btn-text btn-sm"
                      onClick={() => setSelectedFileIds([])}
                    >
                      Deselect
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="btn btn-outline-glow btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Plus size={16} />
                      <span>Upload Files</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Category Filter Pills & Select All Bar */}
            <div className="category-filter-bar">
              <button 
                className="select-all-btn"
                onClick={toggleSelectAll}
                title="Select / Deselect all visible files"
              >
                <input 
                  type="checkbox" 
                  checked={filteredFiles.length > 0 && filteredFiles.every(f => selectedFileIds.includes(f.id))}
                  onChange={() => {}}
                  style={{ cursor: 'pointer' }}
                />
                <span>Select All</span>
              </button>

              <button 
                className={`category-filter-btn ${selectedCategoryFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('all')}
              >
                All Files ({uploadedFiles.length})
              </button>
              <button 
                className={`category-filter-btn ${selectedCategoryFilter === 'excel' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('excel')}
              >
                <FileSpreadsheet size={14} /> Excel ({excelCount})
              </button>
              <button 
                className={`category-filter-btn ${selectedCategoryFilter === 'pdf' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('pdf')}
              >
                <FileText size={14} /> PDFs ({pdfCount})
              </button>
              <button 
                className={`category-filter-btn ${selectedCategoryFilter === 'image' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('image')}
              >
                <ImageIcon size={14} /> Images ({imageCount})
              </button>
              <button 
                className={`category-filter-btn ${selectedCategoryFilter === 'doc' ? 'active' : ''}`}
                onClick={() => setSelectedCategoryFilter('doc')}
              >
                <File size={14} /> Docs ({docCount})
              </button>
            </div>

            {/* File Cards Grid */}
            <div className="dataset-cards-grid">
              {filteredFiles.map((file) => {
                const isActive = file.id === activeFile?.id;
                const isSelected = selectedFileIds.includes(file.id);

                return (
                  <div 
                    key={file.id} 
                    className={`dataset-card ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
                    onClick={() => setActiveFileId(file.id)}
                  >
                    <div className="dataset-card-top">
                      <input
                        type="checkbox"
                        className="file-card-checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelectFile(file.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        title="Select file for bulk action"
                      />
                      <div className="dataset-icon-wrapper">
                        {getCategoryIcon(file.fileCategory)}
                      </div>
                      <div className="dataset-info">
                        <span className={`category-tag ${getCategoryBadgeClass(file.fileCategory)}`}>
                          {file.fileCategory.toUpperCase()}
                        </span>
                        {editingFileId === file.id ? (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="text"
                              className="table-edit-input"
                              value={editingFileName}
                              onChange={(e) => setEditingFileName(e.target.value)}
                              autoFocus
                            />
                            <button className="btn btn-primary btn-xs" onClick={(e) => handleSaveRename(e, file.id)}><Check size={12} /></button>
                            <button className="btn btn-outline btn-xs" onClick={(e) => { e.stopPropagation(); setEditingFileId(null); }}><X size={12} /></button>
                          </div>
                        ) : (
                          <h4 className="dataset-name" title={file.fileName}>{file.fileName}</h4>
                        )}
                        <span className="dataset-meta">
                          {file.fileSize} • {file.uploadTime}
                        </span>
                      </div>
                    </div>

                    <div className="dataset-card-bottom">
                      <div className="card-right-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {isActive && <span className="active-pill">Previewing</span>}
                        <button
                          className="btn-icon-action"
                          onClick={(e) => handleStartRename(e, file.id, file.fileName)}
                          title="Edit File Name"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="btn-icon-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFile(file.id);
                          }}
                          title="Delete file"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active File Inspector & Preview Container */}
          {activeFile && (
            <div className="active-file-preview-card glass-card">
              {/* Header meta bar */}
              <div className="preview-meta-bar">
                <div className="meta-info-left">
                  {getCategoryIcon(activeFile.fileCategory)}
                  <div>
                    <h3 className="preview-file-name">{activeFile.fileName}</h3>
                    <span className="preview-file-sub">
                      Category: <strong>{activeFile.fileCategory.toUpperCase()}</strong> • Size: {activeFile.fileSize} • Uploaded: {activeFile.uploadTime}
                    </span>
                  </div>
                </div>

                <div className="meta-actions-right">
                  {activeFile.fileCategory === 'excel' && (
                    <>
                      <button 
                        className="btn btn-warning-soft"
                        onClick={() => handleQuickAddFee('exam')}
                        title="Add Exam Fees to all students in Excel dataset"
                      >
                        <Coins size={16} />
                        <span>Add Exam Fees</span>
                      </button>
                      <button 
                        className="btn btn-fee-action"
                        onClick={() => handleQuickAddFee('tuition')}
                        title="Add Tuition Fees to all students in Excel dataset"
                      >
                        <Coins size={16} />
                        <span>Add Tuition Fees</span>
                      </button>
                    </>
                  )}



                  {(activeFile.dataUrl || activeFile.textContent) && (
                    <a 
                      href={activeFile.dataUrl || `data:text/plain;charset=utf-8,${encodeURIComponent(activeFile.textContent || '')}`} 
                      download={activeFile.fileName}
                      className="btn btn-outline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download size={16} />
                      <span>Download</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Render Preview according to File Category */}

              {/* 1. EXCEL SPREADSHEETS */}
              {activeFile.fileCategory === 'excel' && (
                <div className="excel-inspector">
                  {/* Interactive Fee Management Card */}
                  {(showFeePanel || feeSuccessMsg) && (
                    <div className="fee-manager-card glass-card">
                      <div className="fee-card-header">
                        <div className="fee-card-title-group">
                          <div className="fee-icon-circle">
                            <Coins size={22} />
                          </div>
                          <div>
                            <h3>Apply Bulk Fees to Excel Students</h3>
                            <p className="fee-card-sub">
                              Add a new fee column or update existing fees for all students in <strong>{activeFile.fileName}</strong>
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          className="btn-icon-close"
                          onClick={() => setShowFeePanel(false)}
                          title="Close panel"
                        >
                          ✕
                        </button>
                      </div>

                      {feeSuccessMsg && (
                        <div className="alert alert-success fee-alert">
                          <CheckCircle2 size={18} />
                          <span>{feeSuccessMsg}</span>
                        </div>
                      )}

                      <form onSubmit={handleExecuteApplyFees} className="fee-form-grid">
                        <div className="fee-form-field">
                          <label className="fee-label">Fee Column Header Name</label>
                          <div className="fee-presets-wrap">
                            <button 
                              type="button"
                              className={`preset-chip ${feeColumnTitle === 'Exam Fees' ? 'active' : ''}`}
                              onClick={() => {
                                setFeeColumnTitle('Exam Fees');
                                setFeeInputAmount('500');
                              }}
                            >
                              Exam Fees (₹500)
                            </button>
                            <button 
                              type="button"
                              className={`preset-chip ${feeColumnTitle === 'Tuition Fees' ? 'active' : ''}`}
                              onClick={() => {
                                setFeeColumnTitle('Tuition Fees');
                                setFeeInputAmount('50000');
                              }}
                            >
                              Tuition Fees (₹50,000)
                            </button>
                          </div>
                          <input 
                            type="text" 
                            className="fee-input"
                            placeholder="e.g. Exam Fees, Tuition Fees"
                            value={feeColumnTitle}
                            onChange={(e) => setFeeColumnTitle(e.target.value)}
                            required
                          />
                        </div>

                        <div className="fee-form-field">
                          <label className="fee-label">Fee Amount per Student</label>
                          <div className="currency-input-group">
                            <select 
                              className="currency-select"
                              value={currencySymbol}
                              onChange={(e) => setCurrencySymbol(e.target.value)}
                            >
                              <option value="₹">₹ (INR)</option>
                              <option value="$">$ (USD)</option>
                              <option value="€">€ (EUR)</option>
                              <option value="£">£ (GBP)</option>
                            </select>
                            <input 
                              type="number" 
                              className="fee-input currency-input"
                              placeholder="500"
                              value={feeInputAmount}
                              onChange={(e) => setFeeInputAmount(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="fee-form-field">
                          <label className="fee-label">Apply Target Scope</label>
                          <select 
                            className="fee-input"
                            value={applyScope}
                            onChange={(e) => setApplyScope(e.target.value)}
                          >
                            <option value="sheet">Current Sheet ({activeSheet?.name || 'Active Sheet'})</option>
                            <option value="file">All Sheets in Workbook ({activeFile.sheets?.length || 1} sheets)</option>
                          </select>
                        </div>

                        <div className="fee-form-field fee-submit-field">
                          <div className="fee-quick-actions-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            <button 
                              type="button" 
                              className="btn btn-warning-soft flex-1"
                              onClick={() => {
                                setFeeColumnTitle('Exam Fees');
                                handleExecuteApplyFeesWithParams('Exam Fees', feeInputAmount || '500');
                              }}
                            >
                              <Coins size={16} />
                              <span>Apply Exam Fees ({activeSheet?.data?.length || 0} Records)</span>
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-fee-action flex-1"
                              onClick={() => {
                                setFeeColumnTitle('Tuition Fees');
                                handleExecuteApplyFeesWithParams('Tuition Fees', feeInputAmount || '50000');
                              }}
                            >
                              <Coins size={16} />
                              <span>Apply Tuition Fees ({activeSheet?.data?.length || 0} Records)</span>
                            </button>
                            <button 
                              type="submit" 
                              className="btn btn-primary"
                            >
                              <Coins size={16} />
                              <span>Apply Custom Fee</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                  {activeFile.sheets && activeFile.sheets.length > 1 && (
                    <div className="sheet-tabs-wrapper">
                      <span className="sheet-tab-label">Workbook Sheets:</span>
                      <div className="sheet-tabs">
                        {activeFile.sheets.map((sheet, index) => (
                          <button
                            key={index}
                            className={`sheet-tab ${activeSheetIdx === index ? 'active' : ''}`}
                            onClick={() => onSetActiveSheetIndex(activeFile.id, index)}
                          >
                            <FileSpreadsheet size={16} />
                            <span>{sheet.name}</span>
                            <span className="tab-badge">{sheet.data.length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSheet ? (
                    <DataTable 
                      columns={activeSheet.columns} 
                      data={activeSheet.data} 
                      sheetName={activeSheet.name} 
                      titleInfo={activeSheet.titleInfo}
                      onOpenFeeModal={() => setShowFeePanel(true)}
                      onRemoveColumn={(colName) => onRemoveColumn && onRemoveColumn(activeFile.id, activeSheetIdx, colName)}
                    />
                  ) : null}
                </div>
              )}

              {/* 2. PDF DOCUMENTS */}
              {activeFile.fileCategory === 'pdf' && (
                <div className="pdf-preview-wrapper">
                  <div className="preview-toolbar">
                    <span className="toolbar-label">
                      <Eye size={16} /> Interactive PDF Viewer
                    </span>
                    <a 
                      href={activeFile.dataUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-text"
                    >
                      <ExternalLink size={15} /> Open PDF in New Tab
                    </a>
                  </div>

                  <div className="pdf-embed-container">
                    <iframe 
                      src={activeFile.dataUrl} 
                      title={activeFile.fileName}
                      className="pdf-iframe"
                    />
                  </div>
                </div>
              )}

              {/* 3. IMAGES */}
              {activeFile.fileCategory === 'image' && (
                <div className="image-preview-wrapper">
                  <div className="image-box">
                    <img 
                      src={activeFile.dataUrl} 
                      alt={activeFile.fileName} 
                      className="preview-image"
                    />
                  </div>
                </div>
              )}

              {/* 4. DOCUMENTS & TEXT */}
              {activeFile.fileCategory === 'doc' && (
                <div className="doc-preview-wrapper">
                  {activeFile.textContent ? (
                    <pre className="text-file-viewer">{activeFile.textContent}</pre>
                  ) : (
                    <div className="generic-doc-box">
                      <File size={48} className="text-muted" />
                      <h4>Document Preview</h4>
                      <p>Download file to view content</p>
                      <a 
                        href={activeFile.dataUrl} 
                        download={activeFile.fileName} 
                        className="btn btn-primary"
                      >
                        <Download size={16} /> Download {activeFile.fileName}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

