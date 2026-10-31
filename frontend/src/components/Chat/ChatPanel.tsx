import React, { useRef, useEffect, useState } from 'react';
import { ArrowDown, Bot, Sparkles, Zap } from 'lucide-react';
import { ChatMessage, DocumentTier, DocumentItem, ToolConfigItem } from '../../types';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (
    msg: string,
    imageData?: string,
    mimeType?: string,
    pdfAttachment?: {
      filename: string;
      content_base64: string;
      tier: DocumentTier;
      size: number;
    },
    selectedFileIds?: string[]
  ) => void;
  onStop: () => void;
  onClear: () => void;
  isStreaming: boolean;
  isLoadingHistory?: boolean;
  availableDocuments?: DocumentItem[];
  selectedDocumentIds?: string[];
  onSelectedDocumentsChange?: (ids: string[]) => void;
  onRequestUpgrade?: () => void;
  tools?: ToolConfigItem[];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onStop,
  onClear,
  isStreaming,
  isLoadingHistory = false,
  availableDocuments = [],
  selectedDocumentIds = [],
  onSelectedDocumentsChange,
  onRequestUpgrade,
  tools,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const enabledToolIds = tools ? tools.filter(t => t.enabled).map(t => t.id) : undefined;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBottom(!isNearBottom && messages.length > 2);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      padding: '16px 24px 20px 24px',
      overflow: 'hidden',
      background: 'var(--color-canvas)',
      borderRight: '1px solid var(--border-subtle)'
    }}>
      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '8px',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {messages.length === 0 ? (
          isLoadingHistory ? (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid var(--border-subtle)',
                borderTopColor: '#0D3273',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '14px',
              }} />
              <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500, marginBottom: '4px' }}>
                Restoring conversation history...
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                Fetching previous messages and execution steps from Supabase
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--color-surface-white)',
                border: '1.5px solid var(--border-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}>
                <Sparkles size={22} color="#0D3273" />
              </div>
              <h2 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.6rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '8px',
                letterSpacing: '-0.01em'
              }}>
                How can I assist your workflow today?
              </h2>
              <p style={{ fontSize: '0.88rem', maxWidth: '440px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                Ask questions, perform complex calculations, search the web, or trigger automated workflows. The live LangGraph state updates on the right.
              </p>
            </div>
          )
        ) : (
          messages.map(msg => <MessageItem key={msg.id} message={msg} enabledToolIds={enabledToolIds} />)
        )}
      </div>

      {/* Floating Pill: ↓ Scroll to bottom */}
      {showScrollBottom && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30
        }}>
          <button
            onClick={scrollToBottom}
            className="pill-button-secondary"
            style={{
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
              padding: '6px 16px',
              fontSize: '0.8rem'
            }}
          >
            <ArrowDown size={14} />
            <span>Scroll to bottom</span>
          </button>
        </div>
      )}

      {/* Chat Input Pill */}
      <ChatInput
        onSendMessage={onSendMessage}
        onStop={onStop}
        onClear={onClear}
        isStreaming={isStreaming}
        availableDocuments={availableDocuments}
        selectedDocumentIds={selectedDocumentIds}
        onSelectedDocumentsChange={onSelectedDocumentsChange}
        onRequestUpgrade={onRequestUpgrade}
      />
    </div>
  );
};
