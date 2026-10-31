import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Copy, Check, Globe, FileText } from 'lucide-react';
import { CitationSource, highlightKeywordsInSnippet } from '../../utils/citations';
import { normalizeMarkdown } from './ToolResultView';

interface CitationBadgeProps {
  index: string;
  pageNumber?: number;
  fileName?: string;
  source?: CitationSource;
  contextSentence?: string;
}

interface Coords {
  top: number;
  left: number;
  position: 'top' | 'bottom';
  arrowLeft: number;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({
  index,
  pageNumber,
  fileName,
  source,
  contextSentence,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);

  const cleanIndex = (index || '').split('?')[0];
  const docPageNumber = pageNumber || (cleanIndex.startsWith('page-') ? parseInt(cleanIndex.replace('page-', ''), 10) : undefined) || source?.pageNumber;
  const displayLabel = docPageNumber ? `p.${docPageNumber}` : cleanIndex;

  const badgeRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePosition = useCallback(() => {
    if (!badgeRef.current) return;
    const rect = badgeRef.current.getBoundingClientRect();

    // If badge is off-screen or hidden, don't update with invalid coords
    if (rect.width === 0 && rect.height === 0) return;

    const popoverWidth = 320;
    const margin = 12;
    const center = rect.left + rect.width / 2;

    // Constrain popover within screen edges
    const left = Math.max(margin, Math.min(window.innerWidth - popoverWidth - margin, center - popoverWidth / 2));
    const arrowLeft = Math.max(16, Math.min(popoverWidth - 16, center - left));

    // Flip to bottom if close to top of viewport
    const position: 'top' | 'bottom' = rect.top >= 240 ? 'top' : 'bottom';
    const top = position === 'top' ? rect.top - 8 : rect.bottom + 8;

    setCoords({ top, left, position, arrowLeft });
  }, []);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (docPageNumber) {
      window.dispatchEvent(
        new CustomEvent('autoflow:open-doc-viewer', {
          detail: {
            fileName: fileName || source?.fileName || source?.title || '',
            fileId: source?.fileId,
            pageNumber: docPageNumber,
          },
        })
      );
    }
    updatePosition();
    setIsPinned(prev => !prev);
    setIsOpen(true);
  };

  // Keep coordinates updated during scrolls / resizes
  useEffect(() => {
    if (isOpen || isPinned) {
      updatePosition();

      const handleScrollOrResize = () => {
        updatePosition();
      };

      window.addEventListener('scroll', handleScrollOrResize, { capture: true, passive: true });
      window.addEventListener('resize', handleScrollOrResize, { passive: true });

      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, { capture: true });
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen, isPinned, updatePosition]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        badgeRef.current &&
        !badgeRef.current.contains(target)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };

