import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  Search,
  Eye,
  X,
  AlertCircle,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Zap,
  Brain,
  Layers,
  ChevronRight,
  ExternalLink,
  FileDown,
} from 'lucide-react';
import { DocumentItem, DocumentTier, ParsedPage } from '../../types';
import { uploadDocumentApi, fetchDocumentStatusApi, fetchDocumentDetailsApi, deleteDocumentApi } from '../../services/api';

interface DocumentsPanelProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onToggleDigitized: (id: string) => void;
  onUpdateDocument?: (doc: DocumentItem, oldId?: string) => void;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
  onToggleDigitized,
  onUpdateDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTier, setSelectedTier] = useState<DocumentTier>('fast');
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [inspectTab, setInspectTab] = useState<'parsed' | 'original'>('parsed');
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(-1); // -1 = All Pages
  const [copiedMd, setCopiedMd] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to format bytes to human readable string
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to get file type icon
  const getFileIcon = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf' || type === 'pdf') {
      return <FileText size={20} color="#DC2626" />;
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || type === 'excel') {
      return <FileSpreadsheet size={20} color="#16A34A" />;
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '') || type === 'image') {
      return <ImageIcon size={20} color="#7C3AED" />;
    }
    if (ext === 'docx' || ext === 'doc' || type === 'docx') {
      return <FileText size={20} color="#2563EB" />;
    }
    return <FileCode size={20} color="#64748B" />;
  };

  const determineType = (file: File): 'pdf' | 'excel' | 'docx' | 'image' | 'other' => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'excel';
    if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
    if (file.type.startsWith('image/')) return 'image';
    return 'other';
  };

  // ==============================================================================
  // Live Status Polling Hook for In-Progress OCR & DOCX Documents
  // ==============================================================================
  useEffect(() => {
    const pendingDocs = documents.filter(
      (d) => (d.type === 'pdf' || d.type === 'docx') && (d.status === 'uploaded' || d.status === 'processing')
    );

    if (pendingDocs.length === 0) return;

    const intervalId = setInterval(async () => {
      for (const doc of pendingDocs) {
        try {
          const statusRes = await fetchDocumentStatusApi(doc.id);
          if (statusRes.status !== doc.status || statusRes.digitized !== doc.digitized) {
            // If completed or failed, fetch full details with parsed markdown
            let fullDetails: any = null;
            if (statusRes.status === 'digitized' || statusRes.has_parsed_markdown) {
              try {
                fullDetails = await fetchDocumentDetailsApi(doc.id);
              } catch (e) {
                console.error('Failed to fetch full doc details:', e);
              }
            }

            const updated: DocumentItem = {
              ...doc,
              status: statusRes.status,
              digitized: statusRes.digitized,
              errorMessage: statusRes.error_message,
              tier: (statusRes.tier as DocumentTier) || doc.tier || 'fast',
              parsedMarkdown: fullDetails?.parsed_markdown || fullDetails?.parsedMarkdown || doc.parsedMarkdown,
              parsedPages: fullDetails?.parsed_pages || fullDetails?.parsedPages || doc.parsedPages,
            };

            if (onUpdateDocument) {
              onUpdateDocument(updated);
            }

            // Also keep inspect modal updated in real-time if open
            if (inspectDoc && inspectDoc.id === doc.id) {
              setInspectDoc(updated);
            }
          }
        } catch (err: any) {
          // If server returns 404 (e.g. stale client-side temporary ID from previous session), clean it up
          if (doc.id.startsWith('doc_')) {
            console.warn(`Cleaning up stale temporary document ${doc.id}`);
            onDeleteDocument(doc.id);
          }
        }
      }
    }, 2500);

    return () => clearInterval(intervalId);
  }, [documents, inspectDoc, onUpdateDocument, onDeleteDocument]);

  // ==============================================================================
  // Upload Processing with LlamaCloud Fast/Agentic Tier (PDF) & MarkItDown (DOCX)
  // ==============================================================================
  const processFiles = async (files: FileList | File[]) => {
    setIsUploading(true);
    for (const file of Array.from(files)) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const result = reader.result as string;
          let base64Data = result;
          if (result.includes(',')) {
            base64Data = result.split(',')[1];
          }

          const type = determineType(file);
          const isPdf = type === 'pdf';
          const isDocx = type === 'docx';
          const isProcessable = isPdf || isDocx;

          // Upload to backend API with selected tier
          try {
            const apiRes = await uploadDocumentApi({
              filename: file.name,
              content_base64: base64Data,
              file_type: type,
              mime_type: file.type || (isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
              tier: selectedTier,
              source: 'upload',
              size_bytes: file.size,
            });

            if (apiRes && apiRes.document) {
              if (apiRes.deduplicated) {
                alert(`Document "${file.name}" with identical content and ${selectedTier} OCR tier is already present in your repository.`);
              }
              const serverDoc: DocumentItem = {
                id: apiRes.document.id, // Direct server UUID
                name: apiRes.document.filename || apiRes.document.name || file.name,
                size: apiRes.document.size_bytes || apiRes.document.size || file.size,
                type: type,
                mimeType: file.type || (isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
                base64: base64Data,
                tier: apiRes.document.tier || (isPdf ? selectedTier : undefined),
                status: apiRes.document.status || (isProcessable ? 'uploaded' : 'digitized'),
                digitized: apiRes.document.digitized || !isProcessable,
                uploadedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                source: 'upload',
                parsedMarkdown: apiRes.document.parsedMarkdown || apiRes.document.parsed_markdown,
                parsedPages: apiRes.document.parsedPages || apiRes.document.parsed_pages || [],
              };

              onAddDocument(serverDoc);
            }
          } catch (err) {
            console.error('Failed to upload document to backend:', err);
            alert(`Failed to upload ${file.name}. Please try again.`);
          }
          resolve();
        };

        reader.readAsDataURL(file);
      });
    }
    setIsUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Download handler: decodes original binary base64 back to Blob and triggers download
  const handleDownloadOriginal = (doc: DocumentItem) => {
    try {
      let b64 = doc.base64;
      if (!b64) {
        alert('Original file content is not available locally. Please check your connection.');
        return;
      }
      if (b64.includes(',')) b64 = b64.split(',')[1];
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: doc.mimeType || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download document:', err);
      alert('Could not download file. The file data may be invalid.');
    }
  };

  // Backward compatible alias
  const handleDownload = handleDownloadOriginal;

  // Download handler: downloads the extracted/parsed markdown output (.md)
  const handleDownloadParsedMarkdown = (doc: DocumentItem, pageIndex: number = -1) => {
    try {
      let content = '';
      const baseName = doc.name.replace(/\.[^/.]+$/, '');
      let filename = `${baseName}_parsed.md`;

      if (pageIndex >= 0 && doc.parsedPages && doc.parsedPages[pageIndex]) {
        content = doc.parsedPages[pageIndex].markdown;
        filename = `${baseName}_page_${doc.parsedPages[pageIndex].page_number}.md`;
      } else {
        content = doc.parsedMarkdown || (doc.parsedPages && doc.parsedPages.length > 0
          ? doc.parsedPages.map((p) => `<!-- Page ${p.page_number} -->\n${p.markdown}`).join('\n\n---\n\n')
          : '');
      }

      if (!content || !content.trim()) {
        alert('No parsed markdown is available yet for this document.');
        return;
      }

      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download parsed markdown:', err);
      alert('Could not download parsed markdown output.');
    }
  };

  const handleOpenInspect = async (doc: DocumentItem) => {
    setInspectDoc(doc);
    const hasParsed = (doc.type === 'pdf' || doc.type === 'docx') && doc.digitized;
    setInspectTab(hasParsed ? 'parsed' : 'original');
    setSelectedPageIndex(-1);

    // If PDF or DOCX and digitized, fetch full parsed pages details if missing
    if ((doc.type === 'pdf' || doc.type === 'docx') && (!doc.parsedMarkdown || !doc.parsedPages || doc.parsedPages.length === 0)) {
      try {
        const details = await fetchDocumentDetailsApi(doc.id);
        if (details) {
          const updated: DocumentItem = {
            ...doc,
            parsedMarkdown: details.parsed_markdown || details.parsedMarkdown || doc.parsedMarkdown,
            parsedPages: details.parsed_pages || details.parsedPages || doc.parsedPages,
            status: details.status || doc.status,
            digitized: details.digitized ?? doc.digitized,
          };
          setInspectDoc(updated);
          if (onUpdateDocument) onUpdateDocument(updated);
        }
      } catch (e) {
        // use local doc
      }
    }
  };

  const handleCopyMarkdown = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const filteredDocs = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-canvas)',
      overflowY: 'auto',
      padding: '24px 32px',
      position: 'relative',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FileText size={24} color="#0D3273" />
            Documents Repository
          </h2>
          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            margin: '4px 0 0 0'
          }}>
            Upload, inspect LlamaCloud OCR status, view parsed Markdown page-wise, and download files
          </p>
        </div>

        {/* Upload Action with Tier Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* LlamaCloud Tier Selector Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--color-surface)',
            border: '1.5px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '5px 10px',
            fontSize: '0.82rem',
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>
              OCR Mode:
            </span>
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as DocumentTier)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#0D3273',
                cursor: 'pointer',
              }}
              title="Fast: Simple, text only documents | Agentic: Documents with diagrams and images, handles complex documents"
            >
              <option value="fast">⚡ Fast (Simple, text only documents)</option>
              <option value="agentic">🧠 Agentic (Documents with diagrams & images, complex)</option>
            </select>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="pill-button-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              fontSize: '0.86rem'
            }}
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* Drag & Drop Upload Zone with Mode Guidance */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: isDragging ? '2px dashed #0D3273' : '2px dashed var(--border-subtle)',
          borderRadius: '16px',
          background: isDragging ? 'rgba(13, 50, 115, 0.05)' : 'var(--color-surface)',
          padding: '24px 28px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '24px',
          transition: 'all 0.2s ease',
          boxShadow: 'var(--shadow-subtle)',
          position: 'relative',
        }}
      >
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          background: 'rgba(13, 50, 115, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 10px auto'
        }}>
          <Upload size={22} color="#0D3273" />
        </div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Click or drag & drop files here to upload
        </h4>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Supports <strong>PDF</strong>, <strong>Excel (.xlsx, .xls)</strong>, <strong>Word (.docx)</strong>, and <strong>Images</strong>.
        </p>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
          padding: '4px 12px',
          borderRadius: '9999px',
          background: selectedTier === 'fast' ? '#F0FDF4' : '#FAF5FF',
          border: `1px solid ${selectedTier === 'fast' ? '#BBF7D0' : '#E9D5FF'}`,
          fontSize: '0.74rem',
          color: selectedTier === 'fast' ? '#15803D' : '#7E22CE',
          fontWeight: 600,
        }}>
          {selectedTier === 'fast' ? <Zap size={13} /> : <Brain size={13} />}
          <span>
            {selectedTier === 'fast'
              ? 'Current OCR Mode: Fast (Simple, text-only documents)'
              : 'Current OCR Mode: Agentic (Complex layouts, diagrams & formulas)'}
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--color-surface)',
          borderRadius: '10px',
          padding: '8px 14px',
          border: '1px solid var(--border-subtle)',
          width: '320px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search documents by filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              width: '100%'
            }}
          />
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredDocs.length}</strong> of {documents.length} document{documents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Documents Table */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-subtle)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          textAlign: 'left'
        }}>
          <thead>
            <tr style={{
              background: 'var(--color-canvas)',
              borderBottom: '1px solid var(--border-subtle)',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th style={{ padding: '14px 20px' }}>Filename & Mode</th>
              <th style={{ padding: '14px 20px', width: '170px' }}>Status</th>
              <th style={{ padding: '14px 20px', width: '130px', textAlign: 'center' }}>Inspect</th>
              <th style={{ padding: '14px 20px', width: '120px', textAlign: 'center' }}>Download</th>
              <th style={{ padding: '14px 20px', width: '80px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>No documents uploaded yet.</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem', color: 'var(--text-tertiary)' }}>
                    Upload a PDF or document above or attach a PDF in Chat to view it here.
                  </p>
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const isPdf = doc.type === 'pdf' || doc.name.toLowerCase().endsWith('.pdf');
                const docStatus = doc.status || (doc.digitized ? 'digitized' : 'uploaded');

                return (
                  <tr
                    key={doc.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* 1. Filename & Mode Column */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          padding: '8px',
                          borderRadius: '10px',
                          background: 'var(--color-canvas)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-subtle)',
                          flexShrink: 0
                        }}>
                          {getFileIcon(doc.type, doc.name)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '340px'
                          }}>
                            {doc.name}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.72rem',
                            color: 'var(--text-tertiary)',
                            marginTop: '2px',
                            flexWrap: 'wrap',
                          }}>
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>{doc.uploadedAt}</span>
                            {isPdf && doc.tier && (
                              <>
                                <span>•</span>
                                <span style={{
                                  background: doc.tier === 'agentic' ? '#FAF5FF' : '#F0FDF4',
                                  color: doc.tier === 'agentic' ? '#7E22CE' : '#15803D',
                                  border: `1px solid ${doc.tier === 'agentic' ? '#E9D5FF' : '#BBF7D0'}`,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  textTransform: 'uppercase',
                                  fontSize: '0.66rem',
                                }}>
                                  {doc.tier === 'agentic' ? '🧠 Agentic' : '⚡ Fast'}
                                </span>
                              </>
                            )}
                            {doc.source === 'chat' && (
                              <>
                                <span>•</span>
                                <span style={{
                                  background: 'rgba(13, 50, 115, 0.08)',
                                  color: '#0D3273',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: 500
                                }}>
                                  Chat Attachment
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Status Column: uploaded -> processing -> digitized */}
                    <td style={{ padding: '14px 20px' }}>
                      {docStatus === 'processing' ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#FEF3C7',
                          color: '#B45309',
                          border: '1px solid #FDE68A',
                        }}>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Processing OCR...</span>
                        </div>
                      ) : docStatus === 'digitized' ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          background: '#DCFCE7',
                          color: '#15803D',
                          border: '1px solid #BBF7D0',
                        }}>
                          <CheckCircle2 size={13} color="#15803D" />
                          <span>Digitized</span>
                        </div>
                      ) : docStatus === 'failed' ? (
                        <div
                          title={doc.errorMessage || 'Processing failed'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            background: '#FEE2E2',
                            color: '#B91C1C',
                            border: '1px solid #FECACA',
                            cursor: 'help',
                          }}
                        >
                          <XCircle size={13} color="#B91C1C" />
                          <span>Failed</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          background: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                        }}>
                          <Upload size={12} />
                          <span>Uploaded</span>
                        </div>
                      )}
                    </td>

                    {/* 3. Inspect / View Column */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleOpenInspect(doc)}
                        className="pill-button-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '5px 12px',
                          fontSize: '0.76rem',
                          borderColor: (isPdf || doc.type === 'docx') && doc.digitized ? '#0D3273' : 'var(--border-strong)',
                          color: (isPdf || doc.type === 'docx') && doc.digitized ? '#0D3273' : 'inherit',
                          fontWeight: 600,
                        }}
                        title="View parsed markdown and original document"
                      >
                        {(isPdf || doc.type === 'docx') && doc.digitized ? <Sparkles size={12} color="#0D3273" /> : <Eye size={12} />}
                        <span>{(isPdf || doc.type === 'docx') && doc.digitized ? 'Inspect' : 'Preview'}</span>
                      </button>
                    </td>

                    {/* 4. Download Column (Original & Parsed Markdown) */}
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      {doc.digitized && (doc.parsedMarkdown || (doc.parsedPages && doc.parsedPages.length > 0)) ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleDownloadOriginal(doc)}
                            className="pill-button-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 9px',
                              fontSize: '0.74rem'
                            }}
                            title={`Download original file: ${doc.name}`}
                          >
                            <Download size={12} />
                            <span>Original</span>
                          </button>
                          <button
                            onClick={() => handleDownloadParsedMarkdown(doc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 9px',
                              fontSize: '0.74rem',
                              borderRadius: '8px',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Download parsed markdown output (.md)"
                          >
                            <FileDown size={12} />
                            <span>Parsed (.md)</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDownloadOriginal(doc)}
                          className="pill-button-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            fontSize: '0.78rem'
                          }}
                          title={`Download ${doc.name}`}
                        >
                          <Download size={13} />
                          <span>Download</span>
                        </button>
                      )}
                    </td>

                    {/* 5. Actions Column */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <button
                        onClick={async () => {
                          if (confirm(`Remove "${doc.name}" from documents repository?`)) {
                            try {
                              await deleteDocumentApi(doc.id);
                            } catch (e) {}
                            onDeleteDocument(doc.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#DC2626';
                          e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title="Delete document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ==============================================================================
          INSPECT / VIEW MODAL (Dual View: Page-Wise Parsed Markdown vs Original)
         ============================================================================== */}
      {inspectDoc && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '1060px',
            width: '100%',
            height: '90vh',
            maxHeight: '880px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #CBD5E1',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '14px 24px',
              borderBottom: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}>
                  {getFileIcon(inspectDoc.type, inspectDoc.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {inspectDoc.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                    <span>{formatFileSize(inspectDoc.size)}</span>
                    <span>•</span>
                    {inspectDoc.type === 'docx' ? (
                      <span style={{ fontWeight: 700, color: '#2563EB' }}>
                        Mode: MarkItDown (Word Parser)
                      </span>
                    ) : inspectDoc.tier ? (
                      <span style={{
                        fontWeight: 700,
                        color: inspectDoc.tier === 'agentic' ? '#7E22CE' : '#15803D',
                      }}>
                        Mode: {inspectDoc.tier === 'agentic' ? 'Agentic (Complex)' : 'Fast (Text-only)'}
                      </span>
                    ) : null}
                    {inspectDoc.parsedPages && inspectDoc.parsedPages.length > 0 && (
                      <>
                        <span>•</span>
                        <span style={{ fontWeight: 700, color: '#0D3273' }}>
                          {inspectDoc.parsedPages.length} Page{inspectDoc.parsedPages.length !== 1 ? 's' : ''} Extracted
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* View Switcher Tabs & Download Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#EDF2F7',
                  borderRadius: '9999px',
                  padding: '3px',
                  border: '1px solid #CBD5E1',
                }}>
                  <button
                    onClick={() => setInspectTab('parsed')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: inspectTab === 'parsed' ? '#0D3273' : 'transparent',
                      color: inspectTab === 'parsed' ? '#FFFFFF' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Sparkles size={13} />
                    <span>Parsed Markdown</span>
                  </button>

                  <button
                    onClick={() => setInspectTab('original')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      border: 'none',
                      background: inspectTab === 'original' ? '#0D3273' : 'transparent',
                      color: inspectTab === 'original' ? '#FFFFFF' : '#475569',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <FileText size={13} />
                    <span>Original Document</span>
                  </button>
                </div>

                {/* Download Parsed Markdown Button */}
                {(inspectDoc.parsedMarkdown || (inspectDoc.parsedPages && inspectDoc.parsedPages.length > 0)) && (
                  <button
                    onClick={() => handleDownloadParsedMarkdown(inspectDoc, selectedPageIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 13px',
                      borderRadius: '8px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(29, 78, 216, 0.05)',
                    }}
                    title="Download parsed markdown output (.md)"
                  >
                    <FileDown size={14} />
                    <span>Download Parsed (.md)</span>
                  </button>
                )}

                {/* Download Original File Button */}
                <button
                  onClick={() => handleDownloadOriginal(inspectDoc)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 13px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#1E293B',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  title="Download original file"
                >
                  <Download size={14} />
                  <span>Original File</span>
                </button>

                <button
                  onClick={() => setInspectDoc(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* TAB 1: PARSED MARKDOWN VIEW (High-Contrast White Paper Reader) */}
              {inspectTab === 'parsed' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Top Bar: Page Selector & Copy / Download Page Action */}
                  <div style={{
                    padding: '10px 24px',
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}>
                    {/* Page-Wise Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '680px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#475569', marginRight: '4px' }}>
                        PAGES:
                      </span>
                      <button
                        onClick={() => setSelectedPageIndex(-1)}
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          border: selectedPageIndex === -1 ? 'none' : '1px solid #CBD5E1',
                          cursor: 'pointer',
                          background: selectedPageIndex === -1 ? '#0D3273' : '#FFFFFF',
                          color: selectedPageIndex === -1 ? '#FFFFFF' : '#475569',
                          boxShadow: selectedPageIndex === -1 ? '0 1px 3px rgba(13,50,115,0.3)' : 'none',
                        }}
                      >
                        All Pages
                      </button>

                      {inspectDoc.parsedPages && inspectDoc.parsedPages.length > 0 ? (
                        inspectDoc.parsedPages.map((page, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedPageIndex(idx)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              border: selectedPageIndex === idx ? 'none' : '1px solid #CBD5E1',
                              cursor: 'pointer',
                              background: selectedPageIndex === idx ? '#0D3273' : '#FFFFFF',
                              color: selectedPageIndex === idx ? '#FFFFFF' : '#475569',
                              boxShadow: selectedPageIndex === idx ? '0 1px 3px rgba(13,50,115,0.3)' : 'none',
                            }}
                          >
                            Page {page.page_number}
                          </button>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          (Full document markdown)
                        </span>
                      )}
                    </div>

                    {/* Copy and Download Page Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {inspectDoc.parsedPages && inspectDoc.parsedPages.length > 0 && selectedPageIndex >= 0 && (
                        <button
                          onClick={() => handleDownloadParsedMarkdown(inspectDoc, selectedPageIndex)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            color: '#0D3273',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title={`Download Page ${selectedPageIndex + 1} as .md`}
                        >
                          <FileDown size={12} />
                          <span>Download Page {selectedPageIndex + 1} (.md)</span>
                        </button>
                      )}

                      {inspectDoc.parsedMarkdown && (
                        <button
                          onClick={() => {
                            const textToCopy =
                              selectedPageIndex >= 0 && inspectDoc.parsedPages && inspectDoc.parsedPages[selectedPageIndex]
                                ? inspectDoc.parsedPages[selectedPageIndex].markdown
                                : inspectDoc.parsedMarkdown || '';
                            handleCopyMarkdown(textToCopy);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 12px',
                            borderRadius: '6px',
                            background: copiedMd ? '#DCFCE7' : '#FFFFFF',
                            color: copiedMd ? '#15803D' : '#1E293B',
                            border: copiedMd ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {copiedMd ? <Check size={12} color="#15803D" /> : <Copy size={12} />}
                          <span>{copiedMd ? 'Copied!' : 'Copy Markdown'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Markdown Content Paper Reader Area */}
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '32px 24px',
                    background: '#F1F5F9', // Neutral backdrop
                  }}>
                    {inspectDoc.status === 'processing' ? (
                      <div style={{
                        maxWidth: '540px',
                        margin: '60px auto',
                        textAlign: 'center',
                        background: '#FFFFFF',
                        padding: '40px 32px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                      }}>
                        <Loader2 size={36} className="animate-spin" color="#0D3273" style={{ margin: '0 auto 16px auto' }} />
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                          {inspectDoc.type === 'docx' ? 'MarkItDown is Extracting Word Document...' : 'LlamaCloud OCR is Parsing Document...'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748B', lineHeight: 1.6 }}>
                          {inspectDoc.type === 'docx'
                            ? 'Converting DOCX content into clean, page-wise Markdown.'
                            : `Processing in ${inspectDoc.tier === 'agentic' ? 'Agentic (Complex)' : 'Fast'} mode. Status will automatically update to Digitized upon completion.`}
                        </p>
                      </div>
                    ) : inspectDoc.status === 'failed' ? (
                      <div style={{
                        maxWidth: '680px',
                        margin: '40px auto',
                        padding: '24px',
                        borderRadius: '12px',
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#991B1B',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '0.94rem' }}>
                          <AlertCircle size={18} />
                          <span>Extraction Processing Failed</span>
                        </div>
                        <p style={{ margin: '10px 0 0 0', fontSize: '0.84rem', lineHeight: 1.6 }}>
                          {inspectDoc.errorMessage || 'Unable to parse this document.'}
                        </p>
                      </div>
                    ) : inspectDoc.parsedMarkdown || (inspectDoc.parsedPages && inspectDoc.parsedPages.length > 0) ? (
                      <div className="parsed-paper-sheet">
                        {/* Page Header Indicator if viewing specific page */}
                        {selectedPageIndex >= 0 && inspectDoc.parsedPages && inspectDoc.parsedPages[selectedPageIndex] ? (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E2E8F0',
                            paddingBottom: '12px',
                            marginBottom: '20px',
                          }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              color: '#334155',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                            }}>
                              📄 PAGE {inspectDoc.parsedPages[selectedPageIndex].page_number} OF {inspectDoc.parsedPages.length}
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                              {inspectDoc.name}
                            </span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid #E2E8F0',
                            paddingBottom: '12px',
                            marginBottom: '20px',
                          }}>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              background: '#F1F5F9',
                              color: '#334155',
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                            }}>
                              📄 FULL DOCUMENT ({inspectDoc.parsedPages?.length || 1} PAGES)
                            </span>
                            <span style={{ fontSize: '0.74rem', color: '#94A3B8' }}>
                              {inspectDoc.name}
                            </span>
                          </div>
                        )}

                        <div className="parsed-doc-reader">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                          >
                            {selectedPageIndex >= 0 && inspectDoc.parsedPages && inspectDoc.parsedPages[selectedPageIndex]
                              ? inspectDoc.parsedPages[selectedPageIndex].markdown
                              : inspectDoc.parsedMarkdown || (inspectDoc.parsedPages ? inspectDoc.parsedPages.map(p => `### Page ${p.page_number}\n\n${p.markdown}`).join('\n\n---\n\n') : '')}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
                        <Sparkles size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600 }}>No parsed text available yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: ORIGINAL DOCUMENT PREVIEW */}
              {inspectTab === 'original' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#334155' }}>
                  {inspectDoc.type === 'image' || inspectDoc.name.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px',
                      overflowY: 'auto',
                    }}>
                      <img
                        src={`data:${inspectDoc.mimeType || 'image/png'};base64,${inspectDoc.base64}`}
                        alt={inspectDoc.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        }}
                      />
                    </div>
                  ) : inspectDoc.type === 'docx' || inspectDoc.name.match(/\.(docx|doc)$/i) ? (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px',
                      background: '#F8FAFC',
                    }}>
                      <div style={{
                        maxWidth: '520px',
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '40px 36px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          background: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px auto',
                        }}>
                          <FileText size={32} color="#2563EB" />
                        </div>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                          {inspectDoc.name}
                        </h3>
                        <p style={{ margin: '0 0 20px 0', fontSize: '0.82rem', color: '#64748B' }}>
                          Microsoft Word Document ({formatFileSize(inspectDoc.size)})
                        </p>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.6 }}>
                          This Word document has been converted using <strong>Microsoft MarkItDown</strong> into page-wise Markdown. You can read the full extracted document in the <strong>Parsed Markdown</strong> tab, or download the original file to view it in Microsoft Word.
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setInspectTab('parsed')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 18px',
                              borderRadius: '8px',
                              background: '#0D3273',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Sparkles size={14} />
                            <span>View Parsed Markdown</span>
                          </button>
                          <button
                            onClick={() => handleDownloadOriginal(inspectDoc)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '9px 18px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              color: '#1E293B',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Download size={14} />
                            <span>Download Original DOCX</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : inspectDoc.type === 'pdf' || inspectDoc.name.toLowerCase().endsWith('.pdf') ? (
                    <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                      <object
                        data={`data:application/pdf;base64,${inspectDoc.base64}`}
                        type="application/pdf"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                      >
                        <div style={{ padding: '40px', textAlign: 'center', color: '#FFFFFF' }}>
                          <p>Your browser does not support inline PDF viewing.</p>
                          <button
                            onClick={() => handleDownloadOriginal(inspectDoc)}
                            className="pill-button-primary"
                            style={{ marginTop: '12px' }}
                          >
                            Download PDF File
                          </button>
                        </div>
                      </object>
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px',
                      color: '#F8FAFC',
                      textAlign: 'center',
                    }}>
                      <FileSpreadsheet size={48} color="#60A5FA" style={{ marginBottom: '14px' }} />
                      <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>{inspectDoc.name}</h4>
                      <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#94A3B8' }}>
                        Spreadsheet / data file stored in database repository.
                      </p>
                      <button
                        onClick={() => handleDownloadOriginal(inspectDoc)}
                        className="pill-button-primary"
                      >
                        <Download size={15} />
                        <span>Download Original File</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
