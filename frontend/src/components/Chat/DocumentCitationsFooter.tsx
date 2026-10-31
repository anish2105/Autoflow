import React, { useState } from 'react';
import { BookOpen, FileText, ChevronDown, ChevronUp, Layers, ExternalLink } from 'lucide-react';
import { RetrievedChunk } from '../../utils/citations';

interface DocumentCitationsFooterProps {
  chunks: RetrievedChunk[];
}

export const DocumentCitationsFooter: React.FC<DocumentCitationsFooterProps> = ({ chunks }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!chunks || chunks.length === 0) return null;

  // Extract unique pages and unique file names
  const uniquePages = Array.from(new Set(chunks.map(c => c.pageNumber))).sort((a, b) => a - b);
  const uniqueFiles = Array.from(new Set(chunks.map(c => c.fileName)));

  const handleOpenPage = (chunk: RetrievedChunk, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    window.dispatchEvent(
      new CustomEvent('autoflow:open-doc-viewer', {
        detail: {
          fileName: chunk.fileName,
          fileId: chunk.fileId,
          pageNumber: chunk.pageNumber,
        },
      })
    );
  };

  const handleJumpDirectPage = (pageNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const matching = chunks.find(c => c.pageNumber === pageNum) || chunks[0];
    window.dispatchEvent(
      new CustomEvent('autoflow:open-doc-viewer', {
        detail: {
          fileName: matching.fileName,
          fileId: matching.fileId,
          pageNumber: pageNum,
        },
      })
    );
  };

  return (
    <div
      style={{
        marginTop: '16px',
        padding: '12px 14px',
        background: 'var(--color-surface-subtle)',
        borderRadius: '10px',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 1. Header with Summary Badge and Page Quick-Jumps */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          cursor: 'pointer',
        }}
        onClick={() => setIsExpanded(prev => !prev)}
        title="Click to expand/collapse chunk details"
      >
        {/* Left Title & Chunk Count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(13, 50, 115, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BookOpen size={13} color="#0D3273" />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
              Sources &amp; Citations
            </span>
            <span
              style={{
                marginLeft: '8px',
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                background: 'var(--color-surface-white)',
                border: '1px solid var(--border-subtle)',
                padding: '2px 7px',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              {chunks.length} chunk{chunks.length > 1 ? 's' : ''} retrieved across {uniquePages.length} page{uniquePages.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Right: Quick Page Jumps + Accordion Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Jump to:
          </span>
          {uniquePages.map(page => (
            <button
              key={page}
              onClick={(e) => handleJumpDirectPage(page, e)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 7px',
                borderRadius: '5px',
                background: '#0D3273',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.68rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              title={`Open document slide directly at Page ${page}`}
            >
              <span>p.{page}</span>
              <ExternalLink size={10} />
            </button>
          ))}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(prev => !prev);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginLeft: '4px',
            }}
            title={isExpanded ? 'Collapse sources list' : 'Expand sources list'}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Expanded Chunk Excerpts Cards */}
      {isExpanded && (
        <div
          style={{
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {chunks.map((chunk, idx) => (
            <div
              key={idx}
              onClick={() => handleOpenPage(chunk)}
              style={{
                padding: '8px 12px',
                background: 'var(--color-surface-white)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#0D3273';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(13, 50, 115, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={`Click to open ${chunk.fileName} at Page ${chunk.pageNumber} in the slide panel`}
            >
              {/* Chunk Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '5px',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 800,
                      color: '#4338CA',
                      background: '#EEF2FF',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    Source {chunk.sourceIndex}
                  </span>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={chunk.fileName}
                  >
                    {chunk.fileName}
                  </span>
                </div>

                <button
                  onClick={(e) => handleOpenPage(chunk, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    background: '#0D3273',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  title={`Jump to Page ${chunk.pageNumber} in document viewer`}
                >
                  <FileText size={11} />
                  <span>Page {chunk.pageNumber}</span>
                  <ExternalLink size={10} />
                </button>
              </div>

              {/* Chunk Snippet Text */}
              <div
                style={{
                  fontSize: '0.73rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  background: 'var(--color-surface-subtle)',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {chunk.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

