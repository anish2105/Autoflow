import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  Cpu,
  SlidersHorizontal,
  History,
  Shield,
  Crown,
  GitBranch,
} from 'lucide-react';
import { ChatSession, NavSection } from '../../types';
import { WorkflowDefinition } from '../../types/workflow';
import { useAuth } from '../../context/AuthContext';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeNavSection: NavSection;
  onSelectNavSection: (section: NavSection) => void;
  onOpenHistory: () => void;
  documentsCount?: number;
  toolsStats?: { enabled: number; total: number };
  onRequestUpgrade?: () => void;
  workflows?: WorkflowDefinition[];
  activeWorkflowId?: string | null;
  onSelectWorkflow?: (workflowId: string) => void;
  onNewWorkflow?: () => void;
  onDeleteWorkflow?: (id: string) => void;
  onOpenWorkflowsHistory?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
  activeNavSection,
  onSelectNavSection,
  onOpenHistory,
  documentsCount = 0,
  toolsStats = { enabled: 8, total: 8 },
  onRequestUpgrade,
  workflows = [],
  activeWorkflowId,
  onSelectWorkflow,
  onNewWorkflow,
  onDeleteWorkflow,
  onOpenWorkflowsHistory,
}) => {
  const { profile, user } = useAuth();
  // Show at most top 5 conversations as specified
  const topSessions = sessions.slice(0, 5);
  const hasMoreThan5 = sessions.length > 5;

  // Show at most top 5 workflows
  const topWorkflows = (workflows || []).slice(0, 5);
  const hasMoreThan5Workflows = (workflows || []).length > 5;

  return (
    <aside style={{
      width: isCollapsed ? '60px' : '260px',
      background: 'var(--color-canvas)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 20,
      flexShrink: 0
    }}>
      {/* 1. Header & New Chat Action */}
      <div style={{ padding: '14px 10px 10px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => {
            onNewChat();
            if (activeNavSection !== 'conversations') {
              onSelectNavSection('conversations');
            }
          }}
          className="pill-button-primary"
          style={{
            width: '100%',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '8px' : '8px 14px',
            fontSize: '0.82rem',
            whiteSpace: 'nowrap'
          }}
          title="New Conversation"
        >
          <Plus size={16} />
          {!isCollapsed && <span>New Conversation</span>}
        </button>
      </div>

      {/* 2. Scrollable Body: Navigation Sections */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {/* ============================================================== */}
        {/* SECTION 1: CONVERSATIONS */}
        {/* ============================================================== */}
        <div>
          {!isCollapsed ? (
            <div
              onClick={() => onSelectNavSection('conversations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                marginBottom: '4px',
                cursor: 'pointer',
                borderRadius: '6px'
              }}
            >
              <div style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: activeNavSection === 'conversations' ? '#0D3273' : 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <MessageSquare size={12} color={activeNavSection === 'conversations' ? '#0D3273' : 'currentColor'} />
                <span>Conversations</span>
              </div>
              <span style={{
                fontSize: '0.65rem',
                background: 'var(--color-surface-subtle)',
                color: 'var(--text-secondary)',
                padding: '1px 5px',
                borderRadius: '10px',
                fontWeight: 600
              }}>
                {sessions.length}
              </span>
            </div>
          ) : (
            <button
              onClick={() => onSelectNavSection('conversations')}
              style={{
                width: '100%',
                padding: '10px 0',
                display: 'flex',
                justifyContent: 'center',
                background: activeNavSection === 'conversations' ? 'rgba(13, 50, 115, 0.12)' : 'transparent',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '6px'
              }}
              title={`Conversations (${sessions.length})`}
            >
              <MessageSquare size={16} color={activeNavSection === 'conversations' ? '#0D3273' : 'var(--text-tertiary)'} />
            </button>
          )}

          {/* Conversations List (Max 5) */}
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {topSessions.map((session) => {
                const isActive = session.id === activeSessionId && activeNavSection === 'conversations';
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      if (activeNavSection !== 'conversations') {
                        onSelectNavSection('conversations');
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isActive ? 'var(--accent-user-bubble)' : 'transparent',
                      border: isActive ? '1px solid rgba(13, 50, 115, 0.15)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'var(--color-surface-subtle)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.background = 'transparent';
                    }}
                    title={session.title}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                      <MessageSquare
                        size={14}
                        color={isActive ? '#0D3273' : 'var(--text-tertiary)'}
                        style={{ flexShrink: 0 }}
                      />
                      <div style={{ overflow: 'hidden', flex: 1 }}>
                        <div style={{
                          fontSize: '0.8rem',
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#0D3273' : 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden'
                        }}>
                          {session.title || 'Untitled'}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-tertiary)' }}>
                          {session.messages.length} msgs • {session.createdAt}
                        </div>
                      </div>
                    </div>

                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-tertiary)',
                          cursor: 'pointer',
                          padding: '3px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.5,
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = '#DC2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.5';
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                        }}
                        title="Delete Chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* View History Button when > 5 conversations */}
              {hasMoreThan5 && (
                <button
                  onClick={onOpenHistory}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: '8px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: '#0D3273',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-subtle)';
                    e.currentTarget.style.borderColor = 'rgba(13, 50, 115, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface)';
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  }}
                  title="View all conversation history"
                >
                  <History size={13} />
                  <span>View history ({sessions.length})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '2px 0' }} />

        {/* ============================================================== */}
        {/* OTHER SECTIONS: Documents, Agent Builder, Tools */}
        {/* ============================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* SECTION 2: AGENT BUILDER STUDIO (Moved above Documents) */}
          <div>
            <div
              onClick={() => onSelectNavSection('agent-builder')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px 0' : '9px 12px',
                borderRadius: '8px',
                background: activeNavSection === 'agent-builder' ? 'var(--accent-user-bubble)' : 'transparent',
                border: activeNavSection === 'agent-builder' ? '1px solid rgba(13, 50, 115, 0.2)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (activeNavSection !== 'agent-builder') e.currentTarget.style.background = 'var(--color-surface-subtle)';
              }}
              onMouseLeave={(e) => {
                if (activeNavSection !== 'agent-builder') e.currentTarget.style.background = 'transparent';
              }}
              title="Agent Builder Studio (Visual Pipelines)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Cpu
                  size={16}
                  color={activeNavSection === 'agent-builder' ? '#0D3273' : 'var(--text-secondary)'}
                />
                {!isCollapsed && (
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: activeNavSection === 'agent-builder' ? 700 : 500,
                    color: activeNavSection === 'agent-builder' ? '#0D3273' : 'var(--text-primary)'
                  }}>
                    Agent Builder
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <span style={{
                  fontSize: '0.66rem',
                  background: activeNavSection === 'agent-builder' ? 'rgba(13, 50, 115, 0.15)' : 'var(--color-surface-subtle)',
                  color: activeNavSection === 'agent-builder' ? '#0D3273' : 'var(--text-secondary)',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  fontWeight: 600
                }}>
                  {workflows.length}
                </span>
              )}
            </div>

            {/* Workflows Sub-List (Max 5 + Show More) */}
            {!isCollapsed && activeNavSection === 'agent-builder' && (
              <div style={{ marginTop: '6px', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '3px', borderLeft: '2px solid rgba(13, 50, 115, 0.12)', paddingLeft: '8px' }}>
                {onNewWorkflow && (
                  <button
                    onClick={onNewWorkflow}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      background: 'rgba(13, 50, 115, 0.05)',
                      border: '1px dashed rgba(13, 50, 115, 0.25)',
                      color: '#0D3273',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginBottom: '3px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(13, 50, 115, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(13, 50, 115, 0.05)';
                    }}
                  >
                    <Plus size={12} />
                    <span>New Workflow</span>
                  </button>
                )}

                {topWorkflows.map((wf) => {
                  const isActive = wf.id === activeWorkflowId;
                  const nodeCount = wf.nodes?.length || 0;
                  return (
                    <div
                      key={wf.id}
                      onClick={() => onSelectWorkflow && onSelectWorkflow(wf.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        background: isActive ? 'var(--accent-user-bubble)' : 'transparent',
                        border: isActive ? '1px solid rgba(13, 50, 115, 0.2)' : '1px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'var(--color-surface-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.background = 'transparent';
                      }}
                      title={wf.name}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
                        <GitBranch
                          size={13}
                          color={isActive ? '#0D3273' : 'var(--text-tertiary)'}
                          style={{ flexShrink: 0 }}
                        />
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{
                            fontSize: '0.78rem',
                            fontWeight: isActive ? 600 : 400,
                            color: isActive ? '#0D3273' : 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden'
                          }}>
                            {wf.name || 'Untitled Workflow'}
                          </div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--text-tertiary)' }}>
                            {nodeCount} nodes
                          </div>
                        </div>
                      </div>

                      {onDeleteWorkflow && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteWorkflow(wf.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            padding: '2px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.5,
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.color = '#DC2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '0.5';
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                          }}
                          title="Delete Workflow"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Show more workflows button when > 5 */}
                {hasMoreThan5Workflows && onOpenWorkflowsHistory && (
                  <button
                    onClick={onOpenWorkflowsHistory}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: '#0D3273',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '3px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface-subtle)';
                      e.currentTarget.style.borderColor = 'rgba(13, 50, 115, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--color-surface)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }}
                    title="View all saved workflows"
                  >
                    <History size={12} />
                    <span>Show more workflows ({workflows.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* SECTION 3: DOCUMENTS */}
          <div
            onClick={() => onSelectNavSection('documents')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '10px 0' : '9px 12px',
              borderRadius: '8px',
              background: activeNavSection === 'documents' ? 'var(--accent-user-bubble)' : 'transparent',
              border: activeNavSection === 'documents' ? '1px solid rgba(13, 50, 115, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeNavSection !== 'documents') e.currentTarget.style.background = 'var(--color-surface-subtle)';
            }}
            onMouseLeave={(e) => {
              if (activeNavSection !== 'documents') e.currentTarget.style.background = 'transparent';
            }}
            title="Documents (PDF, Excel, Images, DOCX)"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText
                size={16}
                color={activeNavSection === 'documents' ? '#0D3273' : 'var(--text-secondary)'}
              />
              {!isCollapsed && (
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: activeNavSection === 'documents' ? 700 : 500,
                  color: activeNavSection === 'documents' ? '#0D3273' : 'var(--text-primary)'
                }}>
                  Documents
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span style={{
                fontSize: '0.66rem',
                background: activeNavSection === 'documents' ? 'rgba(13, 50, 115, 0.15)' : 'var(--color-surface-subtle)',
                color: activeNavSection === 'documents' ? '#0D3273' : 'var(--text-secondary)',
                padding: '1px 6px',
                borderRadius: '8px',
                fontWeight: 600
              }}>
                {documentsCount}
              </span>
            )}
          </div>

          {/* SECTION 4: TOOLS */}
          <div
            onClick={() => onSelectNavSection('tools')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '10px 0' : '9px 12px',
              borderRadius: '8px',
              background: activeNavSection === 'tools' ? 'var(--accent-user-bubble)' : 'transparent',
              border: activeNavSection === 'tools' ? '1px solid rgba(13, 50, 115, 0.2)' : '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (activeNavSection !== 'tools') e.currentTarget.style.background = 'var(--color-surface-subtle)';
            }}
            onMouseLeave={(e) => {
              if (activeNavSection !== 'tools') e.currentTarget.style.background = 'transparent';
            }}
            title="Tools & Capability Sliders"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SlidersHorizontal
                size={16}
                color={activeNavSection === 'tools' ? '#0D3273' : 'var(--text-secondary)'}
              />
              {!isCollapsed && (
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: activeNavSection === 'tools' ? 700 : 500,
                  color: activeNavSection === 'tools' ? '#0D3273' : 'var(--text-primary)'
                }}>
                  Tools
                </span>
              )}
            </div>
            {!isCollapsed && (
              <span style={{
                fontSize: '0.66rem',
                background: activeNavSection === 'tools' ? 'rgba(13, 50, 115, 0.15)' : 'var(--color-surface-subtle)',
                color: activeNavSection === 'tools' ? '#0D3273' : 'var(--text-secondary)',
                padding: '1px 6px',
                borderRadius: '8px',
                fontWeight: 600
              }}>
                {toolsStats.enabled}/{toolsStats.total}
              </span>
            )}
          </div>

          {/* SECTION 5: ACE ADMIN DASHBOARD (EXCLUSIVELY VISIBLE TO ACE USERS) */}
          {profile?.tier === 'ace' && (
            <div
              onClick={() => onSelectNavSection('admin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '10px 0' : '9px 12px',
                borderRadius: '8px',
                background: activeNavSection === 'admin' ? '#0D3273' : 'transparent',
                border: activeNavSection === 'admin' ? '1px solid #0D3273' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                marginTop: '4px'
              }}
              onMouseEnter={(e) => {
                if (activeNavSection !== 'admin') e.currentTarget.style.background = 'rgba(13, 50, 115, 0.08)';
              }}
              onMouseLeave={(e) => {
                if (activeNavSection !== 'admin') e.currentTarget.style.background = 'transparent';
              }}
              title="Ace Admin Dashboard (Super Admin & User Quota Management)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Shield
                  size={16}
                  color={activeNavSection === 'admin' ? '#FFFFFF' : '#0D3273'}
                />
                {!isCollapsed && (
                  <span style={{
                    fontSize: '0.82rem',
                    fontWeight: activeNavSection === 'admin' ? 800 : 700,
                    color: activeNavSection === 'admin' ? '#FFFFFF' : '#0D3273'
                  }}>
                    Ace Dashboard
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <span style={{
                  fontSize: '0.62rem',
                  background: activeNavSection === 'admin' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(13, 50, 115, 0.1)',
                  color: activeNavSection === 'admin' ? '#FFFFFF' : '#0D3273',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  letterSpacing: '0.04em'
                }}>
                  OWNER
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Quota Meter for Jack & Pleasant users */}
      {!isCollapsed && (
        <div style={{
          margin: '4px 10px 8px',
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'var(--color-surface-subtle)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem' }}>
                {profile?.tier === 'ace' ? '🛡️' : profile?.tier === 'king' ? '👑' : profile?.tier === 'jack' ? '⚡' : '🃏'}
              </span>
              <span style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {profile?.tier || 'Pleasant'} Tier
              </span>
            </div>
            {(profile?.tier === 'jack' || profile?.tier === 'pleasant') && onRequestUpgrade && (
              <button
                onClick={onRequestUpgrade}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563EB',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                Upgrade ↑
              </button>
            )}
          </div>

          {/* Messages Quota Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
              <span>Chat Messages:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {profile?.tier === 'king' || profile?.tier === 'ace' || profile?.max_messages === -1
                  ? `${profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0} (Unlimited)`
                  : `${profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0} / ${profile?.max_messages ?? profile?.custom_msg_limit ?? (profile?.tier === 'jack' ? 25 : 5)}`}
              </strong>
            </div>
            {profile?.tier !== 'king' && profile?.tier !== 'ace' && profile?.max_messages !== -1 && (
              <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (((profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0) / (profile?.max_messages ?? profile?.custom_msg_limit ?? (profile?.tier === 'jack' ? 25 : 5))) * 100))}%`,
                  height: '100%',
                  background: (profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0) >= (profile?.max_messages ?? profile?.custom_msg_limit ?? (profile?.tier === 'jack' ? 25 : 5)) ? '#DC2626' : '#2563EB',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
          </div>

          {/* Documents Quota Progress */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              <span>Documents:</span>
              <strong style={{ color: 'var(--text-primary)' }}>
                {profile?.tier === 'ace' || profile?.max_documents === -1
                  ? `${profile?.consumed_documents ?? profile?.usage?.documents_uploaded ?? documentsCount} (Unlimited)`
                  : `${profile?.consumed_documents ?? profile?.usage?.documents_uploaded ?? documentsCount} / ${profile?.max_documents ?? profile?.custom_doc_limit ?? (profile?.tier === 'king' ? 15 : profile?.tier === 'jack' ? 3 : 1)}`}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 3. Collapse Toggle Footer */}
      <div style={{
        padding: '10px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between'
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
            <Sparkles size={11} color="#0D3273" />
            <span>AutoFlow Multi-Agent</span>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="circle-button"
          style={{ width: '28px', height: '28px' }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>
    </aside>
  );
};
