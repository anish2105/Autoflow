import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Crown,
  Zap,
  Sliders,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Edit2,
  ChevronDown,
  Award,
  AlertTriangle,
  Mail,
  Calendar,
  Layers,
  FileText,
  MessageSquare,
  Lock
} from 'lucide-react';
import { AdminMetrics, AdminUserItem, UpgradeRequestItem, UserTier } from '../../types';
import {
  fetchAdminMetricsApi,
  fetchAdminUsersApi,
  updateUserTierApi,
  updateUserLimitsApi,
  fetchAdminUpgradeRequestsApi,
  reviewUpgradeRequestApi
} from '../../services/api';

export const AceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'requests'>('users');

  // Edit Quotas Modal
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [customDocLimit, setCustomDocLimit] = useState<string>('');
  const [customMsgLimit, setCustomMsgLimit] = useState<string>('');
  const [isSavingLimits, setIsSavingLimits] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [m, u, r] = await Promise.all([
        fetchAdminMetricsApi(),
        fetchAdminUsersApi(),
        fetchAdminUpgradeRequestsApi(),
      ]);
      setMetrics(m);
      setUsers(u);
      setUpgradeRequests(r);
    } catch (err: any) {
      console.error('Failed to load Ace Admin data:', err);
      setError(err?.message || 'Access denied or server error.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.email.toLowerCase().includes(query) ||
      u.id.toLowerCase().includes(query) ||
      u.name.toLowerCase().includes(query);

    const matchesTier =
      selectedTierFilter === 'all' || u.tier === selectedTierFilter;

    return matchesSearch && matchesTier;
  });

  const handleTierChange = async (userId: string, newTier: UserTier) => {
    try {
      await updateUserTierApi(userId, newTier);
      // Optimistic update
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, tier: newTier, tier_name: newTier.toUpperCase() } : u))
      );
      loadData();
    } catch (err: any) {
      alert(`Failed to update tier: ${err?.message || 'Server error'}`);
    }
  };

  const handleOpenEditLimits = (user: AdminUserItem) => {
    setEditingUser(user);
    setCustomDocLimit(user.custom_doc_limit !== null && user.custom_doc_limit !== undefined ? String(user.custom_doc_limit) : '');
    setCustomMsgLimit(user.custom_msg_limit !== null && user.custom_msg_limit !== undefined ? String(user.custom_msg_limit) : '');
  };

  const handleSaveCustomLimits = async () => {
    if (!editingUser) return;
    setIsSavingLimits(true);
    try {
      const docVal = customDocLimit.trim() === '' ? null : parseInt(customDocLimit, 10);
      const msgVal = customMsgLimit.trim() === '' ? null : parseInt(customMsgLimit, 10);

      await updateUserLimitsApi(editingUser.id, {
        custom_doc_limit: isNaN(docVal as any) ? null : docVal,
        custom_msg_limit: isNaN(msgVal as any) ? null : msgVal,
      });

      setEditingUser(null);
      loadData();
    } catch (err: any) {
      alert(`Failed to save custom limits: ${err?.message || 'Server error'}`);
    } finally {
      setIsSavingLimits(false);
    }
  };

  const handleReviewUpgrade = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      await reviewUpgradeRequestApi(requestId, status);
      loadData();
    } catch (err: any) {
      alert(`Failed to review upgrade request: ${err?.message || 'Server error'}`);
    }
  };

  const pendingRequestsCount = upgradeRequests.filter(r => r.status === 'pending').length;

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: 'var(--color-canvas)',
      padding: '24px 32px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
    }}>
      {/* 1. Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0D3273 0%, #1E40AF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(13, 50, 115, 0.25)',
          }}>
            <Shield size={22} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '1.28rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              Ace Super Admin Console
              <span style={{
                fontSize: '0.66rem',
                background: '#FEF3C7',
                color: '#92400E',
                border: '1px solid #FDE68A',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                Owner Mode
              </span>
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Manage four-tier user permissions, adjust custom quota allocations, and review King/Ace upgrades.
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'var(--color-surface-white)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: isLoading ? 'wait' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{
          padding: '14px 18px',
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '10px',
          color: '#991B1B',
          fontSize: '0.84rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
        }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '14px',
        marginBottom: '24px',
      }}>
        {/* Total Users */}
        <div style={{
          background: 'var(--color-surface-white)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Total Users
            </span>
            <Users size={16} color="#0D3273" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {metrics?.total_users ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Across all 4 active tiers
          </div>
        </div>

        {/* King Users */}
        <div style={{
          background: 'var(--color-surface-white)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              King Users
            </span>
            <Crown size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#D97706' }}>
            {metrics?.king_users ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            15 docs, Unlimited msgs
          </div>
        </div>

        {/* Jack Users */}
        <div style={{
          background: 'var(--color-surface-white)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Jack Users
            </span>
            <Zap size={16} color="#2563EB" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>
            {metrics?.jack_users ?? 0}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            3 docs, 25 msgs quota
          </div>
        </div>

        {/* Pending Upgrades */}
        <div style={{
          background: pendingRequestsCount > 0 ? '#FEF3C7' : 'var(--color-surface-white)',
          padding: '16px',
          borderRadius: '12px',
          border: `1px solid ${pendingRequestsCount > 0 ? '#FDE68A' : 'var(--border-subtle)'}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: pendingRequestsCount > 0 ? '#92400E' : 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Pending Upgrades
            </span>
            <Clock size={16} color={pendingRequestsCount > 0 ? '#D97706' : '#6B7280'} />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: pendingRequestsCount > 0 ? '#B45309' : 'var(--text-primary)' }}>
            {pendingRequestsCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: pendingRequestsCount > 0 ? '#92400E' : 'var(--text-secondary)', marginTop: '4px' }}>
            Awaiting Ace owner review
          </div>
        </div>

        {/* Consumed Resources */}
        <div style={{
          background: 'var(--color-surface-white)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              System Activity
            </span>
            <Layers size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {metrics?.total_documents_consumed ?? 0} docs • {metrics?.total_messages_consumed ?? 0} msgs
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Total processed inputs
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs: User Management vs Upgrade Requests */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '8px',
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'users' ? '#0D3273' : 'transparent',
            color: activeTab === 'users' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          All Users &amp; Quotas ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'requests' ? '#0D3273' : 'transparent',
            color: activeTab === 'requests' ? '#FFFFFF' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <span>Upgrade Requests</span>
          {pendingRequestsCount > 0 && (
            <span style={{
              background: '#EF4444',
              color: '#FFFFFF',
              borderRadius: '9999px',
              padding: '1px 6px',
              fontSize: '0.66rem',
              fontWeight: 800,
            }}>
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {/* 4. TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{
          background: 'var(--color-surface-white)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          overflow: 'hidden',
        }}>
          {/* Controls Bar: Search & Filter */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}>
            {/* Search Input */}
            <div style={{
              position: 'relative',
              width: '300px',
              maxWidth: '100%',
            }}>
              <Search size={14} color="var(--text-tertiary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search by email, name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px 6px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--color-surface-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Tier Filter Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                Tier:
              </span>
              {['all', 'pleasant', 'jack', 'king', 'ace'].map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTierFilter(t)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    border: selectedTierFilter === t ? 'none' : '1px solid var(--border-subtle)',
                    background: selectedTierFilter === t ? '#0D3273' : 'var(--color-surface-white)',
                    color: selectedTierFilter === t ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.8rem',
              textAlign: 'left',
            }}>
              <thead>
                <tr style={{
                  background: 'var(--color-surface-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  <th style={{ padding: '10px 16px' }}>User Details</th>
                  <th style={{ padding: '10px 16px' }}>Tier</th>
                  <th style={{ padding: '10px 16px' }}>Documents (Used / Max)</th>
                  <th style={{ padding: '10px 16px' }}>Messages (Used / Max)</th>
                  <th style={{ padding: '10px 16px' }}>Custom Override</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No users match the search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const isAce = user.tier === 'ace';
                    const isKing = user.tier === 'king';
                    const isJack = user.tier === 'jack';

                    const tierColor = isAce ? '#1E40AF' : isKing ? '#B45309' : isJack ? '#2563EB' : '#4B5563';
                    const tierBg = isAce ? '#DBEAFE' : isKing ? '#FEF3C7' : isJack ? '#EFF6FF' : '#F3F4F6';

                    const docMaxStr = user.max_documents === -1 ? '∞' : String(user.max_documents);
                    const msgMaxStr = user.max_messages === -1 ? '∞' : String(user.max_messages);

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background 0.1s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* User Email & Details */}
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {user.email}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                            ID: <code style={{ fontSize: '0.64rem' }}>{user.id}</code>
                          </div>
                        </td>

                        {/* Tier Badge & Dropdown Selector */}
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              background: tierBg,
                              color: tierColor,
                              textTransform: 'uppercase',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              {isAce && <Shield size={10} />}
                              {isKing && <Crown size={10} />}
                              {isJack && <Zap size={10} />}
                              {user.tier}
                            </span>

                            {/* Tier Changer Dropdown */}
                            <select
                              value={user.tier}
                              onChange={e => handleTierChange(user.id, e.target.value as UserTier)}
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--color-surface-white)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                              title="Promote or downgrade user tier"
                            >
                              <option value="pleasant">Pleasant (Guest)</option>
                              <option value="jack">Jack (Standard)</option>
                              <option value="king">King (Premium)</option>
                              <option value="ace">Ace (Super Admin)</option>
                            </select>
                          </div>
                        </td>

                        {/* Documents Ratio */}
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FileText size={13} color="var(--text-tertiary)" />
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {user.consumed_documents} / {docMaxStr}
                            </span>
                          </div>
                          {user.max_documents !== -1 && (
                            <div style={{
                              width: '90px',
                              height: '4px',
                              background: '#E2E8F0',
                              borderRadius: '2px',
                              marginTop: '4px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.min(100, (user.consumed_documents / user.max_documents) * 100)}%`,
                                height: '100%',
                                background: user.consumed_documents >= user.max_documents ? '#EF4444' : '#0D3273',
                              }} />
                            </div>
                          )}
                        </td>

                        {/* Messages Ratio */}
                        <td style={{ padding: '10px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={13} color="var(--text-tertiary)" />
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              {user.consumed_messages} / {msgMaxStr}
                            </span>
                          </div>
                          {user.max_messages !== -1 && (
                            <div style={{
                              width: '90px',
                              height: '4px',
                              background: '#E2E8F0',
                              borderRadius: '2px',
                              marginTop: '4px',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                width: `${Math.min(100, (user.consumed_messages / user.max_messages) * 100)}%`,
                                height: '100%',
                                background: user.consumed_messages >= user.max_messages ? '#EF4444' : '#2563EB',
                              }} />
                            </div>
                          )}
                        </td>

                        {/* Custom Override Indicator */}
                        <td style={{ padding: '10px 16px' }}>
                          {user.custom_doc_limit !== null || user.custom_msg_limit !== null ? (
                            <span style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#EEF2FF',
                              color: '#4338CA',
                              fontWeight: 700,
                            }}>
                              Overridden ({user.custom_doc_limit ?? 'def'} docs, {user.custom_msg_limit ?? 'def'} msgs)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                              Tier Defaults
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEditLimits(user)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '5px',
                              background: 'var(--color-surface-subtle)',
                              border: '1px solid var(--border-subtle)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease',
                            }}
                            title="Configure custom document and message limits for this user"
                          >
                            <Sliders size={12} />
                            <span>Edit Quotas</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 2: UPGRADE REQUESTS QUEUE */}
      {activeTab === 'requests' && (
        <div style={{
          background: 'var(--color-surface-white)',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          padding: '16px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            User Tier Upgrade Requests Queue
          </h3>

          {upgradeRequests.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No upgrade requests have been submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upgradeRequests.map(req => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';

                return (
                  <div
                    key={req.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${isPending ? '#FDE68A' : 'var(--border-subtle)'}`,
                      background: isPending ? '#FFFBEB' : 'var(--color-surface-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {req.user_email}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: '#E0E7FF',
                          color: '#3730A3',
                          textTransform: 'uppercase',
                        }}>
                          {req.current_tier} ➔ {req.requested_tier}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isPending ? '#FEF3C7' : isApproved ? '#DCFCE7' : '#FEE2E2',
                          color: isPending ? '#92400E' : isApproved ? '#166534' : '#991B1B',
                          textTransform: 'uppercase',
                        }}>
                          {req.status}
                        </span>
                      </div>

                      {req.reason && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          &ldquo;{req.reason}&rdquo;
                        </div>
                      )}

                      <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                        Requested on: {new Date(req.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Action buttons for pending requests */}
                    {isPending ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleReviewUpgrade(req.id, 'approved')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Approve upgrade and immediately promote user tier"
                        >
                          <CheckCircle2 size={13} />
                          <span>Approve &amp; Upgrade</span>
                        </button>

                        <button
                          onClick={() => handleReviewUpgrade(req.id, 'rejected')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'transparent',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          title="Reject upgrade request"
                        >
                          <XCircle size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        Processed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. MODAL: EDIT CUSTOM LIMITS OVERRIDE */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}>
          <div style={{
            background: 'var(--color-surface-white)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
            width: '420px',
            maxWidth: '100%',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(13, 50, 115, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Sliders size={18} color="#0D3273" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Configure Custom Limits
                </h3>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {editingUser.email} (Tier: {editingUser.tier.toUpperCase()})
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', lineHeight: 1.4, margin: '0 0 16px 0' }}>
              Custom allocations override tier defaults for this user without changing their assigned tier. Leave empty to use tier defaults.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {/* Document Limit Override */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Maximum Document Limit Override
                </label>
                <input
                  type="number"
                  placeholder="e.g. 7 (leave empty for tier default)"
                  value={customDocLimit}
                  onChange={e => setCustomDocLimit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--color-surface-subtle)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Message Limit Override */}
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Maximum Chat Messages Limit Override
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100 (leave empty for tier default)"
                  value={customMsgLimit}
                  onChange={e => setCustomMsgLimit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--color-surface-subtle)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setEditingUser(null)}
                disabled={isSavingLimits}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleSaveCustomLimits}
                disabled={isSavingLimits}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  background: '#0D3273',
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: isSavingLimits ? 'wait' : 'pointer',
                }}
              >
                {isSavingLimits ? 'Saving...' : 'Save Overrides'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

