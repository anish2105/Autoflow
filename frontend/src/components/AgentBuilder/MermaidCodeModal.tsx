import React, { useState } from 'react';
import { X, Copy, Check, Code, GitFork } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

interface MermaidCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export function generateMermaidCode(workflowName: string, nodes: WorkflowNode[], edges: WorkflowEdge[]): string {
  const sanitize = (str: string) => str.replace(/["\n\r]/g, ' ').trim();

  let code = `%% AutoFlow Visual Pipeline: ${sanitize(workflowName)} %%\n`;
  code += `graph LR\n`;

  // Nodes definition
  nodes.forEach((node) => {
    const title = sanitize(node.title);
    let label = title;
    if (node.type === 'agent') {
      label = `${title}<br/>(Validator 80% Gate)`;
    } else if (node.type === 'rag') {
      const count = (node.config.selected_file_ids || []).length;
      label = `${title}<br/>(${count} doc${count === 1 ? '' : 's'})`;
    } else if (node.type === 'web_scrape') {
      const count = (node.config.urls || []).length;
      label = `${title}<br/>(${count} URL${count === 1 ? '' : 's'})`;
    }

    // Node style / shape
    if (node.type === 'agent') {
      code += `  ${node.id}{{"🤖 ${label}"}}\n`;
    } else if (node.type === 'input') {
      code += `  ${node.id}(["💬 ${label}"])\n`;
    } else if (node.type === 'viewer') {
      code += `  ${node.id}[/"👁️ ${label}"/]\n`;
    } else if (node.type.startsWith('export_')) {
      code += `  ${node.id}[/"📄 ${label}"/]\n`;
    } else {
      code += `  ${node.id}["⚙️ ${label}"]\n`;
    }
  });

  code += `\n`;

  // Edges
  if (edges.length === 0) {
    code += `  %% No connections wired yet\n`;
  } else {
    edges.forEach((edge) => {
      code += `  ${edge.fromNodeId} --> ${edge.toNodeId}\n`;
    });
  }

  // Styling
  code += `\n`;
  code += `  classDef agentStyle fill:#0D3273,stroke:#0B2555,stroke-width:2px,color:#fff;\n`;
  code += `  classDef toolStyle fill:#EFF6FF,stroke:#2563EB,stroke-width:1.5px,color:#1E3A8A;\n`;
  code += `  classDef exportStyle fill:#F0FDF4,stroke:#16A34A,stroke-width:1.5px,color:#14532D;\n`;
  code += `  classDef viewerStyle fill:#EEF2FF,stroke:#4F46E5,stroke-width:2px,color:#312E81;\n`;

  nodes.forEach((n) => {
    if (n.type === 'agent') {
      code += `  class ${n.id} agentStyle;\n`;
    } else if (n.type === 'viewer') {
      code += `  class ${n.id} viewerStyle;\n`;
    } else if (n.type.startsWith('export_')) {
      code += `  class ${n.id} exportStyle;\n`;
    } else {
      code += `  class ${n.id} toolStyle;\n`;
    }
  });

  return code;
}

export const MermaidCodeModal: React.FC<MermaidCodeModalProps> = ({
  isOpen,
  onClose,
  workflowName,
  nodes,
  edges,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const mermaidString = generateMermaidCode(workflowName, nodes, edges);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '650px',
          maxHeight: '85vh',
          background: 'var(--color-surface-white)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(13, 50, 115, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0D3273',
              }}
            >
              <Code size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Mermaid Diagram Code
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                Declarative pipeline serialization for {workflowName}
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
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 12px 0', lineHeight: 1.5 }}>
            This Mermaid code represents your visual agent graph. You can copy it directly into Markdown documentation, GitHub READMEs, or diagram tools.
          </p>

          <pre
            style={{
              margin: 0,
              padding: '16px',
              background: '#0F172A',
              color: '#38BDF8',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              lineHeight: 1.5,
              overflowX: 'auto',
              maxHeight: '380px',
            }}
          >
            <code>{mermaidString}</code>
          </pre>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'var(--color-surface-subtle)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--color-surface-white)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="pill-button-primary"
            style={{
              padding: '7px 16px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Mermaid Code'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

