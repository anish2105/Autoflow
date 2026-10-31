import React from 'react';
import {
  Cpu,
  Sparkles,
  GitBranch,
  Layers,
  Wrench,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  Compass,
  Boxes,
} from 'lucide-react';

export const AgentBuilderPanel: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-canvas)',
      overflowY: 'auto',
      padding: '28px 36px'
    }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Cpu size={26} color="#0D3273" />
              Agent Builder Studio
            </h2>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#D97706',
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              <Clock size={11} />
              Work in Progress
            </span>
          </div>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            margin: 0,
            maxWidth: '680px'
          }}>
            Visually design, wire, and deploy specialized multi-agent graph pipelines with custom LLM backbones, custom tools, and automated validation gates.
          </p>
        </div>
      </div>

      {/* Hero Visual Mockup Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(13, 50, 115, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
        border: '1px solid rgba(13, 50, 115, 0.15)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: 'var(--shadow-subtle)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(13, 50, 115, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '600px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#0D3273',
            fontSize: '0.76rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '10px'
          }}>
            <Sparkles size={14} />
            Next-Gen Architecture
          </div>
          <h3 style={{
            fontSize: '1.3rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: '0 0 10px 0'
          }}>
            Dynamic Multi-Agent Graph Composer
          </h3>
          <p style={{
            fontSize: '0.86rem',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
            margin: '0 0 20px 0'
          }}>
            AutoFlow V2 will empower you to construct stateful LangGraph agents directly from the browser. Wire conditional edges, bind custom APIs as tools, and specify iterative validator loops without writing Python code.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <GitBranch size={14} color="#0D3273" />
              Visual Node Wiring
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <Layers size={14} color="#14B8A6" />
              Multi-Model Routing
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              <ShieldCheck size={14} color="#F59E0B" />
              Automated Quality Gates
            </div>
          </div>
        </div>
      </div>

      {/* Visual Canvas Mockup Preview */}
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          margin: '0 0 14px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Boxes size={16} color="#0D3273" />
          Interactive Canvas Preview (Under Construction)
        </h4>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          {/* Mock Node Diagram */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {/* Start Node */}
            <div style={{
              padding: '12px 18px',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              textAlign: 'center',
              minWidth: '120px'
            }}>
              <Zap size={18} color="#10B981" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#047857' }}>User Input</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Entry Point</div>
            </div>

            <ArrowRight size={18} color="var(--text-tertiary)" />

            {/* Decision Agent */}
            <div style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(13, 50, 115, 0.08)',
              border: '1px solid rgba(13, 50, 115, 0.25)',
              textAlign: 'center',
              minWidth: '150px'
            }}>
              <Cpu size={20} color="#0D3273" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0D3273' }}>Decision Agent</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Gemini LLM</div>
            </div>

            <ArrowRight size={18} color="var(--text-tertiary)" />

            {/* Tools Node */}
            <div style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              textAlign: 'center',
              minWidth: '150px'
            }}>
              <Wrench size={20} color="#2563EB" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563EB' }}>Parallel Tools</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Firecrawl + Tavily</div>
            </div>

            <ArrowRight size={18} color="var(--text-tertiary)" />

            {/* Validator Node */}
            <div style={{
              padding: '14px 20px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              textAlign: 'center',
              minWidth: '150px'
            }}>
              <ShieldCheck size={20} color="#D97706" style={{ margin: '0 auto 4px auto' }} />
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#D97706' }}>Completeness Gate</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Verification & Loop</div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Roadmap Grid */}
      <h4 style={{
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        margin: '0 0 14px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Compass size={16} color="#0D3273" />
        Upcoming Builder Features
      </h4>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(13, 50, 115, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <GitBranch size={18} color="#0D3273" />
          </div>
          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Custom Graph Topologies
          </h5>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Create hierarchical agents, supervisor routing, and circular reflection loops customized to your enterprise workflows.
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(20, 184, 166, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <Wrench size={18} color="#14B8A6" />
          </div>
          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Zero-Code Tool Integration
          </h5>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Plug in REST APIs, OpenAPI specs, and MCP servers directly as interactive agent tools with automated JSON schema conversion.
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px'
          }}>
            <ShieldCheck size={18} color="#F59E0B" />
          </div>
          <h5 style={{ margin: '0 0 6px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Guardrails & Human Gates
          </h5>
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Configure approval checkpoints before executing sensitive tools, email dispatch, or persistent database updates.
          </p>
        </div>
      </div>
    </div>
  );
};
