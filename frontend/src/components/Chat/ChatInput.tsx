import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Square, Trash2, Zap, Image as ImageIcon, X, AlertCircle, FileText, BookOpen, Check, Crown } from 'lucide-react';
import { DocumentTier, DocumentItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface ChatInputProps {
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
  disabled?: boolean;
  availableDocuments?: DocumentItem[];
  selectedDocumentIds?: string[];
  onSelectedDocumentsChange?: (ids: string[]) => void;
  onRequestUpgrade?: () => void;
}

const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for images
const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB limit for PDFs

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStop,
  onClear,
  isStreaming,
  disabled = false,
  availableDocuments = [],
  selectedDocumentIds = [],
  onSelectedDocumentsChange,
  onRequestUpgrade,
}) => {
  const { profile, user, signInWithGoogle } = useAuth();
  const currentTier = profile?.tier || 'pleasant';
  const maxMessages = (currentTier === 'king' || currentTier === 'ace' || profile?.max_messages === -1)
    ? Infinity
    : (profile?.max_messages ?? profile?.custom_msg_limit ?? (currentTier === 'jack' ? 25 : 5));
  const messagesUsed = profile?.consumed_messages ?? profile?.usage?.messages_used ?? 0;
  const isQuotaExhausted = messagesUsed >= maxMessages;

  const [input, setInput] = useState('');
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const docPickerRef = useRef<HTMLDivElement>(null);

  const [selectedImage, setSelectedImage] = useState<{
    dataUrl: string;
    mimeType: string;
    name: string;
    size: number;
  } | null>(null);
  const [attachedPdf, setAttachedPdf] = useState<{
    file: File;
    name: string;
    size: number;
    dataUrl: string;
    tier: DocumentTier;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close doc picker dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (docPickerRef.current && !docPickerRef.current.contains(e.target as Node)) {
        setIsDocPickerOpen(false);
      }
    };
    if (isDocPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDocPickerOpen]);

  // Only digitized documents can be queried via RAG
  const digitizedDocs = availableDocuments.filter(d => d.digitized || d.status === 'digitized');

  const toggleDocSelection = (docId: string) => {
    const current = selectedDocumentIds || [];
    const next = current.includes(docId)
      ? current.filter(id => id !== docId)
      : [...current, docId];
    if (onSelectedDocumentsChange) {
      onSelectedDocumentsChange(next);
    }
  };

  const removeSelectedDoc = (docId: string) => {
    if (onSelectedDocumentsChange) {
      onSelectedDocumentsChange((selectedDocumentIds || []).filter(id => id !== docId));
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const validateAndSetFile = (file: File) => {
    setErrorMessage(null);
    const mime = file.type.toLowerCase();
    const isPdf = mime === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      if (file.size > MAX_PDF_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        setErrorMessage(`PDF exceeds 25MB limit (${sizeMb} MB).`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachedPdf({
          file,
          name: file.name,
          size: file.size,
          dataUrl: result,
          tier: 'fast', // Default Fast mode
        });
        setSelectedImage(null); // Mutually exclusive single attachment
      };
      reader.onerror = () => {
        setErrorMessage('Failed to read PDF file.');
      };
      reader.readAsDataURL(file);
      return;
    }

    // 1. Check size for images
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`Image exceeds 10MB limit (${sizeMb} MB). Maximum allowed size is 10 MB.`);
      return;
    }

    // 2. Check MIME type for images
    const isSupportedImage = SUPPORTED_IMAGE_MIMES.includes(mime) ||
      (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif'));

    if (!isSupportedImage) {
      setErrorMessage(`Unsupported format '${file.type || 'unknown'}'. Supported: PDF, PNG, JPEG, WEBP, HEIC, HEIF.`);
      return;
    }

    // 3. Read image as base64 data URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSelectedImage({
        dataUrl: result,
        mimeType: mime || 'image/png',
        name: file.name,
        size: file.size,
      });
      setAttachedPdf(null); // Mutually exclusive single attachment
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    // reset input so the same file can be re-selected if removed
    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        e.preventDefault();
        validateAndSetFile(file);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isQuotaExhausted) {
      if (currentTier === 'pleasant') {
        setErrorMessage("Demo limit reached (5/5 inputs). Please sign in with Google to continue.");
      } else {
        setErrorMessage("Message quota reached (25/25 inputs). Please request an upgrade to King.");
      }
      return;
    }
    if ((!input.trim() && !selectedImage && !attachedPdf) || isStreaming || disabled) return;

    onSendMessage(
      input.trim(),
      selectedImage?.dataUrl,
      selectedImage?.mimeType,
      attachedPdf ? {
        filename: attachedPdf.name,
        content_base64: attachedPdf.dataUrl,
        tier: attachedPdf.tier,
        size: attachedPdf.size,
      } : undefined,
      selectedDocumentIds
    );

    setInput('');
    setSelectedImage(null);
    setAttachedPdf(null);
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSubmit = (input.trim().length > 0 || selectedImage !== null || attachedPdf !== null) && !disabled && !isQuotaExhausted;

  return (
    <div style={{
      width: '100%',
      paddingTop: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Hidden native file input for photos and PDFs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,application/pdf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Error Banner if file constraint violated */}
      {errorMessage && (
        <div style={{
          padding: '8px 14px',
          borderRadius: '10px',
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#DC2626',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Quota Exhaustion Alert Banner */}
      {isQuotaExhausted && (
        <div style={{
          padding: '10px 16px',
          borderRadius: '12px',
          background: currentTier === 'pleasant' ? '#FFFBEB' : '#EFF6FF',
          border: `1.5px solid ${currentTier === 'pleasant' ? '#FDE68A' : '#BFDBFE'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          animation: 'fadeIn 0.2s ease-out',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentTier === 'pleasant' ? (
              <AlertCircle size={18} color="#D97706" style={{ flexShrink: 0 }} />
            ) : (
              <Crown size={18} color="#2563EB" style={{ flexShrink: 0 }} />
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentTier === 'pleasant' ? (
                <>
                  <strong style={{ color: '#B45309' }}>Demo message limit reached (5/5 inputs).</strong> Register for a free Jack account to get 25 messages, 3 document uploads, and persistent history.
                </>
              ) : (
                <>
                  <strong style={{ color: '#1D4ED8' }}>Message quota reached (25/25 inputs).</strong> You've reached your free registered quota. Request an upgrade to King for unlimited chat and 15 documents.
                </>
              )}
            </div>
          </div>

          {currentTier === 'pleasant' ? (
            <button
              type="button"
              onClick={signInWithGoogle}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                background: '#0D3273',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(13, 50, 115, 0.2)'
              }}
            >
              Sign in with Google
            </button>
          ) : (
            onRequestUpgrade && (
              <button
                type="button"
                onClick={onRequestUpgrade}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                }}
              >
                Request King Upgrade
              </button>
            )
          )}
        </div>
      )}

      {/* Image Preview Thumbnail Card */}
      {selectedImage && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px 6px 8px',
          borderRadius: '14px',
          background: 'var(--color-surface-white)',
          border: '1.5px solid #6366F1',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
          alignSelf: 'flex-start',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <img
            src={selectedImage.dataUrl}
            alt="Upload Preview"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid var(--border-subtle)'
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedImage.name}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
              {(selectedImage.size / 1024).toFixed(1)} KB • {selectedImage.mimeType} (Gemini Vision)
            </span>
          </div>
          <button
            type="button"
            title="Remove image"
            onClick={() => setSelectedImage(null)}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: '4px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* PDF Document Attachment Card with Fast / Agentic Dropdown */}
      {attachedPdf && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px 14px 8px 10px',
          borderRadius: '14px',
          background: 'var(--color-surface-white)',
          border: '1.5px solid #0D3273',
          boxShadow: '0 4px 14px rgba(13, 50, 115, 0.1)',
          alignSelf: 'flex-start',
          animation: 'fadeIn 0.2s ease-out',
          maxWidth: '100%',
          flexWrap: 'wrap'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
            fontWeight: 800,
            fontSize: '0.72rem',
            letterSpacing: '0.04em',
            flexShrink: 0
          }}>
            PDF
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {attachedPdf.name}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              {attachedPdf.size > 1024 * 1024 ? `${(attachedPdf.size / (1024 * 1024)).toFixed(2)} MB` : `${(attachedPdf.size / 1024).toFixed(1)} KB`} • LlamaCloud OCR
            </span>
          </div>

          {/* OCR Mode Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(13, 50, 115, 0.05)',
            borderRadius: '8px',
            padding: '4px 8px',
            border: '1px solid rgba(13, 50, 115, 0.15)',
          }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0D3273' }}>Mode:</span>
            <select
              value={attachedPdf.tier}
              onChange={e => setAttachedPdf(prev => prev ? { ...prev, tier: e.target.value as DocumentTier } : null)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: '0.76rem',
                fontWeight: 700,
                color: '#0D3273',
                cursor: 'pointer'
              }}
              title="Fast: Simple, text-only documents. Agentic: Documents with diagrams and images, handles complex documents."
            >
              <option value="fast">⚡ Fast (Simple, text-only)</option>
              <option value="agentic">🧠 Agentic (Diagrams, images & complex)</option>
            </select>
          </div>

          <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 500 }}>
            Saved to Documents
          </span>

          <button
            type="button"
            title="Remove PDF"
            onClick={() => setAttachedPdf(null)}
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: '4px'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Selected RAG Documents Scope Tray */}
      {selectedDocumentIds && selectedDocumentIds.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '4px 6px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.72rem',
            fontWeight: 700,
            color: '#0D3273',
            background: 'rgba(13, 50, 115, 0.08)',
            padding: '3px 8px',
            borderRadius: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}>
            <BookOpen size={12} />
            <span>Files in Scope ({selectedDocumentIds.length})</span>
          </div>

          {selectedDocumentIds.map(docId => {
            const doc = availableDocuments.find(d => d.id === docId);
            const docName = doc?.name || docId;
            return (
              <div
                key={docId}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-surface-white)',
                  border: '1.5px solid #0D3273',
                  borderRadius: '9999px',
                  padding: '3px 8px 3px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  boxShadow: '0 2px 6px rgba(13, 50, 115, 0.08)'
                }}
              >
                <FileText size={12} color="#0D3273" />
                <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={docName}>
                  {docName}
                </span>
                <button
                  type="button"
                  onClick={() => removeSelectedDoc(docId)}
                  title="Remove file from scope"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1px'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}

          {selectedDocumentIds.length > 1 && (
            <button
              type="button"
              onClick={() => onSelectedDocumentsChange && onSelectedDocumentsChange([])}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Floating Pill Input Container */}
      <div style={{
        position: 'relative',
        background: 'var(--color-surface-white)',
        border: selectedImage ? '1.5px solid #6366F1' : attachedPdf ? '1.5px solid #0D3273' : (selectedDocumentIds && selectedDocumentIds.length > 0) ? '1.5px solid #0D3273' : '1.5px solid var(--border-dark)',
        borderRadius: '9999px',
        padding: '6px 12px 6px 14px',
        boxShadow: selectedImage ? '0 2px 14px rgba(99, 102, 241, 0.12)' : attachedPdf ? '0 2px 14px rgba(13, 50, 115, 0.12)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.2s ease'
      }}>
        {/* Upload File Button (Images & PDFs) */}
        <button
          type="button"
          title="Upload photo or PDF document (Fast & Agentic LlamaCloud OCR)"
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: (selectedImage || attachedPdf) ? 'rgba(13, 50, 115, 0.1)' : 'transparent',
            border: 'none',
            borderRadius: '50%',
            color: (selectedImage || attachedPdf) ? '#0D3273' : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={e => {
            if (!selectedImage && !attachedPdf) e.currentTarget.style.color = '#0D3273';
          }}
          onMouseLeave={e => {
            if (!selectedImage && !attachedPdf) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <Paperclip size={18} />
        </button>

        {/* Document Selector Button & Dropdown */}
        <div style={{ position: 'relative' }} ref={docPickerRef}>
          <button
            type="button"
            title="Attach files in scope for retrieval"
            onClick={() => setIsDocPickerOpen(prev => !prev)}
            style={{
              background: (selectedDocumentIds && selectedDocumentIds.length > 0) ? 'rgba(13, 50, 115, 0.12)' : isDocPickerOpen ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
              border: 'none',
              borderRadius: '50%',
              color: (selectedDocumentIds && selectedDocumentIds.length > 0) ? '#0D3273' : 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              if (!selectedDocumentIds || selectedDocumentIds.length === 0) e.currentTarget.style.color = '#0D3273';
            }}
            onMouseLeave={e => {
              if (!selectedDocumentIds || selectedDocumentIds.length === 0) e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <BookOpen size={18} />
            {selectedDocumentIds && selectedDocumentIds.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: '#0D3273',
                color: '#FFFFFF',
                fontSize: '0.58rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1.5px solid var(--color-surface-white)'
              }}>
                {selectedDocumentIds.length}
              </span>
            )}
          </button>

          {/* Document Picker Dropdown Popover */}
          {isDocPickerOpen && (
            <div style={{
              position: 'absolute',
              bottom: '44px',
              left: '0',
              width: '320px',
              background: 'var(--color-surface-white)',
              border: '1.5px solid var(--border-dark)',
              borderRadius: '14px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
              zIndex: 100,
              padding: '12px',
              animation: 'fadeIn 0.15s ease-out',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={15} color="#0D3273" />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Files in Scope
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {digitizedDocs.length} ready
                </span>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {digitizedDocs.length === 0 ? (
                  <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    No digitized documents found.<br />Upload a PDF or DOCX to query it!
                  </div>
                ) : (
                  digitizedDocs.map(doc => {
                    const isSelected = selectedDocumentIds?.includes(doc.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleDocSelection(doc.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          background: isSelected ? 'rgba(13, 50, 115, 0.08)' : 'transparent',
                          border: `1px solid ${isSelected ? 'rgba(13, 50, 115, 0.3)' : 'transparent'}`,
                          cursor: 'pointer',
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `1.5px solid ${isSelected ? '#0D3273' : 'var(--border-strong)'}`,
                          background: isSelected ? '#0D3273' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {(doc.size / 1024).toFixed(1)} KB • {doc.parsedPages?.length || 1} pages • {doc.tier || 'fast'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {digitizedDocs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px', fontSize: '0.72rem' }}>
                  <button
                    type="button"
                    onClick={() => onSelectedDocumentsChange && onSelectedDocumentsChange(digitizedDocs.map(d => d.id))}
                    style={{ background: 'transparent', border: 'none', color: '#0D3273', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All ({digitizedDocs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectedDocumentsChange && onSelectedDocumentsChange([])}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    Deselect All
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isStreaming
              ? "Generating response... (click ■ Stop to cancel and type a new query)"
              : isQuotaExhausted
              ? (currentTier === 'pleasant'
                  ? "Demo limit reached (5/5 inputs). Please sign in with Google to continue..."
                  : "Message quota reached (25/25 inputs). Request King upgrade to continue...")
              : attachedPdf
              ? "Ask a question about this document or press Enter to upload..."
              : selectedImage
              ? "Ask a question about this image..."
              : "Message AutoFlow or upload a PDF/photo..."
          }
          disabled={disabled}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.92rem',
            resize: 'none',
            lineHeight: 1.4,
            padding: '6px 0',
            maxHeight: '120px'
          }}
        />

        {/* Right Status Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '0.72rem',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          paddingRight: '4px'
        }}>
          <Zap size={11} color="#5A6578" />
          <span>3.1</span>
        </div>

        {/* Send / Stop Action Button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop Generating"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#EF4444',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'transform 0.15s ease'
            }}
          >
            <Square size={13} fill="#FFFFFF" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={!canSubmit}
            title={selectedImage ? "Send image & question" : "Send message"}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: canSubmit ? '#6366F1' : '#E2DDD4',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: canSubmit ? 'pointer' : 'default',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <ArrowUp size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Quick Prompts / Clear link */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        fontSize: '0.72rem',
        color: 'var(--text-tertiary)'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span
            onClick={() => setInput('Search the web for latest breakthroughs in AI agents')}
            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-secondary)' }}
          >
            🌐 Web search
          </span>
          <span>•</span>
          <span
            onClick={() => setInput('Scrape and summarize the content of https://en.wikipedia.org/wiki/Artificial_intelligence')}
            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-secondary)' }}
          >
            📄 Web scrape
          </span>
          <span>•</span>
          <span
            onClick={() => setInput('Calculate sqrt(256) * 45 + 120 / 4')}
            style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--text-secondary)' }}
          >
            Calculate
          </span>
        </div>

        <button
          type="button"
          onClick={onClear}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-tertiary)',
            cursor: 'pointer',
            fontSize: '0.72rem',
            display: 'flex',
            alignItems: 'center',
            gap: '3px'
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          <Trash2 size={11} />
          <span>Clear chat</span>
        </button>
      </div>
    </div>
  );
};
