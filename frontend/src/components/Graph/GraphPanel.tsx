import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Play,
  Brain,
  Wrench,
  CheckCircle2,
  ArrowDown,
  CornerDownLeft,
  Activity,
  Sliders,
  Calculator,
  Globe,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Layers,
  FileText,
  BookOpen
} from 'lucide-react';
import { ChatMessage, ExecutionEvent, GraphSchema, ToolCallItem, DocumentItem } from '../../types';
import { normalizeMarkdown, markdownCustomComponents } from '../Common/ToolResultView';
import { extractCitationSources, transformCitationsInMarkdown, parseCitationAnchor } from '../../utils/citations';
import { CitationBadge } from '../Common/CitationBadge';
import { GroupedToolNode } from './GroupedToolNode';
import { DocumentPageViewer } from '../Documents/DocumentPageViewer';

interface GraphPanelProps {
  schema?: GraphSchema | null;
  activeNode: string | null;
  activeTool: string | null;
  events: ExecutionEvent[];
  messages?: ChatMessage[];
  isStreaming?: boolean;
  panelWidth?: number;
  onWidthChange?: (width: number) => void;
  availableDocuments?: DocumentItem[];
}

export const GraphPanel: React.FC<GraphPanelProps> = ({
  activeNode,
  activeTool,
  events,
  messages = [],
  isStreaming = false,
  panelWidth = 45,
  onWidthChange,
  availableDocuments = [],
}) => {
  const [copiedFinal, setCopiedFinal] = useState(false);
  const [activeSlideTab, setActiveSlideTab] = useState<'flow' | 'document'>('flow');
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);
  const [viewerTargetPage, setViewerTargetPage] = useState<number>(1);
  const [viewerHighlightQuote, setViewerHighlightQuote] = useState<string>('');

  // Default viewerDoc to first available document if none selected
  useEffect(() => {
    if (!viewerDoc && availableDocuments && availableDocuments.length > 0) {
      setViewerDoc(availableDocuments[0]);
    }
  }, [availableDocuments, viewerDoc]);

  // Listen to open-doc-viewer events from CitationBadge or Tool Cards
  useEffect(() => {
    const handleOpenDoc = (e: any) => {
      const detail = e.detail;
      if (!detail) return;

      let matched: DocumentItem | null = null;
      if (availableDocuments && availableDocuments.length > 0) {
        if (detail.fileId) {
          matched = availableDocuments.find(d => d.id === detail.fileId) || null;
        }
        if (!matched && detail.fileName) {
          const target = detail.fileName.toLowerCase().trim();
          matched = availableDocuments.find(d => 
            d.name.toLowerCase().trim() === target ||
            d.name.toLowerCase().includes(target) ||
            target.includes(d.name.toLowerCase())
          ) || null;
        }
        if (!matched && availableDocuments.length === 1) {
          matched = availableDocuments[0];
        }
      }

      if (matched) {
        setViewerDoc(matched);
      }
      if (detail.pageNumber) {
        setViewerTargetPage(detail.pageNumber);
      }
      if (detail.highlightText) {
        setViewerHighlightQuote(detail.highlightText);
      }
      setActiveSlideTab('document');
    };

    window.addEventListener('autoflow:open-doc-viewer', handleOpenDoc);
    return () => window.removeEventListener('autoflow:open-doc-viewer', handleOpenDoc);
  }, [availableDocuments]);

  // Extract latest turn from messages
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
  const toolCalls = lastAssistantMsg?.toolCalls || [];
  const validation = lastAssistantMsg?.validation;

  // Group tool calls by tool name
  const groupedTools: { toolName: string; items: ToolCallItem[] }[] = [];
  toolCalls.forEach(tool => {
    const existing = groupedTools.find(g => g.toolName === tool.name);
    if (existing) {
      existing.items.push(tool);
    } else {
      groupedTools.push({ toolName: tool.name, items: [tool] });
    }
  });

  const handleCopyFinalResponse = () => {
    if (!lastAssistantMsg?.content) return;
    navigator.clipboard.writeText(lastAssistantMsg.content);
    setCopiedFinal(true);
    setTimeout(() => setCopiedFinal(false), 2000);
  };

  // Truncate user prompt to max 100 characters and handle images
  const rawUserPrompt = lastUserMsg?.content || '';
  const hasUserImage = !!lastUserMsg?.imageData;
  let truncatedUserQuery = 'Awaiting user input...';
  if (rawUserPrompt) {
    truncatedUserQuery = rawUserPrompt.length > 100
      ? `${rawUserPrompt.slice(0, 100).trim()}...`
      : rawUserPrompt;
  } else if (hasUserImage) {
    truncatedUserQuery = '[Attached Image]';
  }

  const hasActiveRun = isStreaming || messages.length > 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px 20px',
      overflow: 'hidden',
      background: 'var(--color-canvas)',
    }}>
      {/* Top Header Bar with Slide Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px',
        flexShrink: 0,
      }}>
        {/* Title: AutoFlow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em'
          }}>
            AutoFlow
          </span>
        </div>

        {/* Slide View Switcher Tabs: Execution Flow vs Document Viewer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-surface-subtle)',
          borderRadius: '8px',
          padding: '2px',
          border: '1px solid var(--border-subtle)',
          gap: '2px',
        }}>
          <button
            onClick={() => setActiveSlideTab('flow')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeSlideTab === 'flow' ? '#0D3273' : 'transparent',
              color: activeSlideTab === 'flow' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="View live autonomous LangGraph reasoning and tool execution trace"
          >
            <Activity size={12} />
            <span>Execution Flow</span>
          </button>

          <button
            onClick={() => {
              if (!viewerDoc && availableDocuments && availableDocuments.length > 0) {
                setViewerDoc(availableDocuments[0]);
              }
              setActiveSlideTab('document');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              background: activeSlideTab === 'document' ? '#0D3273' : 'transparent',
              color: activeSlideTab === 'document' ? '#FFFFFF' : 'var(--text-secondary)',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="View digitized PDF/DOCX page-by-page with highlighted answer text"
          >
            <FileText size={12} />
            <span>Document Viewer</span>
            {viewerDoc && (
              <span style={{
                fontSize: '0.62rem',
                padding: '1px 5px',
                borderRadius: '9999px',
                background: activeSlideTab === 'document' ? 'rgba(255,255,255,0.2)' : 'rgba(13,50,115,0.1)',
                fontWeight: 700,
              }}>
                p.{viewerTargetPage}
              </span>
            )}
          </button>
        </div>

        {/* Width Slider Control */}
        {onWidthChange && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-surface-white)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '9999px',
            padding: '3px 10px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)'
          }}>
            <Sliders size={12} color="var(--text-secondary)" />
            <input
              type="range"
              min={25}
              max={65}
              value={panelWidth}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              style={{
                width: '70px',
                accentColor: '#0D3273',
                cursor: 'pointer',
                height: '4px'
              }}
              title={`Adjust panel width (${panelWidth}%)`}
            />
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              minWidth: '28px'
            }}>
              {panelWidth}%
            </span>
          </div>
        )}
      </div>

      {/* Main Content: Execution Flow Timeline vs Embedded Document Viewer */}
      {activeSlideTab === 'document' ? (
        <div style={{
          flex: 1,
          height: '100%',
          overflow: 'hidden',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          background: 'var(--color-surface-white)'
        }}>
          <DocumentPageViewer
            document={viewerDoc}
            targetPage={viewerTargetPage}
            highlightQuote={viewerHighlightQuote}
            isEmbeddedInSlide={true}
            onClose={() => setActiveSlideTab('flow')}
          />
        </div>
      ) : (
        /* Scrollable Flow Area */
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
        }}>
        {/* Category & Title */}
        <div style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '4px'
        }}>
          TRIGGERED EXECUTION FLOW
        </div>

        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.45rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '20px',
          lineHeight: 1.2
        }}>
          {hasActiveRun ? 'Live Pipeline Sequence' : 'Autonomous Pipeline Architecture'}
        </h2>

        {/* Vertical Triggered Node Sequence */}
        {hasActiveRun ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {/* 1. ENTRY NODE: User Query */}
            <div className="editorial-card" style={{
              padding: '14px 16px',
              border: activeNode === '__start__' ? '2px solid #059669' : '1px solid var(--border-strong)',
              position: 'relative'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Play size={11} color="#ffffff" fill="#ffffff" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    User Input
                  </span>
                </div>
                {hasUserImage && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(13, 50, 115, 0.08)',
                    color: '#0D3273',
                    fontWeight: 600
                  }}>
                    Image Attached
                  </span>
                )}
              </div>

              <div style={{
                background: 'var(--color-surface-subtle)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                border: '1px solid var(--border-subtle)',
                lineHeight: 1.4,
                wordBreak: 'break-word'
              }}>
                "{truncatedUserQuery}"
              </div>
            </div>

            {/* Down Arrow connector */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: '#0D3273' }}>
              <div style={{ width: '2px', height: '14px', background: 'var(--border-strong)' }} />
              <ArrowDown size={14} color="#0D3273" />
            </div>

            {/* 2. LLM REASONING CORE: Gemini Agent */}
            <div className="editorial-card" style={{
              padding: '14px 16px',
              border: activeNode === 'agent' ? '2px solid #0D3273' : '1px solid var(--border-strong)',
              boxShadow: activeNode === 'agent' ? '0 4px 14px rgba(13, 50, 115, 0.12)' : 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#0D3273',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Brain size={13} color="#ffffff" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    AutoFlow Agent
                  </span>
                </div>
                {activeNode === 'agent' && (
                  <span style={{
                    fontSize: '0.65rem',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: '#E2E8F7',
                    color: '#0D3273',
                    fontWeight: 600
                  }}>
                    Synthesizing...
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {activeNode === 'agent'
                  ? 'Deciding actions, executing tools, and synthesizing final answers directly...'
                  : toolCalls.length > 0
                  ? `Dispatched ${toolCalls.length} parallel tool execution${toolCalls.length > 1 ? 's' : ''} across ${groupedTools.length} tool engine${groupedTools.length > 1 ? 's' : ''}.`
                  : 'Completed direct response synthesis without external tools.'}
              </div>
            </div>

            {/* GROUPED DYNAMIC TOOL NODES (Organized by Tool Type) */}
            {groupedTools.map((group) => {
              const isGroupRunning = activeNode === 'tools' && activeTool === group.toolName;

              return (
                <React.Fragment key={group.toolName}>
                  {/* Down Arrow to tool */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: '#D946EF' }}>
                    <div style={{ width: '2px', height: '14px', background: 'var(--border-strong)' }} />
                    <ArrowDown size={14} color="#D946EF" />
                  </div>

                  {/* Grouped Tool Card with interactive query tabs */}
                  <GroupedToolNode
                    toolName={group.toolName}
                    tools={group.items}
                    isCurrentToolRunning={isGroupRunning}
                  />

                  {/* Loopback Arrow back to Agent */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 0',
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 500
                  }}>
                    <CornerDownLeft size={13} color="#0D3273" />
                    <span>Loopback: {group.items.length} {group.items.length === 1 ? 'result' : 'parallel results'} returned to AutoFlow Agent</span>
                  </div>
                </React.Fragment>
              );
            })}

            {/* 4. TASK COMPLETENESS VALIDATOR (Checks if user prompt is fully answered) */}
            {(validation || activeNode === 'validator') && (
              <React.Fragment>
                {/* Down Arrow to validator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: '#059669' }}>
                  <div style={{ width: '2px', height: '14px', background: 'var(--border-strong)' }} />
                  <ArrowDown size={14} color="#059669" />
                </div>

                <div className="editorial-card" style={{
                  padding: '14px 16px',
                  border: activeNode === 'validator' ? '2px solid #059669' : '1px solid var(--border-strong)',
                  background: 'var(--color-surface-white)',
                  boxShadow: activeNode === 'validator' ? '0 4px 14px rgba(5, 150, 105, 0.15)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: validation?.sufficient ? '#059669' : '#D97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={13} color="#ffffff" />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Validator
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: activeNode === 'validator'
                        ? 'rgba(5, 150, 105, 0.12)'
                        : validation?.sufficient
                        ? 'rgba(16, 185, 129, 0.12)'
                        : 'rgba(245, 158, 11, 0.12)',
                      color: activeNode === 'validator' ? '#059669' : validation?.sufficient ? '#059669' : '#D97706',
                      fontWeight: 600
                    }}>
                      {activeNode === 'validator'
                        ? 'Validating Completeness...'
                        : validation?.sufficient
                        ? `Complete (${Math.round((validation.confidence || 1.0) * 100)}%)`
                        : `Incomplete (${Math.round((validation?.confidence || 0.5) * 100)}%)`}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {activeNode === 'validator' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={12} className="anim-pulse" color="#059669" />
                        <span>Evaluating if all parts of user query have been fully answered...</span>
                      </div>
                    ) : validation ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                          {validation.critique || (validation.sufficient ? 'All aspects of the query have been fully answered.' : 'Missing information or unanswered sub-questions detected.')}
                        </div>
                        {validation.missing_information && validation.missing_information.length > 0 && (
                          <div style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            fontSize: '0.74rem'
                          }}>
                            <b>Unanswered Parts:</b> {validation.missing_information.join(', ')}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span>Task completeness evaluated against user query.</span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            )}

            {/* Down Arrow to final output */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', color: '#0891B2' }}>
              <div style={{ width: '2px', height: '14px', background: 'var(--border-strong)' }} />
              <ArrowDown size={14} color="#0891B2" />
            </div>

            {/* 5. RESPONSE OUTPUT FINALIZATION: __end__ */}
            <div className="editorial-card" style={{
              padding: '14px 16px',
              border: activeNode === '__end__' || activeNode === 'synthesizer' || (!isStreaming && lastAssistantMsg?.content) ? '2px solid #0891B2' : '1px solid var(--border-strong)',
              background: 'var(--color-surface-white)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#0891B2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={13} color="#ffffff" />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Final Output
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {lastAssistantMsg?.content && (
                    <button
                      onClick={handleCopyFinalResponse}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: 'transparent',
                        border: 'none',
                        color: copiedFinal ? '#15803D' : 'var(--text-tertiary)',
                        cursor: 'pointer',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 4px',
                        borderRadius: '4px'
                      }}
                      title="Copy response text"
                    >
                      {copiedFinal ? <Check size={11} color="#15803D" /> : <Copy size={11} />}
                      <span>{copiedFinal ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{
                background: 'var(--color-surface-subtle)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                color: 'var(--text-primary)',
                maxHeight: '220px',
                overflowY: 'auto',
                lineHeight: 1.55,
                border: '1px solid var(--border-subtle)'
              }}>
                {lastAssistantMsg?.content ? (
                  <div className="markdown-snippet">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        ...markdownCustomComponents,
                        a({ href, children, ...props }: any) {
                          if (href && href.startsWith('#cite-')) {
                            const parsed = parseCitationAnchor(href);
                            const sourcesMap = extractCitationSources(toolCalls);
                            const source =
                              sourcesMap[parsed.index] ||
                              (parsed.pageNumber ? sourcesMap[`page-${parsed.pageNumber}`] : undefined);
                            return (
                              <CitationBadge
                                index={parsed.index}
                                pageNumber={parsed.pageNumber}
                                fileName={parsed.fileName}
                                source={source}
                                contextSentence={lastAssistantMsg.content}
                              />
                            );
                          }
                          return (
                            <a href={href} target="_blank" rel="noreferrer" {...props}>
                              {children}
                            </a>
                          );
                        }
                      }}
                    >
                      {transformCitationsInMarkdown(normalizeMarkdown(lastAssistantMsg.content))}
                    </ReactMarkdown>
                  </div>
                ) : isStreaming ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                    <Activity size={12} className="anim-pulse" color="#0891B2" />
                    <span>Streaming final verified answer...</span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-tertiary)' }}>Awaiting generation...</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Default Illustrative Sequence when idle */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            {/* Step 1 */}
            <div className="editorial-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={10} color="#fff" fill="#fff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  User Input
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Ingests user prompt
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
              <div style={{ width: '2px', height: '12px', background: 'var(--border-strong)' }} />
              <ArrowDown size={13} color="#0D3273" />
            </div>

            {/* Step 2 */}
            <div className="editorial-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0D3273', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={12} color="#fff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  AutoFlow Agent
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Gemini decides actions, dispatches parallel tools, and synthesizes answers directly.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
              <div style={{ width: '2px', height: '12px', background: 'var(--border-strong)' }} />
              <ArrowDown size={13} color="#D946EF" />
            </div>

            {/* Step 3 */}
            <div className="editorial-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: '#D946EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={12} color="#fff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Tool Dispatcher
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Executes tool calls
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
              <div style={{ width: '2px', height: '12px', background: 'var(--border-strong)' }} />
              <ArrowDown size={13} color="#059669" />
            </div>

            {/* Step 4 */}
            <div className="editorial-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={12} color="#fff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Validator
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Evaluates if the full user prompt is answered; loops back to agent if more generation is required.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
              <div style={{ width: '2px', height: '12px', background: 'var(--border-strong)' }} />
              <ArrowDown size={13} color="#0891B2" />
            </div>

            {/* Step 5 */}
            <div className="editorial-card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#0891B2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle2 size={12} color="#fff" />
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Final Output
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Delivers the synthesized response once completeness is confirmed.
              </div>
            </div>

            <div style={{
              marginTop: '16px',
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--color-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
              Send a message in the chat to watch each node trigger live in real time.
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
