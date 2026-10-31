import React, { useState } from 'react';
import { Calculator, Globe, Clock, ChevronDown, ChevronRight, CheckCircle2, Loader2, Wrench } from 'lucide-react';
import { ToolCallItem } from '../../types';
import { ToolArgumentsView, ToolOutputView } from '../Common/ToolResultView';

interface ToolCardProps {
  tool: ToolCallItem;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getToolIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'calculate':
        return <Calculator size={14} color="#0D3273" />;
      case 'web_search':
        return <Globe size={14} color="#0891B2" />;
      case 'get_current_time':
        return <Clock size={14} color="#059669" />;
      default:
        return <Wrench size={14} color="#4F46E5" />;
    }
  };

  const isRunning = tool.status === 'running';

  return (
    <div style={{
      margin: '6px 0',
      borderRadius: '10px',
      background: 'var(--color-surface-white)',
      border: isRunning ? '1.5px solid #0D3273' : '1px solid var(--border-subtle)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Header bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          background: 'var(--color-surface-subtle)',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getToolIcon(tool.name)}
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)'
          }}>
            {tool.name}
          </span>
          <span style={{
            fontSize: '0.68rem',
            padding: '1px 6px',
            borderRadius: '9999px',
            background: isRunning ? 'rgba(13, 50, 115, 0.1)' : 'rgba(5, 150, 105, 0.1)',
            color: isRunning ? '#0D3273' : '#059669',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600
          }}>
            {isRunning ? (
              <>
                <Loader2 size={10} className="anim-spin" />
                <span>Running</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={10} />
                <span>Done</span>
              </>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-tertiary)' }}>
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </div>
      </div>

      {/* Expanded Content: Human readable arguments + Rich Markdown Output */}
      {isExpanded && (
        <div style={{ padding: '10px 12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Input parameters (Formatted, NO raw JSON) */}
          {tool.input && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Query & Parameters
              </div>
              <ToolArgumentsView toolName={tool.name} input={tool.input} />
            </div>
          )}

          {/* Rich Output result (Parsed Tavily sources & Markdown) */}
          {tool.output && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                Result
              </div>
              <ToolOutputView toolName={tool.name} output={tool.output} compact={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
