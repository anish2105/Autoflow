import React, { useRef, useEffect } from 'react';
import { Activity, Clock, CheckCircle2, AlertCircle, Wrench, Brain, Play } from 'lucide-react';
import { ExecutionEvent } from '../../types';

interface TraceTimelineProps {
  events: ExecutionEvent[];
}

export const TraceTimeline: React.FC<TraceTimelineProps> = ({ events }) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  const getEventIcon = (type: string, node: string) => {
    if (node === '__start__') return <Play size={13} color="#059669" />;
    if (node === 'agent') return <Brain size={13} color="#0D3273" />;
    if (node === 'tools') return <Wrench size={13} color="#D946EF" />;
    if (node === '__end__') return <CheckCircle2 size={13} color="#0891B2" />;
    if (type === 'error') return <AlertCircle size={13} color="#DC2626" />;
    return <Activity size={13} color="#5A6578" />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Events List */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {events.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            gap: '8px'
          }}>
            <Clock size={24} color="#8C96A6" />
            <p style={{ fontSize: '0.82rem' }}>No execution trace recorded yet.<br />Send a prompt to trigger graph execution.</p>
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.id}
              className="editorial-card"
              style={{
                padding: '10px 12px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'var(--color-surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                {getEventIcon(evt.type, evt.node)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    [{evt.node}]
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                    {evt.timestamp}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: evt.details ? '4px' : 0 }}>
                  {evt.action}
                </div>

                {evt.details && (
                  <pre style={{
                    background: 'var(--color-surface-subtle)',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    margin: 0
                  }}>
                    {typeof evt.details === 'object' ? JSON.stringify(evt.details, null, 2) : String(evt.details)}
                  </pre>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