    if (isOpen || isPinned) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, isPinned]);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!source?.url) return;
    navigator.clipboard.writeText(source.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract key terms from context sentence for highlighting
  const keywords = contextSentence
    ? contextSentence
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 3)
    : [];

  return (
    <>
      <span
        ref={badgeRef}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle',
          fontSize: '0.72rem',
          lineHeight: 1,
          margin: '0 2px',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Interactive Badge Pill */}
        <button
          onClick={handleClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '18px',
            height: '18px',
            padding: '0 5px',
            borderRadius: '9999px',
            background: isPinned || isOpen ? '#0D3273' : 'var(--color-surface-subtle)',
            color: isPinned || isOpen ? '#FFFFFF' : 'var(--text-secondary)',
            border: `1px solid ${isPinned || isOpen ? '#0D3273' : 'var(--border-strong)'}`,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.68rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: isPinned || isOpen ? '0 2px 6px rgba(13, 50, 115, 0.25)' : 'none',
            userSelect: 'none',
          }}
          title={`Source citation [${docPageNumber ? `Page ${docPageNumber}` : cleanIndex}] (Click to view page in slide)`}
        >
          {displayLabel}
        </button>
      </span>

      {/* Popover Card Portal (Rendered to document.body to prevent clipping by overflow containers & tables) */}
      {(isOpen || isPinned) && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              left: `${coords.left}px`,
              top: `${coords.top}px`,
              transform: coords.position === 'top' ? 'translateY(-100%)' : 'translateY(0)',
              width: '320px',
              maxWidth: 'calc(100vw - 24px)',
              background: 'var(--color-surface-white)',
              border: '1px solid var(--border-strong)',
              borderRadius: '12px',
              padding: '12px 14px',
              boxShadow: '0 14px 40px -4px rgba(0, 0, 0, 0.16), 0 6px 16px -2px rgba(0, 0, 0, 0.08)',
              zIndex: 999999,
              textAlign: 'left',
              fontFamily: 'var(--font-sans)',
              animation: 'fadeInPop 0.16s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'default',
            }}
          >
            {/* Arrow Pointer */}
            <div
              style={{
                position: 'absolute',
                left: `${coords.arrowLeft}px`,
                width: '10px',
                height: '10px',
                background: 'var(--color-surface-white)',
                border: '1px solid var(--border-strong)',
                transformOrigin: 'center',
                ...(coords.position === 'top'
                  ? {
                      bottom: '-6px',
                      borderTop: 'none',
                      borderLeft: 'none',
                      transform: 'translateX(-50%) rotate(45deg)',
                    }
                  : {
                      top: '-6px',
                      borderBottom: 'none',
                      borderRight: 'none',
                      transform: 'translateX(-50%) rotate(45deg)',
                    }),
              }}
            />

            {source ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Header: Domain pill & Source Index */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'var(--color-surface-subtle)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <Globe size={11} color="#0284C7" />
                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {source.domain || 'Source'}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: '#0D3273',
                    background: '#EEF2FF',
                    border: '1px solid #C7D2FE',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                  }}>
                    Source #{index}
                  </span>
                </div>

                {/* Title */}
                <div style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                }}>
                  {source.title}
                </div>

                {/* Snippet / Extracted clause with highlighted matches */}
                <div style={{
                  background: 'var(--color-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '0.76rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  maxHeight: '140px',
                  overflowY: 'auto',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: 'var(--text-tertiary)', fontSize: '0.66rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    <FileText size={10} />
                    <span>Extracted Reference Passage</span>
                  </div>
                  <div>
                    {highlightKeywordsInSnippet(normalizeMarkdown(source.snippet), keywords)}
                  </div>
                </div>

                {/* Footer Actions: Copy URL & Visit or Open Document */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: '2px',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  {docPageNumber || source.fileName ? (
                    <>
                      <button
                        onClick={() => {
                          setIsOpen(false);
                          setIsPinned(false);
                          window.dispatchEvent(
                            new CustomEvent('autoflow:open-doc-viewer', {
                              detail: {
                                fileName: fileName || source.fileName || source.title || '',
                                fileId: source.fileId,
                                pageNumber: docPageNumber || 1,
                              },
                            })
                          );
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#0D3273',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(13, 50, 115, 0.25)',
                          transition: 'all 0.15s ease',
                        }}
                        title={`Open document at Page ${docPageNumber || 1} in the slide panel`}
                      >
                        <FileText size={12} />
                        <span>View Page {docPageNumber || 1} in Slide ↗</span>
                      </button>

                      <button
                        onClick={handleCopyUrl}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: copied ? '#DCFCE7' : 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          color: copied ? '#15803D' : 'var(--text-secondary)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Copy excerpt passage"
                      >
                        {copied ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </>
                  ) : source.url ? (
                    <>
                      <button
                        onClick={handleCopyUrl}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: copied ? '#DCFCE7' : 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          color: copied ? '#15803D' : 'var(--text-secondary)',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Copy source URL"
                      >
                        {copied ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy URL'}</span>
                      </button>

                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#0D3273',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          textDecoration: 'none',
                          transition: 'opacity 0.15s ease',
                        }}
                        title="Open source URL"
                      >
                        <span>Visit</span>
                        <ExternalLink size={10} />
                      </a>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No link available</span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '4px 0' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Source #{index}
                </div>
                <div>Referenced from autonomous search execution steps.</div>
              </div>
            )}
          </div>,
          document.body
        )
      }
    </>
  );
};
