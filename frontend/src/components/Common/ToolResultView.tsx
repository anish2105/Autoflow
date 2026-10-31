import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Search,
  Calculator,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  Copy,
  Link2,
  Grid,
  Layers,
  BookOpen,
  FileText
} from 'lucide-react';

interface SourceItem {
  index: string;
  title: string;
  url: string;
  snippet: string;
}

// Helper to normalize markdown text, handle <br> tags, and fix single-line collapsed tables
export function normalizeMarkdown(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Replace literal escaped \n with actual newlines
  cleaned = cleaned.replace(/\\n/g, '\n');

  // Normalize all escaped and variants of <br> tags into standard HTML <br />
  cleaned = cleaned.replace(/&lt;\s*br\s*\/?\s*&gt;/gi, '<br />');
  cleaned = cleaned.replace(/<\s*br\s*><\s*\/\s*br\s*>/gi, '<br />');
  cleaned = cleaned.replace(/<\s*br\s*\/?>/gi, '<br />');

  // Fix collapsed delimiters: `| --- ||` -> `|\n| --- |\n|`
  cleaned = cleaned.replace(/\|\s*---\s*\|\|/g, '|\n| --- |\n|');
  cleaned = cleaned.replace(/\|\s*---\s*>/g, '|\n\n> ');
  
  // Fix multiple pipe separators `||||||||||`
  cleaned = cleaned.replace(/(?:\|\s*){4,}/g, '|\n');

  // Fix collapsed rows separated by `||` or `| |`
  cleaned = cleaned.replace(/\|\s*\|\s*/g, '|\n| ');

  // Fix `---` inline after header cells: e.g. `| Stock Name | Price | --- |`
  cleaned = cleaned.replace(/\|\s*---\s*\|/g, '|\n| --- | --- |\n');

  return cleaned;
}

// Helper to parse input whether it's an object or JSON string
function parseToolInput(input: any): Record<string, any> | string {
  if (!input) return {};
  if (typeof input === 'object') return input;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object') return parsed;
    } catch {
      // not json, return raw string
    }
  }
  return input;
}

export const ToolArgumentsView: React.FC<{ toolName: string; input: any }> = ({ toolName, input }) => {
  const parsed = parseToolInput(input);

  if (typeof parsed === 'string') {
    return (
      <div style={{
        background: 'var(--color-surface-subtle)',
        padding: '6px 10px',
        borderRadius: '8px',
        fontSize: '0.78rem',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
        fontWeight: 500
      }}>
        {parsed}
      </div>
    );
  }

  const keys = Object.keys(parsed);
  if (keys.length === 0) return null;

  // Specific high-level layout for web_search query
  if (toolName === 'web_search' && parsed.query) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#F0F7FF',
        border: '1px solid #BAE6FD',
        borderRadius: '8px',
        padding: '7px 12px',
        fontSize: '0.8rem',
        color: '#0369A1'
      }}>
        <Search size={14} color="#0284C7" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: '#0C4A6E' }}>Search Query:</span>
        <span style={{ color: '#0369A1', fontWeight: 500 }}>"{parsed.query}"</span>
        {parsed.max_results && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '0.68rem',
            padding: '1px 6px',
            borderRadius: '9999px',
            background: '#E0F2FE',
            color: '#0284C7',
            fontWeight: 600
          }}>
            top {parsed.max_results}
          </span>
        )}
      </div>
    );
  }

  // Specific high-level layout for calculate expression
  if (toolName === 'calculate' && parsed.expression) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#FAF5FF',
        border: '1px solid #E9D5FF',
        borderRadius: '8px',
        padding: '7px 12px',
        fontSize: '0.8rem',
        color: '#6B21A8'
      }}>
        <Calculator size={14} color="#7E22CE" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: '#581C87' }}>Expression:</span>
        <code style={{
          fontFamily: 'var(--font-mono)',
          background: '#F3E8FF',
          padding: '2px 8px',
          borderRadius: '4px',
          color: '#6B21A8',
          fontWeight: 600
        }}>
          {parsed.expression}
        </code>
      </div>
    );
  }

  // Specific high-level layout for timezone
  if (toolName === 'get_current_time' && (parsed.timezone || parsed.tz)) {
    const tz = parsed.timezone || parsed.tz;
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '8px',
        padding: '7px 12px',
        fontSize: '0.8rem',
        color: '#166534'
      }}>
        <Clock size={14} color="#15803D" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: '#14532D' }}>Target Timezone:</span>
        <span style={{ fontWeight: 500, color: '#166534' }}>{tz}</span>
      </div>
    );
  }

  // Generic key-value chips for any other tool
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      {keys.map(k => (
        <div
          key={k}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '0.75rem',
            color: 'var(--text-primary)'
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{k}:</span>
          <span style={{ fontWeight: 500 }}>
            {typeof parsed[k] === 'object' ? JSON.stringify(parsed[k]) : String(parsed[k])}
          </span>
        </div>
      ))}
    </div>
  );
};

