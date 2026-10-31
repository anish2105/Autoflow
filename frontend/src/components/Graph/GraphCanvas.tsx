import React from 'react';
import { Play, Brain, Wrench, CheckCircle2, ArrowRight, CornerDownLeft } from 'lucide-react';
import { GraphSchema } from '../../types';

interface GraphCanvasProps {
  schema: GraphSchema | null;
  activeNode: string | null;
  activeTool: string | null;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ schema, activeNode, activeTool }) => {
  const isNodeActive = (nodeId: string) => activeNode === nodeId;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: '100%',
      justifyContent: 'space-between',
    }}>
      {/* Node Workflow Visual Area */}
      <div style={{
        position: 'relative',
        background: 'var(--color-surface-white)',
        border: '1px solid var(--border-strong)',
        borderRadius: '16px',
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '320px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)'
      }}>
        {/* Subtle dot pattern */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#D5CEBF 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          opacity: 0.35,
          pointerEvents: 'none',
          borderRadius: '16px'
        }} />

        {/* 1. START NODE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          borderRadius: '9999px',
          background: isNodeActive('__start__') ? 'rgba(5, 150, 105, 0.15)' : 'var(--color-surface-subtle)',
          border: isNodeActive('__start__') ? '2px solid #059669' : '1px solid var(--border-subtle)',
          transition: 'all 0.3s ease',
          zIndex: 2,
          minWidth: '200px',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Play size={12} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#065F46' }}>User Input</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>User Query Ingest</div>
          </div>
        </div>

        {/* Arrow down */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#0D3273' }}>
          <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
        </div>

        {/* 2. AGENT NODE (GEMINI) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 20px',
            borderRadius: '14px',
            background: isNodeActive('agent') ? '#EEF2FF' : 'var(--color-surface-subtle)',
            border: isNodeActive('agent') ? '2px solid #0D3273' : '1px solid var(--border-subtle)',
            boxShadow: isNodeActive('agent') ? '0 4px 14px rgba(13, 50, 115, 0.15)' : 'none',
            transition: 'all 0.3s ease',
            zIndex: 2,
            minWidth: '240px'
          }}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#0D3273',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Brain size={17} color="#ffffff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AutoFlow Agent
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '9999px',
                background: '#E2E8F7',
                color: '#0D3273'
              }}>
                LLM Core
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              Gemini Reasoning & Tool Dispatcher
            </div>
          </div>
        </div>

        {/* Branch Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          width: '100%',
          maxWidth: '500px',
          marginTop: '4px'
        }}>
          {/* Tools Loop Branch */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.68rem', color: '#B83280', fontWeight: 600 }}>
              ⚡ tool_calls
            </div>

            {/* TOOLS NODE */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: isNodeActive('tools') ? '#FDF2F8' : 'var(--color-surface-subtle)',
                border: isNodeActive('tools') ? '2px solid #D946EF' : '1px solid var(--border-subtle)',
                transition: 'all 0.3s ease',
                width: '100%'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#D946EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Wrench size={14} color="#ffffff" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>tools_node</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {activeTool ? `Executing: ${activeTool}` : 'Executes tool'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              <CornerDownLeft size={11} color="#B83280" />
              <span>Loops back</span>
            </div>
          </div>

          {/* End Branch */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px'
          }}>
            <div style={{ fontSize: '0.68rem', color: '#0891B2', fontWeight: 600 }}>
              ✓ final answer
            </div>

            {/* END NODE */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '12px',
              background: isNodeActive('__end__') ? '#ECFEFF' : 'var(--color-surface-subtle)',
              border: isNodeActive('__end__') ? '2px solid #0891B2' : '1px solid var(--border-subtle)',
              transition: 'all 0.3s ease',
              width: '100%'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: '#0891B2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={14} color="#ffffff" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Final Output</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Stream Output</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Tools Chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Registered LangGraph Tools ({schema?.tools?.length || 3})
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
          {schema?.tools?.map((tool, idx) => (
            <div
              key={idx}
              className="editorial-card"
              style={{
                padding: '6px 8px',
                background: activeTool === tool.name ? '#FDF2F8' : 'var(--color-surface-white)',
                border: activeTool === tool.name ? '1.5px solid #D946EF' : '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {tool.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tool.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
