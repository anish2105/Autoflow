import React, { useState } from 'react';
import { Crown, Shield, X, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../types';
import { submitUpgradeRequestApi } from '../../services/api';

interface UpgradeRequestModalProps {
  profile: UserProfile | null;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const UpgradeRequestModal: React.FC<UpgradeRequestModalProps> = ({
  profile,
  onClose,
  onSubmitted,
}) => {
  const currentTier = profile?.tier || 'jack';
  const [requestedTier, setRequestedTier] = useState<'king' | 'ace'>(
    currentTier === 'king' ? 'ace' : 'king'
  );
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitUpgradeRequestApi(requestedTier, reason);
      setSuccessMsg(res?.message || 'Upgrade request submitted successfully!');
      setTimeout(() => {
        if (onSubmitted) onSubmitted();
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit upgrade request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px',
    }}>
      <div style={{
        background: 'var(--color-surface-white)',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
        width: '460px',
        maxWidth: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #0D3273 0%, #1E40AF 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Crown size={20} color="#FDE047" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>
              Request Tier Upgrade
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {successMsg ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 12px',
            }}>
              <CheckCircle2 size={42} color="#10B981" style={{ margin: '0 auto 12px auto' }} />
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Request Submitted!
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {successMsg}
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div style={{
                  padding: '10px 14px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  color: '#991B1B',
                  fontSize: '0.8rem',
                  marginBottom: '14px',
                }}>
                  {errorMsg}
                </div>
              )}

              <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Current Tier: <strong style={{ textTransform: 'uppercase', color: '#0D3273' }}>{currentTier}</strong>.
                Select your desired tier and provide a note for the application owner (Ace).
              </p>

              {/* Tier Selection Radio Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {/* King Card */}
                <div
                  onClick={() => setRequestedTier('king')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${requestedTier === 'king' ? '#D97706' : 'var(--border-subtle)'}`,
                    background: requestedTier === 'king' ? '#FEF3C7' : 'var(--color-surface-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Crown size={15} color="#D97706" />
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#92400E' }}>
                      King (Premium)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78350F' }}>
                    • 15 documents<br />
                    • Unlimited chat<br />
                    • All tools &amp; exports
                  </div>
                </div>

                {/* Ace Card */}
                <div
                  onClick={() => setRequestedTier('ace')}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${requestedTier === 'ace' ? '#1E40AF' : 'var(--border-subtle)'}`,
                    background: requestedTier === 'ace' ? '#DBEAFE' : 'var(--color-surface-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Shield size={15} color="#1E40AF" />
                    <span style={{ fontWeight: 800, fontSize: '0.84rem', color: '#1E3A8A' }}>
                      Ace (Admin)
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#1E40AF' }}>
                    • Unlimited docs &amp; msgs<br />
                    • Admin console<br />
                    • Quota management
                  </div>
                </div>
              </div>

              {/* Justification note */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Reason or Project Context (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Tell the owner what project or document workflows you are working on..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-primary)',
                    background: 'var(--color-surface-subtle)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: 'transparent',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#0D3273',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                  }}
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Send Upgrade Request'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

