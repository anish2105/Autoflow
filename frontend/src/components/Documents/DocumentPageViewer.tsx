import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import {
  FileText,
  Download,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown,
  FileSpreadsheet,
  Layers,
  Search,
  X
} from 'lucide-react';
import { DocumentItem, ParsedPage } from '../../types';
import { highlightDocumentText } from '../../utils/citations';

interface DocumentPageViewerProps {
  document: DocumentItem | null;
  targetPage?: number;           // 1-indexed page to navigate to
  highlightQuote?: string;       // verbatim or key excerpt to highlight
  isEmbeddedInSlide?: boolean;   // true if rendered inside GraphPanel slide tab
  onClose?: () => void;
  onDownloadOriginal?: (doc: DocumentItem) => void;
}

export const DocumentPageViewer: React.FC<DocumentPageViewerProps> = ({
  document: doc,
  targetPage = 1,
  highlightQuote,
  isEmbeddedInSlide = false,
  onClose,
  onDownloadOriginal,
}) => {
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(() => {
    return targetPage > 0 ? targetPage - 1 : -1;
  });
  const [viewMode, setViewMode] = useState<'parsed' | 'original'>('parsed');
  const [copiedMd, setCopiedMd] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize when targetPage prop updates from citation click
  useEffect(() => {
    if (targetPage > 0) {
      setSelectedPageIndex(targetPage - 1);
    }
  }, [targetPage]);

  // Auto-scroll highlighted passage into center of view
  useEffect(() => {
    if (viewMode === 'parsed' && highlightQuote) {
      const timer = setTimeout(() => {
        const highlightElem = containerRef.current?.querySelector('#active-rag-highlight');
        if (highlightElem) {
          highlightElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [selectedPageIndex, highlightQuote, viewMode]);

  if (!doc) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '32px 16px',
        textAlign: 'center',
        color: 'var(--text-tertiary)',
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'var(--color-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
        }}>
          <FileText size={20} color="var(--text-secondary)" />
        </div>
        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          No Document Selected
        </h4>
        <p style={{ margin: 0, fontSize: '0.78rem', maxWidth: '320px', lineHeight: 1.5 }}>
          Click any citation pill <code style={{ fontSize: '0.72rem', background: 'var(--border-subtle)', padding: '1px 5px', borderRadius: '4px' }}>[p.4]</code> in chat or select a document chunk from the Execution Flow tab to inspect page text and highlights.
        </p>
      </div>
    );
  }

  const pages: ParsedPage[] = doc.parsedPages || [];
  const totalPages = pages.length;
  const currentPageObj = selectedPageIndex >= 0 && selectedPageIndex < pages.length ? pages[selectedPageIndex] : null;

  const rawPageContent = currentPageObj
    ? (currentPageObj.markdown || (currentPageObj as any).text || '')
    : (doc.parsedMarkdown || '');

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(rawPageContent);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadDocParsed = () => {
    const blob = new Blob([rawPageContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    const pageSuffix = selectedPageIndex >= 0 ? `_page_${selectedPageIndex + 1}` : '_full';
    a.download = `${doc.name.replace(/\.[^/.]+$/, '')}${pageSuffix}_parsed.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOrigFile = () => {
    if (onDownloadOriginal) {
      onDownloadOriginal(doc);
      return;
    }
    if (!doc.base64) return;
    const byteChars = atob(doc.base64);
    const byteNums = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNums[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNums);
    const blob = new Blob([byteArray], { type: doc.mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPdf = doc.type === 'pdf' || doc.name.toLowerCase().endsWith('.pdf');
  const isDocx = doc.type === 'docx' || doc.name.toLowerCase().endsWith('.docx');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--color-canvas)',
      overflow: 'hidden',
    }}>
      {/* 1. Header Toolbar */}
      <div style={{
        padding: isEmbeddedInSlide ? '10px 14px' : '14px 20px',
        background: 'var(--color-surface-white)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Document Title & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
          <div style={{
            padding: '5px',
            borderRadius: '6px',
            background: isPdf ? '#FEE2E2' : '#DBEAFE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={16} color={isPdf ? '#DC2626' : '#2563EB'} />
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{
              fontSize: '0.84rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: isEmbeddedInSlide ? '220px' : '380px'
            }} title={doc.name}>
              {doc.name}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{totalPages > 0 ? `${totalPages} Page${totalPages > 1 ? 's' : ''}` : 'Digitized'}</span>
              <span>•</span>
              <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{doc.type}</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* View Mode Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-surface-subtle)',
            borderRadius: '9999px',
            padding: '2px',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => setViewMode('parsed')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                background: viewMode === 'parsed' ? '#0D3273' : 'transparent',
                color: viewMode === 'parsed' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="View digitized page-by-page markdown with highlighted answer"
            >
              <Sparkles size={11} />
              <span>Parsed</span>
            </button>
            <button
              onClick={() => setViewMode('original')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                background: viewMode === 'original' ? '#0D3273' : 'transparent',
                color: viewMode === 'original' ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="View original uploaded file representation"
            >
              <Eye size={11} />
              <span>Original</span>
            </button>
          </div>

          {/* Copy Page Action */}
          {viewMode === 'parsed' && (
            <button
              onClick={handleCopyMarkdown}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: copiedMd ? '#DCFCE7' : 'transparent',
                color: copiedMd ? '#15803D' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="Copy current page markdown"
            >
              {copiedMd ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
              <span>{copiedMd ? 'Copied' : 'Copy'}</span>
            </button>
          )}

          {/* Download Original File Action */}
          <button
            onClick={handleDownloadOrigFile}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Download original file"
          >
            <Download size={11} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Close viewer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Page Navigation Bar (when multiple pages exist) */}
      {viewMode === 'parsed' && totalPages > 0 && (
        <div style={{
          padding: '6px 14px',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
            PAGES:
          </span>
          <button
            onClick={() => setSelectedPageIndex(-1)}
            style={{
              padding: '2px 8px',
              borderRadius: '5px',
              fontSize: '0.7rem',
              fontWeight: 700,
              border: selectedPageIndex === -1 ? 'none' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              background: selectedPageIndex === -1 ? '#0D3273' : 'var(--color-surface-white)',
              color: selectedPageIndex === -1 ? '#FFFFFF' : 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            All
          </button>
          {pages.map((p, idx) => {
            const isSelected = selectedPageIndex === idx;
            const isReferenced = targetPage === idx + 1;
            return (
              <button
                key={idx}
                onClick={() => setSelectedPageIndex(idx)}
                style={{
                  padding: '2px 9px',
                  borderRadius: '5px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  border: isSelected ? 'none' : isReferenced ? '1.5px solid #F59E0B' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  background: isSelected ? '#0D3273' : isReferenced ? '#FEF3C7' : 'var(--color-surface-white)',
                  color: isSelected ? '#FFFFFF' : isReferenced ? '#92400E' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
                title={`Page ${p.page_number}${isReferenced ? ' (Cited in answer)' : ''}`}
              >
                <span>p.{p.page_number}</span>
                {isReferenced && !isSelected && (
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#D97706',
                  }} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Highlight Evidence Notice Banner (if quote provided) */}
      {viewMode === 'parsed' && highlightQuote && (
        <div style={{
          padding: '6px 14px',
          background: '#FEF3C7',
          borderBottom: '1px solid #FDE68A',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}>
          <Sparkles size={13} color="#B45309" style={{ flexShrink: 0 }} />
          <div style={{
            fontSize: '0.72rem',
            color: '#92400E',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            <strong>Grounded Highlight (Page {selectedPageIndex >= 0 ? selectedPageIndex + 1 : targetPage}):</strong> &ldquo;{highlightQuote}&rdquo;
          </div>
        </div>
      )}

      {/* 4. Main Body: Parsed Markdown Reader or Original PDF Embed */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: isEmbeddedInSlide ? '16px 14px' : '28px 24px',
          background: '#F1F5F9',
        }}
      >
        {viewMode === 'parsed' ? (
          <div style={{
            maxWidth: '720px',
            margin: '0 auto',
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: isEmbeddedInSlide ? '20px 18px' : '36px 32px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.04)',
            fontFamily: 'var(--font-sans)',
            minHeight: '350px',
          }}>
            {/* Page header marker */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              marginBottom: '16px',
              borderBottom: '1px solid #F1F5F9',
              fontSize: '0.7rem',
              color: '#94A3B8',
              fontFamily: 'var(--font-mono)',
            }}>
              <span>
                {selectedPageIndex >= 0
                  ? `📄 PAGE ${selectedPageIndex + 1} OF ${totalPages || 1}`
                  : `📄 FULL DOCUMENT (${totalPages || 1} PAGES)`}
              </span>
              <span>{doc.name}</span>
            </div>

            {/* Render with exact or fuzzy highlight */}
            <div className="markdown-body parsed-doc-reader" style={{ fontSize: '0.86rem', lineHeight: 1.65, color: '#1E293B' }}>
              {highlightQuote ? (
                // Use custom renderer with highlighted text
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {highlightDocumentText(rawPageContent, highlightQuote)}
                </div>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeRaw, rehypeKatex]}
                >
                  {rawPageContent}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ) : (
          /* View Mode: Original Document (PDF iframe / Preview) */
          <div style={{ height: '100%', minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
            {isPdf && doc.base64 ? (
              <iframe
                src={`data:application/pdf;base64,${doc.base64}#page=${selectedPageIndex >= 0 ? selectedPageIndex + 1 : 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '500px',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                }}
                title={doc.name}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                margin: '20px auto',
                maxWidth: '480px',
              }}>
                <FileText size={40} color="#2563EB" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {doc.name}
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Word documents (.docx) and spreadsheets are best viewed in the <strong>Parsed Markdown</strong> tab with rich page-by-page tables and formatting.
                </p>
                <button
                  onClick={handleDownloadOrigFile}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#0D3273',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={14} />
                  <span>Download Original Document</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

