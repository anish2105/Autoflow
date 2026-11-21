import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { ChevronRight, ChevronDown, ChevronUp, Copy, Check, Terminal, Sparkles, FileDown, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { ChatMessage, ToolCallItem } from '../../types';
import { GroupedToolNode } from '../Graph/GroupedToolNode';
import { normalizeMarkdown } from '../Common/ToolResultView';
import { extractCitationSources, transformCitationsInMarkdown, extractRetrievedChunks, parseCitationAnchor } from '../../utils/citations';
import { CitationBadge } from '../Common/CitationBadge';
import { DocumentCitationsFooter } from './DocumentCitationsFooter';
import { generateExport, triggerFileDownload } from '../../services/api';

interface MessageItemProps {
  message: ChatMessage;
  enabledToolIds?: string[];
}

const CodeBlock: React.FC<{ language: string; value: string }> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      borderRadius: '10px',
      overflow: 'hidden',
      margin: '12px 0',
      border: '1px solid var(--border-subtle)',
      background: '#192131'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: '#111723',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Terminal size={12} color="#94A3B8" />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: '#CBD5E1',
            letterSpacing: '0.04em'
          }}>
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopyCode}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.7rem',
            transition: 'color 0.15s'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} color="#34D399" />
              <span style={{ color: '#34D399' }}>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre style={{
        padding: '12px',
        margin: 0,
        overflowX: 'auto',
        background: 'transparent',
        fontSize: '0.82rem',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.5,
        color: '#F8FAFC'
      }}>
        <code>{value}</code>
      </pre>
    </div>
  );
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, enabledToolIds }) => {
  const [showThoughts, setShowThoughts] = useState(false);
  const [userCopied, setUserCopied] = useState(false);
  const [assistantCopied, setAssistantCopied] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isUser = message.role === 'user';

  const isTxtEnabled = !enabledToolIds || enabledToolIds.includes('export_chat_txt');
  const isPdfEnabled = !enabledToolIds || enabledToolIds.includes('export_chat_pdf');
  const isDocxEnabled = !enabledToolIds || enabledToolIds.includes('export_chat_docx');
  const isExcelEnabled = !enabledToolIds || enabledToolIds.includes('export_chat_excel');
  const hasAnyExport = isTxtEnabled || isPdfEnabled || isDocxEnabled || isExcelEnabled;

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const handleCopyUser = () => {
    navigator.clipboard.writeText(message.content);
    setUserCopied(true);
    setTimeout(() => setUserCopied(false), 2000);
  };

  const handleCopyAssistant = () => {
    navigator.clipboard.writeText(message.content);
    setAssistantCopied(true);
    setTimeout(() => setAssistantCopied(false), 2000);
  };

  const handleExport = async (format: 'txt' | 'pdf' | 'xlsx' | 'docx') => {
    try {
      setExportingFormat(format);
      const res = await generateExport(format, message.content, 'Document Export');
      triggerFileDownload(res.download_url, res.filename);
      setExportOpen(false);
    } catch (e: any) {
      alert(`Export failed: ${e.message || 'Unknown error'}`);
    } finally {
      setExportingFormat(null);
    }
  };

  if (isUser) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        margin: '14px 0',
        paddingLeft: '40px'
      }}>
        {/* User Speech Bubble */}
        <div style={{
          background: 'var(--accent-user-bubble)',
          color: 'var(--accent-user-text)',
          padding: '14px 20px',
          borderRadius: '18px',
          maxWidth: '85%',
          fontSize: '0.92rem',
          lineHeight: 1.5,
          fontWeight: 400,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          border: '1px solid rgba(13, 50, 115, 0.08)'
        }}>
          {message.pdfAttachment && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              marginBottom: message.content ? '10px' : '0',
            }}>
              <div style={{
                padding: '3px 6px',
                borderRadius: '6px',
                background: '#EF4444',
                color: '#FFFFFF',
                fontSize: '0.68rem',
                fontWeight: 800,
                letterSpacing: '0.04em'
              }}>
                PDF
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>
                  {message.pdfAttachment.filename}
                </span>
                <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
                  {(message.pdfAttachment.size / (1024 * 1024) > 1
                    ? `${(message.pdfAttachment.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(message.pdfAttachment.size / 1024).toFixed(1)} KB`)} • {message.pdfAttachment.tier === 'agentic' ? '🧠 Agentic OCR' : '⚡ Fast OCR'}
                </span>
              </div>
            </div>
          )}
          {message.imageData && (
            <div style={{ marginBottom: message.content ? '10px' : '0' }}>
              <img
                src={message.imageData}
                alt="Uploaded attachment"
                style={{
                  maxWidth: '100%',
                  maxHeight: '260px',
                  borderRadius: '10px',
                  objectFit: 'contain',
                  border: '1px solid rgba(0,0,0,0.1)',
                  display: 'block'
                }}
              />
            </div>
          )}
          {message.content}
        </div>

        {/* Small Copy Icon below user message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', paddingRight: '4px' }}>
          <button
            onClick={handleCopyUser}
            title="Copy message"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            {userCopied ? <Check size={13} color="#059669" /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    );
  }

  const citationSources = extractCitationSources(message.toolCalls);
  const retrievedChunks = extractRetrievedChunks(message.toolCalls);
  const formattedContent = transformCitationsInMarkdown(normalizeMarkdown(message.content));

  const groupedTools: { toolName: string; items: ToolCallItem[] }[] = [];
  (message.toolCalls || []).forEach(tool => {
    const existing = groupedTools.find(g => g.toolName === tool.name);
    if (existing) {
      existing.items.push(tool);
    } else {
      groupedTools.push({ toolName: tool.name, items: [tool] });
    }
  });

  // Assistant Message Layout
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      margin: '16px 0',
      paddingRight: '20px',
      alignItems: 'flex-start'
    }}>
      {/* Assistant Avatar Mark */}
      <div style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'var(--color-surface-white)',
        border: '1.5px solid var(--border-strong)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginTop: '2px'
      }}>
        <Sparkles size={15} color="#0D3273" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Collapsible Reasoning & Validation Disclosure: > Thought about this */}
        {((message.toolCalls && message.toolCalls.length > 0) || message.validation) && (
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowThoughts(!showThoughts)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-surface-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
              >
                {showThoughts ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>
                  Execution & Validation Trace
                  {message.toolCalls && message.toolCalls.length > 0 ? ` (${message.toolCalls.length} tool${message.toolCalls.length > 1 ? 's' : ''})` : ''}
                </span>
              </button>

              {/* Live Validation Pill */}
              {message.validation && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: message.validation.sufficient ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: message.validation.sufficient ? '#059669' : '#d97706',
                  border: `1px solid ${message.validation.sufficient ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                }}>
                  <span>{message.validation.sufficient ? '✓ Complete' : '⚠ Incomplete'}</span>
                  <span>({Math.round((message.validation.confidence !== undefined ? message.validation.confidence : 1.0) * 100)}% confidence)</span>
                </div>
              )}
            </div>

            {showThoughts && (
              <div style={{
                marginTop: '8px',
                padding: '12px 14px',
                borderRadius: '10px',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {/* Validation Quality Report */}
                {message.validation && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--color-surface-white)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem'
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Task Completeness Evaluation:
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {message.validation.critique || (message.validation.sufficient ? 'All aspects of user query have been fully answered.' : 'Missing information or unanswered sub-questions detected.')}
                    </div>
                    {message.validation.missing_information && message.validation.missing_information.length > 0 && (
                      <div style={{ marginTop: '6px', color: '#dc2626' }}>
                        <b>Unanswered Parts:</b> {message.validation.missing_information.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {groupedTools.length > 0 && (
                  <>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Parallel Tool Execution Results:
                    </div>
                    {groupedTools.map((group) => (
                      <GroupedToolNode
                        key={group.toolName}
                        toolName={group.toolName}
                        tools={group.items}
                        isCurrentToolRunning={false}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Message Content with rich Markdown */}
        {message.content ? (
          <div className="markdown-body">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeKatex]}
              components={{
                a({ href, children, ...props }: any) {
                  if (href && href.startsWith('#cite-')) {
                    const parsed = parseCitationAnchor(href);
                    const source =
                      citationSources[parsed.index] ||
                      (parsed.pageNumber ? citationSources[`page-${parsed.pageNumber}`] : undefined);
                    return (
                      <CitationBadge
                        index={parsed.index}
                        pageNumber={parsed.pageNumber}
                        fileName={parsed.fileName}
                        source={source}
                        contextSentence={message.content}
                      />
                    );
                  }
                  return (
                    <a href={href} target="_blank" rel="noreferrer" {...props}>
                      {children}
                    </a>
                  );
                },
                code({ node, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const codeString = String(children).replace(/\n$/, '');
                  const isInline = !match && !codeString.includes('\n');

                  if (isInline) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <CodeBlock
                      language={match ? match[1] : ''}
                      value={codeString}
                    />
                  );
                },
                table({ children }) {
                  return (
                    <div style={{ overflowX: 'auto', margin: '14px 0' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem',
                        background: 'var(--color-surface-white)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th style={{
                      background: 'var(--color-surface-subtle)',
                      padding: '8px 12px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                      textAlign: 'left'
                    }}>
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}>
                      {children}
                    </td>
                  );
                },
                blockquote({ children }) {
                  return (
                    <blockquote style={{
                      borderLeft: '3.5px solid #0D3273',
                      padding: '8px 14px',
                      margin: '10px 0',
                      color: 'var(--text-secondary)',
                      background: 'var(--color-surface-subtle)',
                      borderRadius: '0 8px 8px 0',
                      fontSize: '0.84rem'
                    }}>
                      {children}
                    </blockquote>
                  );
                }
              }}
            >
              {formattedContent}
            </ReactMarkdown>
            {message.isStreaming && (
              <span style={{
                display: 'inline-block',
                width: '6px',
                height: '14px',
                background: '#0D3273',
                marginLeft: '4px',
                animation: 'pulseGlow 1s infinite alternate',
                verticalAlign: 'middle'
              }} />
            )}

            {/* Document Citations & Retrieved Chunks Footer */}
            {!message.isStreaming && retrievedChunks.length > 0 && (
              <DocumentCitationsFooter chunks={retrievedChunks} />
            )}

            {/* Post-Response Action Bar: Copy and Export Dropdown */}
            {!message.isStreaming && message.content && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                {/* Copy Response Button */}
                <button
                  onClick={handleCopyAssistant}
                  title="Copy response markdown"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = 'var(--text-primary)';
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = 'var(--text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                >
                  {assistantCopied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                  <span>{assistantCopied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Export Dropdown (opens upwards) - only shown if at least one export tool is enabled */}
                {hasAnyExport && (
                  <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setExportOpen(!exportOpen)}
                      title="Export response to TXT, PDF, or Excel"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: exportOpen ? 'var(--color-surface-subtle)' : 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.borderColor = 'var(--border-strong)';
                      }}
                      onMouseLeave={e => {
                        if (!exportOpen) {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }
                      }}
                    >
                      <FileDown size={12} />
                      <span>Export</span>
                      {exportOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
                    </button>

                    {exportOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 6px)',
                          left: 0,
                          background: 'var(--color-surface-white)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          boxShadow: '0 -6px 24px rgba(0, 0, 0, 0.12)',
                          zIndex: 50,
                          minWidth: '210px',
                          padding: '4px 0',
                          display: 'flex',
                          flexDirection: 'column'
                        }}
                      >
                        {/* TXT Option (only if export_chat_txt is enabled) */}
                        {isTxtEnabled && (
                          <button
                            onClick={() => handleExport('txt')}
                            disabled={exportingFormat !== null}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: exportingFormat !== null ? 'wait' : 'pointer',
                              textAlign: 'left',
                              color: 'var(--text-primary)',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <FileText size={14} color="#64748B" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>Plain Text (.txt)</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Direct transcript dump</div>
                            </div>
                            {exportingFormat === 'txt' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                          </button>
                        )}

                        {/* PDF Option (only if export_chat_pdf is enabled) */}
                        {isPdfEnabled && (
                          <button
                            onClick={() => handleExport('pdf')}
                            disabled={exportingFormat !== null}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: exportingFormat !== null ? 'wait' : 'pointer',
                              textAlign: 'left',
                              color: 'var(--text-primary)',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <FileText size={14} color="#EF4444" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>PDF Report (.pdf)</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Justified text & styled tables</div>
                            </div>
                            {exportingFormat === 'pdf' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                          </button>
                        )}

                        {/* Word DOCX Option (only if export_chat_docx is enabled) */}
                        {isDocxEnabled && (
                          <button
                            onClick={() => handleExport('docx')}
                            disabled={exportingFormat !== null}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: exportingFormat !== null ? 'wait' : 'pointer',
                              textAlign: 'left',
                              color: 'var(--text-primary)',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <FileText size={14} color="#2563EB" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>Word Document (.docx)</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Headings, lists, tables & formatting</div>
                            </div>
                            {exportingFormat === 'docx' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                          </button>
                        )}

                        {/* Excel Option (only if export_chat_excel is enabled) */}
                        {isExcelEnabled && (
                          <button
                            onClick={() => handleExport('xlsx')}
                            disabled={exportingFormat !== null}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              padding: '7px 12px',
                              background: 'transparent',
                              border: 'none',
                              cursor: exportingFormat !== null ? 'wait' : 'pointer',
                              textAlign: 'left',
                              color: 'var(--text-primary)',
                              transition: 'background 0.12s ease'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <FileSpreadsheet size={14} color="#10B981" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>Excel Spreadsheet (.xlsx)</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Bold headers, no gridlines</div>
                            </div>
                            {exportingFormat === 'xlsx' && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : message.isStreaming ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0D3273', fontSize: '0.85rem' }}>
            {message.toolCalls && message.toolCalls.some(t => t.status === 'running') ? (
              <>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span>
                  Running <strong>
                    {message.toolCalls.find(t => t.status === 'running')?.name === 'retrieve_document_context'
                      ? 'Hybrid RAG Search (Pinecone & Cross-Encoder)'
                      : message.toolCalls.find(t => t.status === 'running')?.name || 'Tool'}
                  </strong>...
                </span>
              </>
            ) : (
              <>
                <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#0D3273', animation: 'pulseGlow 1s infinite' }} />
                <span>
                  {message.toolCalls && message.toolCalls.length > 0
                    ? `Synthesizing grounded answer from ${message.toolCalls.length} retrieved source(s)...`
                    : 'Reasoning & executing graph nodes...'}
                </span>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
