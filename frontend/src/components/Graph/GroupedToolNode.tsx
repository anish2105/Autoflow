import React, { useState } from 'react';
import {
  Globe,
  Calculator,
  Clock,
  Wrench,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Check,
  Flame,
  BookOpen,
  FileText
} from 'lucide-react';
import { ToolCallItem } from '../../types';
import { ToolArgumentsView, ToolOutputView } from '../Common/ToolResultView';

interface GroupedToolNodeProps {
  toolName: string;
  tools: ToolCallItem[];
  isCurrentToolRunning: boolean;
  stepNumber?: string | number;
}

export const GroupedToolNode: React.FC<GroupedToolNodeProps> = ({
  toolName,
  tools,
  isCurrentToolRunning,
  stepNumber,
}) => {
  // If multiple tools, allow switching between specific call index or 'all'
  const [selectedCallIndex, setSelectedCallIndex] = useState<number>(0);
  const [viewAll, setViewAll] = useState<boolean>(false);

  const runningCount = tools.filter(t => t.status === 'running').length;
  const completedCount = tools.filter(t => t.status === 'completed').length;
  const isAnyRunning = runningCount > 0 || isCurrentToolRunning;

  const getToolMeta = (name: string) => {
    switch (name.toLowerCase()) {
      case 'calculate':
        return {
          icon: <Calculator size={14} color="#7E22CE" />,
          label: 'Deterministic Math Engine',
          accentColor: '#7E22CE',
          bgLight: '#FAF5FF',
          borderLight: '#E9D5FF'
        };
      case 'web_search':
        return {
          icon: <Globe size={14} color="#0284C7" />,
          label: 'Live Web Search Engine',
          accentColor: '#0284C7',
          bgLight: '#F0F7FF',
          borderLight: '#BAE6FD'
        };
      case 'web_scrape':
        return {
          icon: <Flame size={14} color="#EA580C" />,
          label: 'Firecrawl Scrape Engine',
          accentColor: '#EA580C',
          bgLight: '#FFF7ED',
          borderLight: '#FED7AA'
        };
      case 'get_current_time':
        return {
          icon: <Clock size={14} color="#15803D" />,
          label: 'Time & Date Engine',
          accentColor: '#15803D',
          bgLight: '#F0FDF4',
          borderLight: '#BBF7D0'
        };
      case 'retrieve_document_context':
        return {
          icon: <BookOpen size={14} color="#4338CA" />,
          label: 'Hybrid RAG Document Search Engine',
          accentColor: '#4338CA',
          bgLight: '#EEF2FF',
          borderLight: '#C7D2FE'
        };
      default:
        return {
          icon: <Wrench size={14} color="#0D3273" />,
          label: 'Custom Tool Engine',
          accentColor: '#0D3273',
          bgLight: '#F8FAFC',
          borderLight: '#E2E8F0'
        };
    }
  };

  const meta = getToolMeta(toolName);

  // Helper to extract a concise tab label
  const getTabLabel = (tool: ToolCallItem, index: number) => {
    if (toolName === 'web_search' && tool.input) {
      const q = typeof tool.input === 'object' ? tool.input.query : String(tool.input);
      if (q) {
        return q.length > 20 ? `Q${index + 1}: ${q.substring(0, 18)}...` : `Q${index + 1}: ${q}`;
      }
    }
    if (toolName === 'retrieve_document_context' && tool.input) {
      const q = typeof tool.input === 'object' ? tool.input.query : String(tool.input);
      if (q) {
        return q.length > 20 ? `Doc: ${q.substring(0, 18)}...` : `Doc: ${q}`;
      }
    }
    if (toolName === 'web_scrape' && tool.input) {
      const u = typeof tool.input === 'object' ? (tool.input.url || '') : String(tool.input);
      if (u) {
        const clean = u.replace(/^https?:\/\/(www\.)?/, '');
        return clean.length > 20 ? `${clean.substring(0, 18)}...` : clean;
      }
    }
    if (toolName === 'calculate' && tool.input) {
      const expr = typeof tool.input === 'object' ? tool.input.expression : String(tool.input);
      if (expr) {
        return expr.length > 16 ? `Calc #${index + 1}: ${expr.substring(0, 14)}...` : `Calc: ${expr}`;
      }
    }
    return `Call #${index + 1}`;
  };

  const activeTool = tools[selectedCallIndex] || tools[0];

  return (
    <div
      className="editorial-card"
      style={{
        padding: '14px 16px',
        border: isAnyRunning ? `2px solid ${meta.accentColor}` : '1px solid var(--border-strong)',
        background: 'var(--color-surface-white)',
        boxShadow: isAnyRunning ? `0 4px 14px ${meta.borderLight}` : '0 1px 3px rgba(0, 0, 0, 0.02)',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      {/* Group Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '8px',
            background: meta.bgLight,
            border: `1px solid ${meta.borderLight}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)'
              }}>
                {stepNumber ? `${stepNumber}. ` : ''}{toolName}
              </span>
              <span style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '9999px',
                background: meta.bgLight,
                color: meta.accentColor,
                fontWeight: 600
              }}>
                {tools.length} {tools.length === 1 ? 'call' : 'parallel calls'}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {meta.label}
            </div>
          </div>
        </div>

        {/* Status indicator badge */}
        <span style={{
          fontSize: '0.68rem',
          padding: '3px 9px',
          borderRadius: '9999px',
          background: isAnyRunning ? '#FDF2F8' : '#F0FDF4',
          color: isAnyRunning ? '#D946EF' : '#15803D',
          border: `1px solid ${isAnyRunning ? '#FBCFE8' : '#BBF7D0'}`,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}>
          {isAnyRunning ? (
            <>
              <Loader2 size={11} className="anim-spin" />
              <span>Executing ({completedCount}/{tools.length} done)</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={11} color="#15803D" />
              <span>All Completed ({tools.length}/{tools.length})</span>
            </>
          )}
        </span>
      </div>

      {/* Interactive Sub-query Selection Pills (if more than 1 call) */}
      {tools.length > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '10px',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          {/* View All Toggle */}
          <button
            onClick={() => setViewAll(!viewAll)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: viewAll ? `1px solid ${meta.accentColor}` : '1px solid var(--border-subtle)',
              background: viewAll ? meta.bgLight : 'var(--color-surface-subtle)',
              color: viewAll ? meta.accentColor : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Layers size={11} />
            <span>View All ({tools.length})</span>
          </button>

          {/* Individual Query Pills */}
          {tools.map((t, idx) => {
            const isSelected = !viewAll && selectedCallIndex === idx;
            const isToolRunning = t.status === 'running';

            return (
              <button
                key={t.id || idx}
                onClick={() => {
                  setViewAll(false);
                  setSelectedCallIndex(idx);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? `1.5px solid ${meta.accentColor}` : '1px solid var(--border-subtle)',
                  background: isSelected ? meta.bgLight : 'var(--color-surface-white)',
                  color: isSelected ? meta.accentColor : 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                title={typeof t.input === 'object' && t.input?.query ? t.input.query : undefined}
              >
                {/* Status Dot */}
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isToolRunning ? '#D946EF' : '#10B981',
                  display: 'inline-block'
                }} />
                <span>{getTabLabel(t, idx)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Render Mode: View All Stack vs Single Selected Tab */}
      {viewAll && tools.length > 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tools.map((t, idx) => (
            <div
              key={t.id || idx}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  #{idx + 1} of {tools.length}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: '9999px',
                  background: t.status === 'running' ? '#FDF2F8' : '#F0FDF4',
                  color: t.status === 'running' ? '#D946EF' : '#15803D',
                  fontWeight: 600
                }}>
                  {t.status === 'running' ? 'Executing...' : 'Completed'}
                </span>
              </div>

              {t.input && <ToolArgumentsView toolName={toolName} input={t.input} />}
              {t.output && <ToolOutputView toolName={toolName} output={t.output} compact={false} />}
            </div>
          ))}
        </div>
      ) : (
        /* Single Active Tool Card Display */
        activeTool && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tools.length > 1 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.72rem',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ fontWeight: 600 }}>
                  Showing Call {selectedCallIndex + 1} of {tools.length}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    disabled={selectedCallIndex === 0}
                    onClick={() => setSelectedCallIndex(prev => Math.max(0, prev - 1))}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      background: selectedCallIndex === 0 ? 'transparent' : 'var(--color-surface-white)',
                      color: selectedCallIndex === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      cursor: selectedCallIndex === 0 ? 'default' : 'pointer'
                    }}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  <button
                    disabled={selectedCallIndex === tools.length - 1}
                    onClick={() => setSelectedCallIndex(prev => Math.min(tools.length - 1, prev + 1))}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle)',
                      background: selectedCallIndex === tools.length - 1 ? 'transparent' : 'var(--color-surface-white)',
                      color: selectedCallIndex === tools.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      cursor: selectedCallIndex === tools.length - 1 ? 'default' : 'pointer'
                    }}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Input Arguments View */}
            {activeTool.input && (
              <div>
                <div style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  letterSpacing: '0.04em'
                }}>
                  Query & Parameters
                </div>
                <ToolArgumentsView toolName={toolName} input={activeTool.input} />
              </div>
            )}

            {/* Output View */}
            {activeTool.output ? (
              <div>
                <div style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                  letterSpacing: '0.04em'
                }}>
                  Result & Sources
                </div>
                <ToolOutputView toolName={toolName} output={activeTool.output} compact={false} />
              </div>
            ) : activeTool.status === 'running' ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: meta.bgLight,
                border: `1px solid ${meta.borderLight}`,
                fontSize: '0.78rem',
                color: meta.accentColor
              }}>
                <Loader2 size={13} className="anim-spin" />
                <span>Fetching live query results asynchronously in parallel...</span>
              </div>
            ) : null}
          </div>
        )
      )}
    </div>
  );
};
