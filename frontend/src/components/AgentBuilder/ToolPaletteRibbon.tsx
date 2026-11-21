import React, { useState } from 'react';
import {
  BookOpen,
  Globe,
  FileCode,
  Calculator,
  Clock,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileEdit,
  MessageSquare,
  Sparkles,
  Eye,
} from 'lucide-react';
import { ToolPaletteItem, WorkflowCategory } from '../../types/workflow';

interface ToolPaletteRibbonProps {
  onAddNode: (type: ToolPaletteItem['type']) => void;
}

export const PALETTE_TOOLS: ToolPaletteItem[] = [
  {
    type: 'input',
    title: 'User Query',
    category: 'all',
    categoryLabel: 'Input',
    description: 'Runtime query input triggering workflow execution',
    icon: 'MessageSquare',
    color: '#0D3273',
    badge: 'Trigger'
  },
  {
    type: 'rag',
    title: 'Document Scope (RAG)',
    category: 'documents',
    categoryLabel: 'Documents & RAG',
    description: 'Binds selected library documents or uploads to agent context',
    icon: 'BookOpen',
    color: '#2563EB',
    badge: 'Context'
  },
  {
    type: 'web_scrape',
    title: 'Web Scraper (Firecrawl)',
    category: 'search',
    categoryLabel: 'Search & Scrape',
    description: 'Pre-configures target URLs for markdown extraction',
    icon: 'FileCode',
    color: '#EA580C',
    badge: 'Scrape'
  },
  {
    type: 'web_search',
    title: 'Web Search (Tavily)',
    category: 'search',
    categoryLabel: 'Search & Scrape',
    description: 'Enables autonomous live web research & real-time grounding',
    icon: 'Globe',
    color: '#0284C7',
    badge: 'Search'
  },
  {
    type: 'calculate',
    title: 'Math Calculator',
    category: 'computation',
    categoryLabel: 'Computation',
    description: 'Deterministic arithmetic & algebraic computation engine',
    icon: 'Calculator',
    color: '#16A34A',
    badge: 'Compute'
  },
  {
    type: 'time',
    title: 'Date & Timezones',
    category: 'utility',
    categoryLabel: 'Utility',
    description: 'Exact timestamp, weekday, and global timezone information',
    icon: 'Clock',
    color: '#0D9488',
    badge: 'Utility'
  },
  {
    type: 'vision',
    title: 'Multimodal Vision',
    category: 'vision',
    categoryLabel: 'Vision',
    description: 'Image OCR and visual analysis engine',
    icon: 'ImageIcon',
    color: '#7C3AED',
    badge: 'Vision'
  },
  {
    type: 'viewer',
    title: 'Browse / Viewer',
    category: 'export',
    categoryLabel: 'Output & Viewer',
    description: 'Interactive on-screen result viewer with rich formatted layout, tables, and copy options',
    icon: 'Eye',
    color: '#4F46E5',
    badge: 'Viewer'
  },
  {
    type: 'export_docx',
    title: 'Word Document (.docx)',
    category: 'export',
    categoryLabel: 'Output & Viewer',
    description: 'Generates formatted Microsoft Word report with tables',
    icon: 'FileEdit',
    color: '#2563EB',
    badge: 'Docx'
  },
  {
    type: 'export_pdf',
    title: 'PDF Report (.pdf)',
    category: 'export',
    categoryLabel: 'Output & Viewer',
    description: 'Generates clean PDF document with styled tables',
    icon: 'FileText',
    color: '#DC2626',
    badge: 'PDF'
  },
  {
    type: 'export_excel',
    title: 'Excel (.xlsx)',
    category: 'export',
    categoryLabel: 'Output & Viewer',
    description: 'Generates clean formatted spreadsheet with bold headers',
    icon: 'FileSpreadsheet',
    color: '#16A34A',
    badge: 'Excel'
  },
  {
    type: 'export_txt',
    title: 'Plain Text (.txt)',
    category: 'export',
    categoryLabel: 'Output & Viewer',
    description: 'Dumps clean text transcript of generation',
    icon: 'FileText',
    color: '#64748B',
    badge: 'Text'
  }
];

export const ToolPaletteRibbon: React.FC<ToolPaletteRibbonProps> = ({ onAddNode }) => {
  const [selectedCategory, setSelectedCategory] = useState<WorkflowCategory>('all');

  const categories: { key: WorkflowCategory; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'documents', label: 'Documents & RAG' },
    { key: 'search', label: 'Search & Scrape' },
    { key: 'computation', label: 'Computation' },
    { key: 'utility', label: 'Utility' },
    { key: 'vision', label: 'Vision' },
    { key: 'export', label: 'Output & Viewer' },
  ];

  const filteredTools = PALETTE_TOOLS.filter(t => {
    if (selectedCategory === 'all') return true;
    return t.category === selectedCategory;
  });

  const renderIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen size={18} color={color} />;
      case 'Globe': return <Globe size={18} color={color} />;
      case 'FileCode': return <FileCode size={18} color={color} />;
      case 'Calculator': return <Calculator size={18} color={color} />;
      case 'Clock': return <Clock size={18} color={color} />;
      case 'ImageIcon': return <ImageIcon size={18} color={color} />;
      case 'FileText': return <FileText size={18} color={color} />;
      case 'FileSpreadsheet': return <FileSpreadsheet size={18} color={color} />;
      case 'FileEdit': return <FileEdit size={18} color={color} />;
      case 'Eye': return <Eye size={18} color={color} />;
      case 'MessageSquare': return <MessageSquare size={18} color={color} />;
      default: return <Sparkles size={18} color={color} />;
    }
  };

  return (
    <div style={{
      background: 'var(--color-surface-white)',
      borderBottom: '1px solid var(--border-subtle)',
      padding: '10px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
      userSelect: 'none'
    }}>
      {/* Category Pills (Alteryx Ribbon Tabs) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
        {categories.map(c => {
          const isActive = selectedCategory === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCategory(c.key)}
              style={{
                padding: '4px 14px',
                borderRadius: '9999px',
                fontSize: '0.78rem',
                fontWeight: isActive ? 700 : 500,
                background: isActive ? '#0D3273' : 'var(--color-surface-subtle)',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                border: isActive ? '1px solid #0D3273' : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Tools Row (Draggable / Click to Add Cards) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflowX: 'auto',
        padding: '4px 2px 6px 2px'
      }}>
        {filteredTools.map(tool => {
          return (
            <div
              key={tool.type}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('application/autoflow-tool', tool.type);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => onAddNode(tool.type)}
              title={`${tool.title}: ${tool.description}\nClick or drag onto canvas`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px 12px',
                minWidth: '100px',
                height: '68px',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--border-subtle)',
                borderRadius: '10px',
                cursor: 'grab',
                transition: 'all 0.15s ease',
                textAlign: 'center',
                position: 'relative'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = tool.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {tool.badge && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '5px',
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: tool.color,
                  background: `${tool.color}15`,
                  padding: '1px 4px',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}>
                  {tool.badge}
                </span>
              )}
              <div style={{ marginBottom: '4px' }}>
                {renderIcon(tool.icon, tool.color)}
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                maxWidth: '90px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {tool.title.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

