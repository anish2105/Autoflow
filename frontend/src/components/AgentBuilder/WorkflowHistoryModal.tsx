import React, { useState } from 'react';
import {
  X,
  Search,
  Cpu,
  Trash2,
  Calendar,
  Clock,
  ChevronRight,
  Plus,
  GitBranch,
  Layers,
  Copy,
} from 'lucide-react';
import { WorkflowDefinition } from '../../types/workflow';

interface WorkflowHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflows: WorkflowDefinition[];
  activeWorkflowId: string | null;
  onSelectWorkflow: (workflow: WorkflowDefinition) => void;
  onDeleteWorkflow: (id: string) => void;
  onDuplicateWorkflow?: (workflow: WorkflowDefinition) => void;
  onNewWorkflow: () => void;
}

export const WorkflowHistoryModal: React.FC<WorkflowHistoryModalProps> = ({
  isOpen,
  onClose,
  workflows,
  activeWorkflowId,
  onSelectWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow,
  onNewWorkflow,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredWorkflows = workflows.filter((w) => {
    const titleMatch = (w.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (w.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || descMatch;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '82vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Cpu size={20} color="#0D3273" />
              All Saved Workflows
            </h3>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
              }}
            >
              Browse, manage, and load your custom agent workflows ({workflows.length} total)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => {
                onNewWorkflow();
                onClose();
              }}
              className="pill-button-primary"
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} />
              <span>New Workflow</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-tertiary)',
              }}
            />
            <input
              type="text"
              placeholder="Search workflows by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Workflows List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {filteredWorkflows.length === 0 ? (
            <div
              style={{
                padding: '36px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              <Cpu size={36} color="var(--text-tertiary)" style={{ margin: '0 auto 12px auto' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                {searchQuery ? 'No workflows match your search' : 'No saved workflows yet'}
              </p>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                {searchQuery
                  ? 'Try searching with a different term'
                  : 'Assemble your first agent pipeline on the canvas and click Save'}
              </p>
            </div>
          ) : (
            filteredWorkflows.map((wf) => {
              const isActive = wf.id === activeWorkflowId;
              const nodeCount = wf.nodes?.length || 0;
              const edgeCount = wf.edges?.length || 0;

              return (
                <div
                  key={wf.id}
                  onClick={() => {
                    onSelectWorkflow(wf);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isActive ? 'var(--accent-user-bubble)' : 'var(--color-surface)',
                    border: isActive
                      ? '1px solid rgba(13, 50, 115, 0.25)'
                      : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--color-surface-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'var(--color-surface)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: isActive ? '#0D3273' : 'rgba(13, 50, 115, 0.08)',
                        color: isActive ? '#FFFFFF' : '#0D3273',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <GitBranch size={16} />
                    </div>

                    <div style={{ overflow: 'hidden', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: isActive ? 700 : 600,
                            color: isActive ? '#0D3273' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}
                        >
                          {wf.name}
                        </span>
                        {isActive && (
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              background: 'rgba(13, 50, 115, 0.12)',
                              color: '#0D3273',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginTop: '3px',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Layers size={12} />
                          {nodeCount} nodes • {edgeCount} connections
                        </span>
                        {wf.updated_at && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {new Date(wf.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onDuplicateWorkflow && (
                      <button
                        onClick={() => onDuplicateWorkflow(wf)}
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
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#0D3273')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        title="Duplicate Workflow"
                      >
                        <Copy size={14} />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteWorkflow(wf.id)}
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
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      title="Delete Workflow"
                    >
                      <Trash2 size={14} />
                    </button>

                    <ChevronRight size={16} color="var(--text-tertiary)" style={{ marginLeft: '4px' }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

