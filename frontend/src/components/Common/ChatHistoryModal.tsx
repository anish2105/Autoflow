import React, { useState } from 'react';
import { X, Search, MessageSquare, Trash2, Calendar, Clock, ChevronRight } from 'lucide-react';
import { ChatSession } from '../../types';

interface ChatHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export const ChatHistoryModal: React.FC<ChatHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredSessions = sessions.filter(session => {
    const titleMatch = (session.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = session.messages.some(m =>
      (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    return titleMatch || contentMatch;
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '640px',
        maxHeight: '80vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <MessageSquare size={18} color="#0D3273" />
              Conversation History
            </h3>
            <p style={{
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              margin: '3px 0 0 0'
            }}>
              Browse and resume all your past conversations ({sessions.length} total)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-surface-subtle)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-tertiary)';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--color-surface-subtle)',
            borderRadius: '10px',
            padding: '8px 12px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={15} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search conversations by title or message content..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.84rem',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {filteredSessions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-tertiary)',
              fontSize: '0.85rem'
            }}>
              No conversations found matching "{searchQuery}"
            </div>
          ) : (
            filteredSessions.map(session => {
              const isActive = session.id === activeSessionId;
              const lastMsg = session.messages[session.messages.length - 1];
              const snippet = lastMsg ? (lastMsg.content.slice(0, 110) + (lastMsg.content.length > 110 ? '...' : '')) : 'No messages yet';

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose();
                  }}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isActive ? 'var(--accent-user-bubble)' : 'var(--color-canvas)',
                    border: isActive ? '1px solid rgba(13, 50, 115, 0.2)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--color-surface-subtle)';
                      e.currentTarget.style.borderColor = 'rgba(13, 50, 115, 0.15)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--color-canvas)';
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    }
                  }}
                >
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '0.88rem',
                        fontWeight: isActive ? 700 : 600,
                        color: isActive ? '#0D3273' : 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {session.title || 'Untitled Conversation'}
                      </span>
                      {isActive && (
                        <span style={{
                          fontSize: '0.66rem',
                          background: '#0D3273',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontWeight: 600
                        }}>
                          Current
                        </span>
                      )}
                    </div>

                    <div style={{
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '6px'
                    }}>
                      {snippet}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={11} />
                        {session.createdAt}
                      </span>
                      <span>•</span>
                      <span>{session.messages.length} message{session.messages.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this conversation?')) {
                          onDeleteSession(session.id);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = '#DC2626';
                        e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-tertiary)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                      title="Delete conversation"
                    >
                      <Trash2 size={14} />
                    </button>
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--color-canvas)'
        }}>
          <button
            onClick={onClose}
            className="pill-button-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
