import React, { useState, useRef, useEffect } from 'react';
import { Menu, Activity, LogIn, LogOut, User as UserIcon, ChevronDown, Crown, Shield, Sparkles } from 'lucide-react';
import { ServerConfig, NavSection } from '../types';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  config: ServerConfig | null;
  activeNode: string | null;
  isStreaming: boolean;
  onToggleSidebar?: () => void;
  onShowLanding?: () => void;
  onRequestUpgrade?: () => void;
  onSelectNavSection?: (section: NavSection) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNode,
  isStreaming,
  onToggleSidebar,
  onShowLanding,
  onRequestUpgrade,
  onSelectNavSection,
}) => {
  const { user, profile, loading, signInWithGoogle, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <header style={{
      height: '56px',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--color-canvas)',
      zIndex: 40,
      position: 'relative'
    }}>
      {/* Left: Clean "AutoFlow" Title & Live Node Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <h1
          onClick={onShowLanding}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.35rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            cursor: onShowLanding ? 'pointer' : 'default',
            userSelect: 'none'
          }}
          title={onShowLanding ? 'Go to Introduction & Overview' : undefined}
        >
          AutoFlow
        </h1>

        {/* Live Graph Status Indicator */}
        {activeNode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '9999px',
            background: 'var(--color-surface-subtle)',
            border: '1px solid var(--border-subtle)',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'var(--text-secondary)'
          }}>
            <Activity size={12} color="#0D3273" />
            <span>State: <strong style={{ color: '#0D3273' }}>{activeNode}</strong></span>
          </div>
        )}
      </div>

      {/* Right Controls: Auth Profile & Sidebar Menu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Auth Profile Section */}
        {!loading && (
          user ? (
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--color-surface-white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '9999px',
                  padding: '3px 10px 3px 4px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                  transition: 'all 0.15s ease'
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={userName}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: '#0D3273',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 700
                  }}>
                    {userName[0]?.toUpperCase()}
                  </div>
                )}
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {userName}
                </span>

                {/* Tier Pill Badge */}
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '9999px',
                  background: profile?.tier === 'ace' ? '#0D3273' : profile?.tier === 'king' ? '#6D28D9' : profile?.tier === 'jack' ? '#2563EB' : '#059669',
                  color: '#FFFFFF',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  {profile?.tier === 'ace' ? '🛡️ Ace' : profile?.tier === 'king' ? '👑 King' : profile?.tier === 'jack' ? '⚡ Jack' : '🃏 Pleasant'}
                </span>

                <ChevronDown size={12} color="var(--text-secondary)" />
              </button>

              {/* Profile Dropdown Menu */}
              {dropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  width: '240px',
                  background: 'var(--color-surface-white)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  zIndex: 100
                }}>
                  <div style={{
                    padding: '6px 8px 10px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '2px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {userName}
                      </span>
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: profile?.tier === 'ace' ? 'rgba(13, 50, 115, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                        color: profile?.tier === 'ace' ? '#0D3273' : '#2563EB',
                        textTransform: 'uppercase'
                      }}>
                        {profile?.tier || 'Pleasant'}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {user.email}
                    </div>
                  </div>

                  {/* Quota Indicators */}
                  <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'var(--color-surface-subtle)',
                    fontSize: '0.72rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Chat messages:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {profile?.tier === 'king' || profile?.tier === 'ace' || profile?.max_messages === -1
                          ? 'Unlimited'
                          : `${profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0} / ${profile?.max_messages ?? profile?.custom_msg_limit ?? (profile?.tier === 'jack' ? 25 : 5)}`}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Documents:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {profile?.tier === 'ace' || profile?.max_documents === -1
                          ? 'Unlimited'
                          : `${profile?.consumed_documents ?? profile?.usage?.documents_uploaded ?? 0} / ${profile?.max_documents ?? profile?.custom_doc_limit ?? (profile?.tier === 'king' ? 15 : profile?.tier === 'jack' ? 3 : 1)}`}
                      </strong>
                    </div>
                  </div>

                  {/* Ace Admin Dashboard Shortcut (for Ace users) */}
                  {profile?.tier === 'ace' && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onSelectNavSection?.('admin');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#0D3273',
                        color: '#FFFFFF',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '2px'
                      }}
                    >
                      <Shield size={14} color="#FFFFFF" />
                      <span>Ace Admin Dashboard</span>
                    </button>
                  )}

                  {/* Upgrade Request Action (for Jack or Pleasant users) */}
                  {profile?.tier !== 'ace' && onRequestUpgrade && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onRequestUpgrade();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid rgba(109, 40, 217, 0.3)',
                        background: 'rgba(109, 40, 217, 0.06)',
                        color: '#6D28D9',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <Crown size={14} color="#6D28D9" />
                      <span>Request Tier Upgrade</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      setDropdownOpen(false);
                      await signOut();
                      onShowLanding?.();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#DC2626',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <LogOut size={14} color="#DC2626" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'var(--color-surface-white)',
                border: '1.5px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-surface-subtle)';
                e.currentTarget.style.borderColor = '#0D3273';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--color-surface-white)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )
        )}

        {/* Menu toggle */}
        <button
          onClick={onToggleSidebar}
          className="circle-button"
          style={{ width: '34px', height: '34px' }}
          title="Toggle Sidebar Menu"
        >
          <Menu size={16} color="var(--text-primary)" />
        </button>
      </div>
    </header>
  );
};
