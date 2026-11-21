import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Globe,
  FileCode,
  Calculator,
  Clock,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  BookOpen,
  FileEdit,
  Check,
  X,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { ToolConfigItem } from '../../types';

interface ToolsPanelProps {
  tools: ToolConfigItem[];
  onToggleTool: (toolId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  tools,
  onToggleTool,
  onEnableAll,
  onDisableAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const enabledCount = tools.filter((t) => t.enabled).length;
  const disabledCount = tools.length - enabledCount;

  const categories = ['all', ...Array.from(new Set(tools.map((t) => t.category)))];

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getToolIcon = (iconName: string, enabled: boolean) => {
    const color = enabled ? '#0D3273' : 'var(--text-tertiary)';
    switch (iconName) {
      case 'Globe':
        return <Globe size={22} color={enabled ? '#2563EB' : color} />;
      case 'FileCode':
        return <FileCode size={22} color={enabled ? '#EA580C' : color} />;
      case 'Calculator':
        return <Calculator size={22} color={enabled ? '#16A34A' : color} />;
      case 'Clock':
        return <Clock size={22} color={enabled ? '#0D9488' : color} />;
      case 'ImageIcon':
        return <ImageIcon size={22} color={enabled ? '#7C3AED' : color} />;
      case 'FileText':
        return <FileText size={22} color={enabled ? '#DC2626' : color} />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet size={22} color={enabled ? '#16A34A' : color} />;
      case 'FileEdit':
        return <FileEdit size={22} color={enabled ? '#2563EB' : color} />;
      case 'BookOpen':
        return <BookOpen size={22} color={enabled ? '#2563EB' : color} />;
      default:
        return <Wrench size={22} color={color} />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-canvas)',
      overflowY: 'auto',
      padding: '24px 32px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '14px'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <SlidersHorizontal size={24} color="#0D3273" />
            Tools & Capabilities Manager
          </h2>
          <p style={{
            fontSize: '0.84rem',
            color: 'var(--text-secondary)',
            margin: '4px 0 0 0'
          }}>
            Toggle tools on or off with the slider. If set to <strong>No</strong>, the chatbot will not bind or invoke that tool.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onEnableAll}
            className="pill-button-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            title="Enable all tools"
          >
            <CheckCircle2 size={13} style={{ marginRight: '5px', color: '#16A34A' }} />
            Enable All
          </button>
          <button
            onClick={onDisableAll}
            className="pill-button-secondary"
            style={{ fontSize: '0.78rem', padding: '6px 12px' }}
            title="Disable all tools (direct LLM only)"
          >
            <XCircle size={13} style={{ marginRight: '5px', color: '#DC2626' }} />
            Disable All
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            Total Tools:
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {tools.length}
          </span>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(22, 163, 74, 0.25)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>
            Active (Yes):
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#15803D' }}>
            {enabledCount}
          </span>
        </div>

        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(220, 38, 38, 0.2)',
          borderRadius: '12px',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 600 }}>
            Disabled (No):
          </span>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#B91C1C' }}>
            {disabledCount}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '18px',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--color-surface)',
          borderRadius: '10px',
          padding: '8px 14px',
          border: '1px solid var(--border-subtle)',
          width: '280px',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <Search size={15} color="var(--text-tertiary)" />
          <input
            type="text"
            placeholder="Search tools by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.84rem',
              color: 'var(--text-primary)',
              width: '100%'
            }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: selectedCategory === cat ? '1px solid #0D3273' : '1px solid var(--border-subtle)',
                background: selectedCategory === cat ? '#0D3273' : 'var(--color-surface)',
                color: selectedCategory === cat ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tools Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {filteredTools.map((tool) => {
          return (
            <div
              key={tool.id}
              style={{
                background: 'var(--color-surface)',
                border: tool.enabled ? '1px solid var(--border-subtle)' : '1px dashed rgba(100, 116, 139, 0.3)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-subtle)',
                transition: 'all 0.2s ease',
                opacity: tool.enabled ? 1 : 0.75,
              }}
            >
              <div>
                {/* Top Row: Icon, Title & Yes/No Slider */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      padding: '10px',
                      borderRadius: '12px',
                      background: tool.enabled ? 'rgba(13, 50, 115, 0.08)' : 'var(--color-surface-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s'
                    }}>
                      {getToolIcon(tool.icon, tool.enabled)}
                    </div>
                    <div>
                      <div style={{
                        fontSize: '0.94rem',
                        fontWeight: 700,
                        color: tool.enabled ? 'var(--text-primary)' : 'var(--text-secondary)'
                      }}>
                        {tool.name}
                      </div>
                      <code style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-tertiary)',
                        background: 'var(--color-canvas)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {tool.id}
                      </code>
                    </div>
                  </div>

                  {/* Yes / No Slider Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: tool.enabled ? '#15803D' : '#64748B',
                      minWidth: '24px',
                      textAlign: 'right'
                    }}>
                      {tool.enabled ? 'Yes' : 'No'}
                    </span>

                    {/* Interactive Slider Switch */}
                    <div
                      onClick={() => onToggleTool(tool.id)}
                      style={{
                        width: '50px',
                        height: '26px',
                        background: tool.enabled
                          ? 'linear-gradient(135deg, #0D3273 0%, #1D4ED8 100%)'
                          : '#CBD5E1',
                        borderRadius: '14px',
                        padding: '2px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'background 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: tool.enabled ? '0 2px 4px rgba(13, 50, 115, 0.25)' : 'none'
                      }}
                      title={`Toggle ${tool.name} ${tool.enabled ? 'Off (No)' : 'On (Yes)'}`}
                    >
                      <div
                        style={{
                          width: '22px',
                          height: '22px',
                          background: '#FFFFFF',
                          borderRadius: '50%',
                          transform: tool.enabled ? 'translateX(24px)' : 'translateX(0px)',
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        {tool.enabled ? (
                          <Check size={12} color="#0D3273" strokeWidth={3} />
                        ) : (
                          <X size={12} color="#64748B" strokeWidth={3} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p style={{
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  margin: '10px 0 14px 0'
                }}>
                  {tool.description}
                </p>
              </div>

              {/* Card Footer: Category tag & Status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-subtle)',
                fontSize: '0.72rem'
              }}>
                <span style={{
                  background: 'var(--color-surface-subtle)',
                  color: 'var(--text-secondary)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  textTransform: 'capitalize'
                }}>
                  {tool.category}
                </span>

                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 600,
                  color: tool.enabled ? '#15803D' : '#64748B'
                }}>
                  <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: tool.enabled ? '#16A34A' : '#94A3B8'
                  }} />
                  {tool.enabled ? 'Enabled in Chatbot' : 'Disabled'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
