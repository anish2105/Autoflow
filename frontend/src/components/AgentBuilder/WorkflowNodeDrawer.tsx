import React, { useState } from 'react';
import {
  X,
  Cpu,
  BookOpen,
  FileCode,
  Globe,
  Calculator,
  Clock,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileEdit,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Upload,
  Check,
  ExternalLink,
  Info,
  Eye,
  Play,
  Loader2,
  CheckCircle2,
  Download,
  Copy,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { WorkflowNode, WorkflowDefinition } from '../../types/workflow';
import { DocumentItem } from '../../types';

interface WorkflowNodeDrawerProps {
  node: WorkflowNode | null;
  onClose: () => void;
  onUpdateConfig: (nodeId: string, updatedConfig: Record<string, any>) => void;
  onUpdateTitle: (nodeId: string, title: string) => void;
  documents?: DocumentItem[];
  onUploadDocument?: (file: File) => Promise<DocumentItem | null>;
  // Output & Execution Props
  workflow?: WorkflowDefinition;
  executionState?: {
    isRunning: boolean;
    streamOutput: string;
    activeStep: string | null;
    completed: boolean;
    prompt: string;
  };
  onPromptChange?: (prompt: string) => void;
  onRunExecution?: () => void;
  onExecuteInChat?: (prompt: string, workflow: WorkflowDefinition) => void;
}

const PRESET_SYSTEM_PROMPTS = [
  {
    label: 'ATS Resume Auditor',
    prompt:
      'You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter. Analyze documents strictly against corporate ATS benchmarks, scan for keyword density, formatting issues, and quantify missing competencies.',
  },
  {
    label: 'Enterprise Financial Analyst',
    prompt:
      'You are a Principal Financial Analyst and Corporate Controller. Evaluate balance sheets, cash flows, and line items with rigorous GAAP accounting principles, highlighting variances, margins, and discrepancies.',
  },
  {
    label: 'Legal Obligation Extractor',
    prompt:
      'You are an Enterprise Legal Counsel specializing in contract compliance. Extract operational obligations, indemnities, liability caps, and termination penalties with exact clause citations.',
  },
  {
    label: 'Technical Code Reviewer',
    prompt:
      'You are a Staff Software Architect. Perform deep code analysis, highlighting algorithmic complexity, security vulnerabilities, edge-case handling, and architectural modularity.',
  },
];

export const WorkflowNodeDrawer: React.FC<WorkflowNodeDrawerProps> = ({
  node,
  onClose,
  onUpdateConfig,
  onUpdateTitle,
  documents = [],
  onUploadDocument,
  workflow,
  executionState,
  onPromptChange,
  onRunExecution,
  onExecuteInChat,
}) => {
  const [newUrl, setNewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!node) return null;

  const isOutputNode = node.type === 'viewer' || node.type.startsWith('export_');
  const exportNodes = workflow?.nodes.filter((n) => n.type.startsWith('export_')) || [];

  const handleCopyOutput = () => {
    if (!executionState?.streamOutput) return;
    navigator.clipboard.writeText(executionState.streamOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = (filename: string, content: string) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleConfigChange = (key: string, value: any) => {
    onUpdateConfig(node.id, {
      ...node.config,
      [key]: value,
    });
  };

  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;
    const currentUrls = node.config.urls || [];
    if (!currentUrls.includes(newUrl.trim())) {
      handleConfigChange('urls', [...currentUrls, newUrl.trim()]);
    }
    setNewUrl('');
  };

  const handleRemoveUrl = (index: number) => {
    const currentUrls = node.config.urls || [];
    handleConfigChange('urls', currentUrls.filter((_, i) => i !== index));
  };

  const handleToggleFile = (fileId: string) => {
    const currentFileIds: string[] = node.config.selected_file_ids || [];
    if (currentFileIds.includes(fileId)) {
      handleConfigChange(
        'selected_file_ids',
        currentFileIds.filter((id) => id !== fileId)
      );
    } else {
      handleConfigChange('selected_file_ids', [...currentFileIds, fileId]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadDocument) return;

    try {
      setIsUploading(true);
      const uploaded = await onUploadDocument(file);
      if (uploaded) {
        const currentFileIds: string[] = node.config.selected_file_ids || [];
        handleConfigChange('selected_file_ids', [...currentFileIds, uploaded.id]);
      }
    } catch (err) {
      console.error('File upload failed in node drawer:', err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: isOutputNode ? '560px' : '420px',
        maxWidth: '92vw',
        height: '100%',
        background: 'var(--color-surface-white)',
        borderLeft: '1px solid var(--border-subtle)',
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.08)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--color-surface-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: node.type === 'viewer' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(13, 50, 115, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: node.type === 'viewer' ? '#4F46E5' : '#0D3273',
            }}
          >
            {node.type === 'agent' && <Cpu size={18} />}
            {node.type === 'rag' && <BookOpen size={18} />}
            {node.type === 'web_scrape' && <FileCode size={18} />}
            {node.type === 'web_search' && <Globe size={18} />}
            {node.type === 'calculate' && <Calculator size={18} />}
            {node.type === 'time' && <Clock size={18} />}
            {node.type === 'vision' && <ImageIcon size={18} />}
            {node.type === 'input' && <MessageSquare size={18} />}
            {node.type === 'viewer' && <Eye size={18} color="#4F46E5" />}
            {node.type === 'export_docx' && <FileEdit size={18} />}
            {node.type === 'export_pdf' && <FileText size={18} />}
            {node.type === 'export_excel' && <FileSpreadsheet size={18} />}
            {node.type === 'export_txt' && <FileText size={18} />}
          </div>
          <div>
            <input
              type="text"
              value={node.title}
              onChange={(e) => onUpdateTitle(node.id, e.target.value)}
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                borderBottom: '1px dashed var(--border-subtle)',
                padding: '2px 0',
                width: isOutputNode ? '320px' : '240px',
              }}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {node.type === 'viewer' ? 'Browse Tool • Result Viewer' : node.type.startsWith('export_') ? 'Export Node & Execution' : 'Node Configuration'}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Close Drawer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* ============================================================== */}
        {/* 1. AGENT NODE CONFIGURATION */}
        {/* ============================================================== */}
        {node.type === 'agent' && (
          <>
            <div>
              <label
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <Sparkles size={14} color="#0D3273" />
                Custom System Prompt Prefix
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Prefix instructions injected directly before the AutoFlow Decision & Synthesizer Agent prompt. Defines the agent persona and behavioral requirements.
              </p>
              <textarea
                value={node.config.system_prompt_prefix || ''}
                onChange={(e) => handleConfigChange('system_prompt_prefix', e.target.value)}
                placeholder="e.g. You are an expert ATS auditor. Analyze documents with strict rigor..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  lineHeight: 1.45,
                }}
              />
            </div>

            {/* Prompt Presets */}
            <div>
              <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Load Role Preset:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRESET_SYSTEM_PROMPTS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleConfigChange('system_prompt_prefix', preset.prompt)}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: 'rgba(13, 50, 115, 0.06)',
                      border: '1px solid rgba(13, 50, 115, 0.15)',
                      color: '#0D3273',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(13, 50, 115, 0.12)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(13, 50, 115, 0.06)';
                    }}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Validator Gate Status */}
            <div
              style={{
                background: 'rgba(22, 163, 74, 0.06)',
                border: '1px solid rgba(22, 163, 74, 0.25)',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <ShieldCheck size={18} color="#16A34A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#16A34A', marginBottom: '2px' }}>
                  Completeness Validator Gate (Active)
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  All agent tool executions and synthesized conclusions are validated against an 80% evidence threshold to verify completeness and prevent hallucinations.
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 2. RAG DOCUMENT SCOPE CONFIGURATION */}
        {/* ============================================================== */}
        {node.type === 'rag' && (
          <>
            <div>
              <label
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <BookOpen size={14} color="#2563EB" />
                Select Documents in Scope
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                Choose which documents from your library are indexed and retrieved by the hybrid RAG engine for this workflow.
              </p>

              {/* Upload Dropzone */}
              {onUploadDocument && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px dashed var(--border-subtle)',
                    background: 'var(--color-surface-subtle)',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    fontSize: '0.78rem',
                    color: '#0D3273',
                    fontWeight: 600,
                    marginBottom: '14px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Upload size={16} />
                  <span>{isUploading ? 'Uploading file...' : 'Upload & Add New Document'}</span>
                  <input
                    type="file"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}

              {/* Documents List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                    No documents uploaded yet. Upload a file above to add to scope.
                  </div>
                ) : (
                  documents.map((doc) => {
                    const isSelected = (node.config.selected_file_ids || []).includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => handleToggleFile(doc.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--color-surface)',
                          border: isSelected ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              background: isSelected ? '#2563EB' : 'transparent',
                              border: isSelected ? '1px solid #2563EB' : '1px solid var(--border-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              flexShrink: 0,
                            }}
                          >
                            {isSelected && <Check size={12} />}
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div
                              style={{
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                maxWidth: '280px',
                              }}
                              title={doc.name}
                            >
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                              {(doc.size / 1024).toFixed(1)} KB • {doc.digitized ? 'Digitized' : 'Raw'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 3. WEB SCRAPER CONFIGURATION */}
        {/* ============================================================== */}
        {node.type === 'web_scrape' && (
          <>
            <div>
              <label
                style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                }}
              >
                <FileCode size={14} color="#EA580C" />
                Target Web Scraper URLs
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                Enter the URLs to scrape with Firecrawl. The agent extracts clean Markdown and passes it into context.
              </p>

              <form onSubmit={handleAddUrl} style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                <input
                  type="url"
                  placeholder="https://example.com/spec"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--color-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#EA580C',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
              </form>

              {/* URL List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {((node.config.urls || []) as string[]).map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.76rem',
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        maxWidth: '300px',
                      }}
                      title={url}
                    >
                      {url}
                    </div>
                    <button
                      onClick={() => handleRemoveUrl(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      title="Remove URL"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}

                {(!node.config.urls || node.config.urls.length === 0) && (
                  <div style={{ textAlign: 'center', padding: '14px', color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>
                    No URLs added yet. Add a website link above.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* 4. WEB SEARCH CONFIGURATION (Autonomous - no runtime inputs) */}
        {/* ============================================================== */}
        {node.type === 'web_search' && (
          <div
            style={{
              background: 'rgba(2, 132, 199, 0.06)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284C7', fontWeight: 700, fontSize: '0.85rem' }}>
              <Globe size={18} />
              Autonomous Tavily Web Search
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This tool requires no upfront input from the user. The AutoFlow Decision Agent formulates search queries autonomously during runtime when external news, citations, or domain lookups are needed.
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. CALCULATOR & TIME CONFIGURATION (Always present/utility) */}
        {/* ============================================================== */}
        {node.type === 'calculate' && (
          <div
            style={{
              background: 'rgba(22, 163, 74, 0.06)',
              border: '1px solid rgba(22, 163, 74, 0.25)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16A34A', fontWeight: 700, fontSize: '0.85rem' }}>
              <Calculator size={18} />
              Deterministic Math Engine
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Executes python arithmetic and algebraic evaluations. Ensures 100% calculation accuracy without LLM numeric drift.
            </div>
          </div>
        )}

        {node.type === 'time' && (
          <div
            style={{
              background: 'rgba(13, 148, 136, 0.06)',
              border: '1px solid rgba(13, 148, 136, 0.25)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0D9488', fontWeight: 700, fontSize: '0.85rem' }}>
              <Clock size={18} />
              Date, Time & Timezones
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Supplies exact UTC and localized timestamps, weekdays, and daylight savings offsets.
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. INPUT TRIGGER CONFIGURATION */}
        {/* ============================================================== */}
        {node.type === 'input' && (
          <div>
            <label
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '6px',
              }}
            >
              <MessageSquare size={14} color="#0D3273" />
              Default Runtime Query
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
              Enter a default query or prompt for this workflow. When executing, the user can run this default prompt or provide a new prompt.
            </p>
            <textarea
              value={node.config.default_query || ''}
              onChange={(e) => handleConfigChange('default_query', e.target.value)}
              placeholder="e.g. Audit this resume for the Senior AI Engineer role..."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--color-surface)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* 7. BROWSE / VIEWER & EXPORT NODES (ON-SCREEN EXECUTION & OUTPUT) */}
        {/* ============================================================== */}
        {isOutputNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Viewer Node Notice */}
            {node.type === 'viewer' && (
              <div
                style={{
                  background: 'rgba(79, 70, 229, 0.06)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Eye size={18} color="#4F46E5" />
                <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  <b style={{ color: '#4F46E5' }}>Browse / Result Viewer</b>: Interactive on-screen result layout. View synthesized answers, citations, tables, and metrics directly here as an alternative to downloading PDF, Word, or Excel.
                </div>
              </div>
            )}

            {/* Export Node Title Input (Matches Photo 2) */}
            {node.type.startsWith('export_') && (
              <div>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '6px',
                  }}
                >
                  <FileEdit size={14} color="#2563EB" />
                  Export Document Title
                </label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  The title header embedded into the generated document or table export.
                </p>
                <input
                  type="text"
                  value={node.config.export_title || ''}
                  onChange={(e) => handleConfigChange('export_title', e.target.value)}
                  placeholder="e.g. Module extracts"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--color-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Runtime Query / Instruction Box */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageSquare size={14} color="#0D3273" />
                  Runtime Query / Instruction
                </label>
                {onExecuteInChat && workflow && (
                  <button
                    type="button"
                    onClick={() => onExecuteInChat(executionState?.prompt || '', workflow)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0D3273',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Open in Full Chat</span>
                  </button>
                )}
              </div>
              <textarea
                value={executionState?.prompt || ''}
                onChange={(e) => onPromptChange && onPromptChange(e.target.value)}
                disabled={executionState?.isRunning}
                rows={3}
                placeholder="Enter runtime prompt to execute through this pipeline..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--color-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            {/* Run Pipeline Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                disabled={executionState?.isRunning || !(executionState?.prompt || '').trim()}
                onClick={onRunExecution}
                className="pill-button-primary"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  opacity: executionState?.isRunning || !(executionState?.prompt || '').trim() ? 0.6 : 1,
                }}
              >
                {executionState?.isRunning ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Run Pipeline</span>
                  </>
                )}
              </button>
            </div>

            {/* Execution Step / Progress Indicator */}
            {executionState?.activeStep && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: executionState?.isRunning ? 'rgba(37, 99, 235, 0.08)' : 'rgba(22, 163, 74, 0.08)',
                  border: executionState?.isRunning ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid rgba(22, 163, 74, 0.25)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: executionState?.isRunning ? '#2563EB' : '#16A34A',
                }}
              >
                {executionState?.isRunning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                <span>{executionState.activeStep}</span>
              </div>
            )}

            {/* Synthesized Output Display */}
            {executionState?.streamOutput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    <Sparkles size={14} color="#0D3273" />
                    <span>Synthesized Output</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleCopyOutput}
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Copy output to clipboard"
                    >
                      {copied ? <Check size={12} color="#16A34A" /> : <Copy size={12} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadTxt(
                          `${(node.title || 'AutoFlow_Result').replace(/\s+/g, '_')}.md`,
                          executionState.streamOutput
                        )
                      }
                      style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Download as Markdown"
                    >
                      <Download size={12} />
                      <span>.md</span>
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--color-surface-white)',
                    padding: '16px',
                    maxHeight: '420px',
                    overflowY: 'auto',
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                    color: 'var(--text-primary)',
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.8rem',
                              border: '1px solid var(--border-subtle)',
                            }}
                            {...props}
                          />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          style={{
                            border: '1px solid var(--border-subtle)',
                            padding: '7px 10px',
                            background: 'var(--color-surface-subtle)',
                            fontWeight: 700,
                            textAlign: 'left',
                            fontSize: '0.78rem',
                          }}
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td
                          style={{
                            border: '1px solid var(--border-subtle)',
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                          }}
                          {...props}
                        />
                      ),
                      h1: ({ node, ...props }) => (
                        <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '14px 0 6px 0', color: 'var(--text-primary)' }} {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 style={{ fontSize: '1.02rem', fontWeight: 700, margin: '12px 0 5px 0', color: 'var(--text-primary)' }} {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '10px 0 4px 0', color: 'var(--text-primary)' }} {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p style={{ margin: '6px 0', lineHeight: 1.55 }} {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul style={{ paddingLeft: '18px', margin: '6px 0' }} {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol style={{ paddingLeft: '18px', margin: '6px 0' }} {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li style={{ margin: '3px 0' }} {...props} />
                      ),
                      code: ({ node, className, children, ...props }) => (
                        <code
                          style={{
                            background: 'rgba(0,0,0,0.05)',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            fontFamily: 'monospace',
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {executionState.streamOutput}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Eye size={24} color="#94A3B8" />
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No result to display yet
                </div>
                <div style={{ fontSize: '0.74rem', maxWidth: '320px', lineHeight: 1.4 }}>
                  Click <b>Run Pipeline</b> above to execute the pipeline and view the synthesized answer here in real-time.
                </div>
              </div>
            )}

            {/* Connected Exports (if DOCX / PDF / Excel wired) */}
            {executionState?.completed && exportNodes.length > 0 && (
              <div
                style={{
                  background: 'rgba(22, 163, 74, 0.06)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={14} color="#16A34A" />
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#16A34A' }}>
                    Pipeline completed. Download configured exports:
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {exportNodes.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() =>
                        handleDownloadTxt(
                          `${(exp.config.export_title || 'AutoFlow_Export').replace(/\s+/g, '_')}.txt`,
                          executionState.streamOutput
                        )
                      }
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Download size={12} />
                      <span>{exp.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