// Markdown custom components for table rendering
export const markdownCustomComponents = {
  table: ({ children }: any) => (
    <div style={{ overflowX: 'auto', margin: '8px 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.76rem',
        background: 'var(--color-surface-white)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead style={{ background: 'var(--color-surface-subtle)' }}>
      {children}
    </thead>
  ),
  th: ({ children }: any) => (
    <th style={{
      padding: '6px 10px',
      fontWeight: 700,
      color: 'var(--text-primary)',
      borderBottom: '1.5px solid var(--border-subtle)',
      textAlign: 'left'
    }}>
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td style={{
      padding: '6px 10px',
      borderBottom: '1px solid var(--border-subtle)',
      color: 'var(--text-primary)'
    }}>
      {children}
    </td>
  ),
  blockquote: ({ children }: any) => (
    <blockquote style={{
      borderLeft: '3px solid #0D3273',
      padding: '4px 10px',
      margin: '8px 0',
      color: 'var(--text-secondary)',
      background: 'var(--color-surface-subtle)',
      borderRadius: '0 6px 6px 0',
      fontSize: '0.75rem'
    }}>
      {children}
    </blockquote>
  )
};

// Single Source Card Component with Markdown Rendering and URL Copy/Visit Footer
const SearchSourceCard: React.FC<{ source: SourceItem }> = ({ source }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = () => {
    if (!source.url) return;
    navigator.clipboard.writeText(source.url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const formattedSnippet = normalizeMarkdown(source.snippet);

  return (
    <div style={{
      background: 'var(--color-surface-white)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '10px',
      padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Title */}
      <div style={{
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        lineHeight: 1.35
      }}>
        {source.index}. {source.title}
      </div>

      {/* Snippet parsed with Rich Markdown (Headings, bold, tables, lists) */}
      <div className="markdown-snippet" style={{
        color: 'var(--text-secondary)',
        fontSize: '0.78rem',
        lineHeight: 1.6,
        maxHeight: '220px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownCustomComponents}>
          {formattedSnippet}
        </ReactMarkdown>
      </div>

      {/* Card Footer: URL preview, Copy URL button, Visit button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '8px',
        borderTop: '1px solid var(--border-subtle)',
        marginTop: '2px',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {/* URL text */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '65%'
        }} title={source.url}>
          <Link2 size={12} style={{ flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {source.url ? source.url.replace(/^https?:\/\//, '') : 'No URL'}
          </span>
        </div>

        {/* Action buttons: Copy URL + Visit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {source.url && (
            <button
              onClick={handleCopyUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '6px',
                background: copiedUrl ? '#DCFCE7' : 'var(--color-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: copiedUrl ? '#15803D' : 'var(--text-secondary)',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Copy URL to clipboard"
            >
              {copiedUrl ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          )}

          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 10px',
                borderRadius: '6px',
                background: '#0D3273',
                color: '#FFFFFF',
                fontSize: '0.7rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'background 0.15s ease'
              }}
              title="Open link in new tab"
            >
              <span>Visit</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToolOutputView: React.FC<{ toolName: string; output?: string; compact?: boolean }> = ({
  toolName,
  output,
  compact = false,
}) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [viewAllSources, setViewAllSources] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  if (!output) return null;

  const handleCopyFullOutput = () => {
    navigator.clipboard.writeText(output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  // Custom rich parser for Tavily web_search markdown output
  if (toolName === 'web_search') {
    // Check if Tavily provided Quick Answer Summary and Detailed Sources
    const answerMatch = output.match(/### Quick Answer Summary:\s*([\s\S]*?)(?=### Detailed Sources:|$)/i);
    const quickAnswer = answerMatch ? answerMatch[1].trim() : null;

    const sourcesMatch = output.match(/### Detailed Sources:\s*([\s\S]*)$/i);
    const sourcesRaw = sourcesMatch ? sourcesMatch[1].trim() : (!answerMatch ? output : null);

    // Parse individual source items like: [1] **Title** (Relevance: 0.95)\n- **URL**: ...\n- **Snippet**: ...
    const sourceBlocks: SourceItem[] = [];
    if (sourcesRaw) {
      const regex = /\[(\d+)\]\s*\*\*([^*]+)\*\*(?:\s*\([^)]+\))?\s*\n-\s*\*\*URL\*\*:\s*([^\n]+)\s*\n-\s*\*\*Snippet\*\*:\s*([\s\S]*?)(?=\[\d+\]\s*\*\*|$)/g;
      let match;
      while ((match = regex.exec(sourcesRaw)) !== null) {
        sourceBlocks.push({
          index: match[1],
          title: match[2].trim(),
          url: match[3].trim(),
          snippet: match[4].trim(),
        });
      }
    }

    const hasStructuredTavily = quickAnswer || sourceBlocks.length > 0;

    if (hasStructuredTavily) {
      const activeSource = sourceBlocks[currentSourceIndex] || sourceBlocks[0];

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Quick Summary Answer */}
          {quickAnswer && (
            <div style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#0284C7',
                  textTransform: 'uppercase'
                }}>
                  <Sparkles size={12} />
                  <span>Search Summary</span>
                </div>

                <button
                  onClick={handleCopyFullOutput}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'transparent',
                    border: 'none',
                    color: copiedOutput ? '#15803D' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}
                  title="Copy full output"
                >
                  {copiedOutput ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
                  <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownCustomComponents}>
                {normalizeMarkdown(quickAnswer)}
              </ReactMarkdown>
            </div>
          )}

          {/* Sources Section with Carousel / Next-Prev Cards */}
          {sourceBlocks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Header with Card Navigation & View Toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2px'
              }}>
                <div style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span>Sources</span>
                  <span style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: 'var(--color-surface-subtle)',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                  }}>
                    {sourceBlocks.length} results
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Toggle All vs Carousel View */}
                  <button
                    onClick={() => setViewAllSources(!viewAllSources)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284C7',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                    title={viewAllSources ? 'Switch to Card Carousel' : 'View all cards'}
                  >
                    {viewAllSources ? <Layers size={11} /> : <Grid size={11} />}
                    <span>{viewAllSources ? 'Card Carousel' : 'View All'}</span>
                  </button>

                  {/* Next / Prev Controls (Active when in Carousel mode) */}
                  {!viewAllSources && sourceBlocks.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        disabled={currentSourceIndex === 0}
                        onClick={() => setCurrentSourceIndex(prev => Math.max(0, prev - 1))}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-subtle)',
                          background: currentSourceIndex === 0 ? 'transparent' : 'var(--color-surface-white)',
                          color: currentSourceIndex === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          cursor: currentSourceIndex === 0 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Previous Source"
                      >
                        <ChevronLeft size={13} />
                      </button>

                      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '34px', textAlign: 'center' }}>
                        {currentSourceIndex + 1}/{sourceBlocks.length}
                      </span>

                      <button
                        disabled={currentSourceIndex === sourceBlocks.length - 1}
                        onClick={() => setCurrentSourceIndex(prev => Math.min(sourceBlocks.length - 1, prev + 1))}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: '1px solid var(--border-subtle)',
                          background: currentSourceIndex === sourceBlocks.length - 1 ? 'transparent' : 'var(--color-surface-white)',
                          color: currentSourceIndex === sourceBlocks.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          cursor: currentSourceIndex === sourceBlocks.length - 1 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Next Source"
                      >
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Render Card Carousel or All Cards */}
              {viewAllSources ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sourceBlocks.map((src, i) => (
                    <SearchSourceCard key={i} source={src} />
                  ))}
                </div>
              ) : (
                activeSource && <SearchSourceCard source={activeSource} />
              )}
            </div>
          )}
        </div>
      );
    }
  }

  // For Calculation results
  if (toolName === 'calculate') {
    return (
      <div style={{
        background: '#FAF5FF',
        border: '1px solid #E9D5FF',
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '0.82rem',
        color: '#581C87',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} color="#7E22CE" />
          <span style={{ fontWeight: 600 }}>Calculated Result:</span>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#4C1D95'
          }}>
            {output.replace(/^Result of `[^`]+`\s*=\s*/, '')}
          </code>
        </div>

        <button
          onClick={handleCopyFullOutput}
          style={{
            background: 'transparent',
            border: 'none',
            color: copiedOutput ? '#15803D' : '#7E22CE',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="Copy calculation result"
        >
          {copiedOutput ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
          <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
    );
  }

  // For RAG Document Retrieval outputs
  if (toolName === 'retrieve_document_context' && typeof output === 'string') {
    const docRegex = /\*\*\[Source\s*(\d+)\]\*\*\s*Document:\s*`([^`]+)`\s*\|\s*\*\*Page\s*(\d+)\*\*(?:\s*\(ID:\s*`([^`]+)`\))?[^\n]*\n```(?:text)?\n([\s\S]*?)```/g;
    const docChunks: Array<{ index: string; fileName: string; pageNumber: number; docId?: string; snippet: string }> = [];
    let match;
    while ((match = docRegex.exec(output)) !== null) {
      docChunks.push({
        index: match[1],
        fileName: match[2].trim(),
        pageNumber: parseInt(match[3].trim(), 10) || 1,
        docId: match[4]?.trim(),
        snippet: match[5].trim(),
      });
    }

    if (docChunks.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '2px 4px',
            fontSize: '0.74rem',
            color: 'var(--text-secondary)'
          }}>
            <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen size={13} color="#4338CA" />
              Retrieved {docChunks.length} Evidence Excerpt{docChunks.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
              Click to view in slide tab
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: compact ? '220px' : '360px', overflowY: 'auto' }}>
            {docChunks.map((chunk, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--color-surface-white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                    <FileText size={14} color="#0D3273" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                      {chunk.fileName}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.66rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#EEF2FF',
                    color: '#4338CA',
                    border: '1px solid #C7D2FE'
                  }}>
                    Page {chunk.pageNumber}
                  </span>
                </div>

                <div style={{
                  fontSize: '0.74rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                  background: 'var(--color-surface-subtle)',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '80px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-sans)'
                }}>
                  {chunk.snippet}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('autoflow:open-doc-viewer', {
                        detail: {
                          fileName: chunk.fileName,
                          fileId: chunk.docId,
                          pageNumber: chunk.pageNumber,
                        }
                      }));
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#0D3273',
                      color: '#FFFFFF',
                      borderRadius: '5px',
                      padding: '4px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(13, 50, 115, 0.2)'
                    }}
                    title={`Open in Document Slide tab at Page ${chunk.pageNumber} with highlighted text`}
                  >
                    <FileText size={11} />
                    <span>View in Document Slide (p.{chunk.pageNumber})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Default clean Markdown view for any other tool output with copy button
  return (
    <div style={{
      background: 'var(--color-surface-subtle)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '0.78rem',
      lineHeight: 1.5,
      color: 'var(--text-primary)',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
        <button
          onClick={handleCopyFullOutput}
          style={{
            background: 'transparent',
            border: 'none',
            color: copiedOutput ? '#15803D' : 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
          title="Copy output"
        >
          {copiedOutput ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
          <span>{copiedOutput ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div style={{ maxHeight: compact ? '160px' : '280px', overflowY: 'auto' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownCustomComponents}>
          {normalizeMarkdown(output)}
        </ReactMarkdown>
      </div>
    </div>
  );
};
