import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatSidebar } from './components/Sidebar/ChatSidebar';
import { ChatPanel } from './components/Chat/ChatPanel';
import { GraphPanel } from './components/Graph/GraphPanel';
import { LandingPage } from './components/Landing/LandingPage';
import { DocumentsPanel } from './components/Documents/DocumentsPanel';
import { AgentBuilderPanel } from './components/AgentBuilder/AgentBuilderPanel';
import { ToolsPanel } from './components/Tools/ToolsPanel';
import { AceDashboard } from './components/Admin/AceDashboard';
import { UpgradeRequestModal } from './components/Common/UpgradeRequestModal';
import { ChatHistoryModal } from './components/Common/ChatHistoryModal';
import { WorkflowHistoryModal } from './components/AgentBuilder/WorkflowHistoryModal';
import {
  ChatMessage,
  ExecutionEvent,
  GraphSchema,
  ServerConfig,
  ToolCallItem,
  ChatSession,
  NavSection,
  DocumentItem,
  DocumentTier,
  ToolConfigItem,
} from './types';
import { WorkflowDefinition } from './types/workflow';
import {
  fetchGraphSchema,
  fetchServerConfig,
  streamChat,
  deleteThreadMemory,
  fetchUserConversations,
  createConversation,
  deleteConversation,
  fetchConversationMessages,
  uploadDocumentApi,
  fetchDocumentsApi,
  deleteDocumentApi,
  fetchUserToolsApi,
  updateUserToolsApi,
  fetchUserWorkflowsApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
} from './services/api';
import { useAuth } from './context/AuthContext';

function getSessionsStorageKey(userId?: string | null): string {
  return userId ? `autoflow_chat_sessions_${userId}` : 'autoflow_chat_sessions_guest';
}

function getActiveSessionStorageKey(userId?: string | null): string {
  return userId ? `autoflow_active_session_${userId}` : 'autoflow_active_session_guest';
}

function getWorkflowsStorageKey(userId?: string | null): string {
  return userId ? `autoflow_workflows_${userId}` : 'autoflow_workflows_guest';
}

function getActiveWorkflowStorageKey(userId?: string | null): string {
  return userId ? `autoflow_active_workflow_${userId}` : 'autoflow_active_workflow_guest';
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createNewSession(): ChatSession {
  const id = generateUUID();
  return {
    id,
    threadId: id,
    title: 'New Conversation',
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    updatedAt: new Date().toISOString(),
    messages: [],
    events: [],
    selectedFileIds: [],
  };
}

const DEFAULT_TOOLS_CONFIG: ToolConfigItem[] = [
  {
    id: 'retrieve_document_context',
    name: 'Document Context Retrieval (RAG)',
    category: 'Documents & RAG',
    description: 'Performs hybrid search (Dense vector + BM25 keyword matching) to query and retrieve excerpts from uploaded documents.',
    enabled: true,
    icon: 'BookOpen'
  },
  {
    id: 'web_search',
    name: 'Web Search (Tavily)',
    category: 'Search & Scrape',
    description: 'Searches the live web for current real-time news, information, documentation, and citations.',
    enabled: true,
    icon: 'Globe'
  },
  {
    id: 'web_scrape',
    name: 'Web Scraper & Reader (Firecrawl)',
    category: 'Search & Scrape',
    description: 'Extracts and parses clean Markdown content, PDF documents, and structured text from target URLs.',
    enabled: true,
    icon: 'FileCode'
  },
  {
    id: 'calculate',
    name: 'Calculator & Math Engine',
    category: 'Computation',
    description: 'Performs accurate arithmetic, formula computation, and complex algebraic evaluations.',
    enabled: true,
    icon: 'Calculator'
  },
  {
    id: 'get_current_time',
    name: 'Date, Time & Timezones',
    category: 'Utility',
    description: 'Provides exact local and global current dates, timestamps, day of week, and timezone offsets.',
    enabled: true,
    icon: 'Clock'
  },
  {
    id: 'process_image',
    name: 'Multimodal Vision Analysis',
    category: 'Vision',
    description: 'Inspects user-uploaded photos, screenshots, charts, diagrams, and extracts visual text via OCR.',
    enabled: true,
    icon: 'ImageIcon'
  },
  {
    id: 'export_chat_pdf',
    name: 'PDF Transcript Exporter',
    category: 'Export',
    description: 'Generates professional, styled PDF documents with justified text, bold headers, and styled tables.',
    enabled: true,
    icon: 'FileText'
  },
  {
    id: 'export_chat_excel',
    name: 'Excel Spreadsheet Exporter',
    category: 'Export',
    description: 'Generates clean formatted Excel spreadsheets (.xlsx) with bold headers, alternating rows, and no gridlines.',
    enabled: true,
    icon: 'FileSpreadsheet'
  },
  {
    id: 'export_chat_docx',
    name: 'Word Document Exporter (DOCX)',
    category: 'Export',
    description: 'Generates clean formatted Microsoft Word documents (.docx) with styled headings, lists, and tables.',
    enabled: true,
    icon: 'FileEdit'
  },
  {
    id: 'export_chat_txt',
    name: 'Plain Text Exporter',
    category: 'Export',
    description: 'Dumps clean text transcripts of conversation history for quick sharing or offline storage.',
    enabled: true,
    icon: 'FileText'
  }
];

function mergeWithDefaultTools(savedTools?: any[]): ToolConfigItem[] {
  if (!Array.isArray(savedTools) || savedTools.length === 0) {
    return DEFAULT_TOOLS_CONFIG;
  }
  const savedMap = new Map<string, any>(savedTools.map(t => [t.id, t]));
  return DEFAULT_TOOLS_CONFIG.map(defaultTool => {
    const saved = savedMap.get(defaultTool.id);
    if (saved) {
      return {
        ...defaultTool,
        enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defaultTool.enabled
      };
    }
    return defaultTool;
  });
}

function getDocumentsStorageKey(userId?: string | null): string {
  return userId ? `autoflow_documents_${userId}` : 'autoflow_documents_guest';
}

function getToolsStorageKey(userId?: string | null): string {
  return userId ? `autoflow_tools_config_${userId}` : 'autoflow_tools_config_guest';
}

export function normalizeDocItem(raw: any): DocumentItem {
  return {
    id: raw.id || `doc_${Date.now()}`,
    name: raw.name || raw.filename || 'Document',
    size: Number(raw.size ?? raw.size_bytes ?? 0),
    type: (raw.type || raw.file_type || 'other') as any,
    mimeType: raw.mimeType || raw.mime_type || 'application/octet-stream',
    base64: raw.base64 || raw.content_base64 || '',
    tier: raw.tier || 'fast',
    status: raw.status || (raw.digitized ? 'digitized' : 'uploaded'),
    digitized: Boolean(raw.digitized),
    uploadedAt: raw.uploadedAt || raw.created_at || new Date().toISOString(),
    source: raw.source || 'upload',
    parsedMarkdown: raw.parsedMarkdown || raw.parsed_markdown || undefined,
    parsedPages: raw.parsedPages || raw.parsed_pages || [],
    errorMessage: raw.errorMessage || raw.error_message || undefined,
  };
}

export const App: React.FC = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // Initialize sessions from localStorage or default
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const key = getSessionsStorageKey(null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return [createNewSession()];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const key = getActiveSessionStorageKey(null);
    const savedId = localStorage.getItem(key);
    return savedId || (sessions[0]?.id ?? '');
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(45);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Active navigation section: 'conversations' | 'documents' | 'agent-builder' | 'tools'
  const [activeNavSection, setActiveNavSection] = useState<NavSection>('conversations');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Workflows configuration & state
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>(() => {
    try {
      const key = getWorkflowsStorageKey(null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(() => {
    try {
      const key = getActiveWorkflowStorageKey(null);
      return localStorage.getItem(key);
    } catch {}
    return null;
  });

  const [isWorkflowsHistoryOpen, setIsWorkflowsHistoryOpen] = useState<boolean>(false);

  // Tools configuration state with user-specific localStorage persistence
  const [tools, setTools] = useState<ToolConfigItem[]>(() => {
    try {
      const key = getToolsStorageKey(null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return mergeWithDefaultTools(parsed);
      }
    } catch {}
    return DEFAULT_TOOLS_CONFIG;
  });

  // Load and sync user-specific tools when user changes
  useEffect(() => {
    const key = getToolsStorageKey(user?.id);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeWithDefaultTools(parsed);
          setTools(merged);
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      } catch {}
    } else {
      setTools(DEFAULT_TOOLS_CONFIG);
    }

    if (user?.id) {
      fetchUserToolsApi().then(res => {
        if (res && res.tools && Array.isArray(res.tools) && res.tools.length > 0) {
          const merged = mergeWithDefaultTools(res.tools);
          setTools(merged);
          try {
            localStorage.setItem(key, JSON.stringify(merged));
          } catch {}
        }
      }).catch(() => {});
    }
  }, [user?.id]);

  // Documents state with localStorage persistence
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const key = getDocumentsStorageKey(null);
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const [schema, setSchema] = useState<GraphSchema | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);

  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedSessionsRef = useRef<Set<string>>(new Set());
  const prevUserIdRef = useRef<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Tool toggle handlers with user-specific sync
  const handleToggleTool = (toolId: string) => {
    setTools(prev => {
      const updated = prev.map(t => (t.id === toolId ? { ...t, enabled: !t.enabled } : t));
      try {
        const key = getToolsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
        if (user?.id) {
          updateUserToolsApi(updated).catch(console.error);
        }
      } catch {}
      return updated;
    });
  };

  const handleEnableAllTools = () => {
    setTools(prev => {
      const updated = prev.map(t => ({ ...t, enabled: true }));
      try {
        const key = getToolsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
        if (user?.id) {
          updateUserToolsApi(updated).catch(console.error);
        }
      } catch {}
      return updated;
    });
  };

  const handleDisableAllTools = () => {
    setTools(prev => {
      const updated = prev.map(t => ({ ...t, enabled: false }));
      try {
        const key = getToolsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
        if (user?.id) {
          updateUserToolsApi(updated).catch(console.error);
        }
      } catch {}
      return updated;
    });
  };

  // Document handlers
  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments(prev => {
      const exists = prev.some(d => d.id === newDoc.id);
      const updated = exists ? prev.map(d => (d.id === newDoc.id ? newDoc : d)) : [newDoc, ...prev];
      try {
        const key = getDocumentsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleUpdateDocument = (updatedDoc: DocumentItem, oldId?: string) => {
    setDocuments(prev => {
      const updated = prev.map(d => (d.id === updatedDoc.id || (oldId && d.id === oldId) ? updatedDoc : d));
      try {
        const key = getDocumentsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDeleteDocument = (id: string) => {
    // Delete in background from backend
    deleteDocumentApi(id).catch(err => console.warn('Backend delete document failed:', err));

    setDocuments(prev => {
      const updated = prev.filter(d => d.id !== id);
      try {
        const key = getDocumentsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleToggleDigitized = (id: string) => {
    setDocuments(prev => {
      const updated = prev.map(d => (d.id === id ? { ...d, digitized: !d.digitized } : d));
      try {
        const key = getDocumentsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Fetch initial documents from server API & sync with localStorage
  useEffect(() => {
    if (authLoading) return;

    // 1. Immediately sync from user-scoped localStorage if available
    try {
      const userKey = getDocumentsStorageKey(user?.id);
      const savedUserDocs = localStorage.getItem(userKey);
      if (savedUserDocs) {
        const parsed = JSON.parse(savedUserDocs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDocuments(parsed.map(normalizeDocItem));
        }
      } else if (user?.id) {
        const guestDocs = localStorage.getItem(getDocumentsStorageKey(null));
        if (guestDocs) {
          localStorage.setItem(userKey, guestDocs);
          const parsedGuest = JSON.parse(guestDocs);
          if (Array.isArray(parsedGuest) && parsedGuest.length > 0) {
            setDocuments(parsedGuest.map(normalizeDocItem));
          }
        }
      }
    } catch (e) {
      console.warn('Error reading local documents storage:', e);
    }

    // 2. Fetch latest documents from backend API
    fetchDocumentsApi()
      .then(serverRes => {
        const rawDocs = Array.isArray(serverRes) ? serverRes : (serverRes?.documents || []);
        if (Array.isArray(rawDocs) && rawDocs.length > 0) {
          const serverDocs = rawDocs.map(normalizeDocItem);

          setDocuments(prev => {
            const serverMap = new Map(serverDocs.map(d => [d.id, d]));
            const merged: DocumentItem[] = [];

            // Update existing local docs while preserving client-side base64 if server omits it
            for (const localDoc of prev) {
              const serverDoc = serverMap.get(localDoc.id);
              if (serverDoc) {
                serverMap.delete(localDoc.id);
                merged.push({
                  ...serverDoc,
                  base64: localDoc.base64 || serverDoc.base64,
                  parsedMarkdown: serverDoc.parsedMarkdown || localDoc.parsedMarkdown,
                  parsedPages: (serverDoc.parsedPages && serverDoc.parsedPages.length > 0) ? serverDoc.parsedPages : localDoc.parsedPages,
                });
              } else if (!localDoc.id.startsWith('doc_')) {
                merged.push(localDoc);
              }
            }

            // Append any new server documents
            for (const remaining of serverMap.values()) {
              merged.push(remaining);
            }

            try {
              const key = getDocumentsStorageKey(user?.id);
              localStorage.setItem(key, JSON.stringify(merged));
            } catch {}

            return merged;
          });
        }
      })
      .catch(err => {
        console.warn('Failed to load documents from backend API:', err);
      });
  }, [user?.id, authLoading]);

  // Load and sync workflows
  useEffect(() => {
    async function loadWorkflows() {
      // 1. Read local storage first
      try {
        const userKey = getWorkflowsStorageKey(user?.id);
        const saved = localStorage.getItem(userKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWorkflows(parsed);
          }
        }
      } catch (err) {
        console.warn('Error reading local workflows:', err);
      }

      // 2. Fetch remote workflows from Supabase backend
      try {
        const remote = await fetchUserWorkflowsApi();
        if (remote && Array.isArray(remote) && remote.length > 0) {
          setWorkflows(remote);
          const userKey = getWorkflowsStorageKey(user?.id);
          localStorage.setItem(userKey, JSON.stringify(remote));
          if (!activeWorkflowId) {
            setActiveWorkflowId(remote[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch remote workflows from server:', err);
      }
    }
    loadWorkflows();
  }, [user?.id]);

  const handleSelectWorkflow = (workflowId: string) => {
    setActiveWorkflowId(workflowId);
    setActiveNavSection('agent-builder');
    try {
      const key = getActiveWorkflowStorageKey(user?.id);
      localStorage.setItem(key, workflowId);
    } catch {}
  };

  const handleNewWorkflow = () => {
    setActiveWorkflowId(null);
    try {
      const key = getActiveWorkflowStorageKey(user?.id);
      localStorage.removeItem(key);
    } catch {}
    setActiveNavSection('agent-builder');
  };

  const handleSaveWorkflow = async (workflow: WorkflowDefinition): Promise<WorkflowDefinition> => {
    let savedWf = workflow;
    try {
      const exists = workflows.some(w => w.id === workflow.id);
      if (exists) {
        const res = await updateWorkflowApi(workflow.id, workflow);
        savedWf = res.workflow || res;
      } else {
        const res = await createWorkflowApi(workflow);
        savedWf = res.workflow || res;
      }
    } catch (err) {
      console.warn('Server save workflow failed, saving locally:', err);
    }

    setWorkflows(prev => {
      const idx = prev.findIndex(w => w.id === savedWf.id);
      const updated = idx >= 0 ? prev.map(w => (w.id === savedWf.id ? savedWf : w)) : [savedWf, ...prev];
      try {
        const key = getWorkflowsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveWorkflowId(savedWf.id);
    return savedWf;
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await deleteWorkflowApi(workflowId);
    } catch (err) {
      console.warn('Server delete workflow failed:', err);
    }

    setWorkflows(prev => {
      const updated = prev.filter(w => w.id !== workflowId);
      try {
        const key = getWorkflowsStorageKey(user?.id);
        localStorage.setItem(key, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (activeWorkflowId === workflowId) {
      setActiveWorkflowId(null);
    }
  };

  const handleDuplicateWorkflow = async (workflow: WorkflowDefinition) => {
    const clone: WorkflowDefinition = {
      ...workflow,
      id: `wf_${Date.now()}_copy`,
      name: `${workflow.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await handleSaveWorkflow(clone);
  };

  const handleExecuteWorkflowInChat = async (prompt: string, workflow: WorkflowDefinition) => {
    const newSession = createNewSession();
    newSession.title = workflow.name;
    const agentNode = workflow.nodes.find(n => n.type === 'agent');
    const systemPromptPrefix = agentNode?.config?.system_prompt_prefix || workflow.system_prompt_prefix || '';
    const ragNodes = workflow.nodes.filter(n => n.type === 'rag');
    const allFileIds = Array.from(new Set(ragNodes.flatMap(n => n.config?.selected_file_ids || [])));

    newSession.selectedFileIds = allFileIds;

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSelectedDocIds(allFileIds);
    setActiveNavSection('conversations');

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      selectedFileIds: allFileIds.length > 0 ? allFileIds : undefined,
    };

    const assistantPlaceholderId = Math.random().toString(36).substring(7);
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
      isStreaming: true,
    };

    setSessions(prev =>
      prev.map(s =>
        s.id === newSession.id
          ? { ...s, messages: [userMessage, assistantMessage], updatedAt: new Date().toISOString() }
          : s
      )
    );

    await executeChatStream({
      promptText: prompt,
      historyMessages: [],
      targetThreadId: newSession.threadId,
      assistantPlaceholderId,
      targetFileIds: allFileIds,
      systemPromptPrefix,
    });
  };

  const handleUploadDocumentFromPanel = async (file: File): Promise<DocumentItem | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const fileExt = file.name.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
          const res = await uploadDocumentApi({
            filename: file.name,
            content_base64: base64,
            file_type: fileExt,
            mime_type: file.type || (fileExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf'),
            tier: 'fast',
            source: 'upload',
            size_bytes: file.size,
            wait_for_completion: true,
          });
          const docData = res.document || res;
          const newDoc: DocumentItem = normalizeDocItem(docData);
          handleAddDocument(newDoc);
          resolve(newDoc);
        } catch (err) {
          console.error('Upload document from builder failed:', err);
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };


  const loadSessionHistory = async (sessionId: string, force = false) => {
    if (!sessionId) return;
    if (!force && loadedSessionsRef.current.has(sessionId)) return;

    setLoadingHistory(true);
    try {
      const history = await fetchConversationMessages(sessionId);
      if (history && history.messages) {
        loadedSessionsRef.current.add(sessionId);
        setSessions(prev =>
          prev.map(s => {
            if (s.id === sessionId) {
              return {
                ...s,
                messages: history.messages,
                events: history.events && history.events.length > 0 ? history.events : s.events,
              };
            }
            return s;
          })
        );
      }
    } catch (err) {
      console.error(`Failed to load history for session ${sessionId}:`, err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Synchronize auth state changes (login, logout, account switch)
  useEffect(() => {
    if (authLoading) return;

    const currentUserId = user?.id ?? null;

    // 1. USER LOGGED OUT
    if (!user) {
      if (prevUserIdRef.current !== null) {
        prevUserIdRef.current = null;
        loadedSessionsRef.current.clear();
        if (isStreaming) handleStop();

        // Redirect to Home / Landing page
        setShowLanding(true);

        // Clear legacy global storage keys
        try {
          localStorage.removeItem('autoflow_chat_sessions_v1');
          localStorage.removeItem('autoflow_active_session_id');
        } catch {}

        // Reset to clean guest session
        const freshGuest = createNewSession();
        setSessions([freshGuest]);
        setActiveSessionId(freshGuest.id);
        setActiveNode(null);
        setActiveTool(null);
      }
      return;
    }

    // 2. USER LOGGED IN OR SWITCHED ACCOUNT
    if (currentUserId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentUserId;
      loadedSessionsRef.current.clear();
      if (isStreaming) handleStop();

      // Show user's workspace
      setShowLanding(false);

      // Fetch conversations strictly for THIS account from Supabase
      fetchUserConversations().then(dbConvs => {
        if (dbConvs && dbConvs.length > 0) {
          const mapped: ChatSession[] = dbConvs.map(c => ({
            id: c.id,
            threadId: c.id,
            title: c.title || 'Conversation',
            createdAt: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            updatedAt: c.updated_at,
            messages: [],
            events: [],
          }));
          setSessions(mapped);

          const savedActiveId = localStorage.getItem(getActiveSessionStorageKey(currentUserId));
          const targetId = mapped.some(s => s.id === savedActiveId)
            ? savedActiveId!
            : mapped[0].id;

          setActiveSessionId(targetId);
          loadSessionHistory(targetId);
        } else {
          // Fresh conversation for new account (no prior conversations)
          const freshUserSession = createNewSession();
          setSessions([freshUserSession]);
          setActiveSessionId(freshUserSession.id);
        }
      });
    }
  }, [user, authLoading]);

  // Ensure active session messages are loaded if empty and not yet requested
  useEffect(() => {
    if (activeSessionId) {
      const current = sessions.find(s => s.id === activeSessionId);
      if (current && current.messages.length === 0 && !loadedSessionsRef.current.has(activeSessionId)) {
        loadSessionHistory(activeSessionId);
      }
    }
  }, [activeSessionId, sessions]);

  // Active session helper
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || createNewSession();

  // Save sessions to user-scoped localStorage whenever they change
  useEffect(() => {
    if (authLoading) return;
    try {
      const key = getSessionsStorageKey(user?.id);
      localStorage.setItem(key, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions to localStorage:', e);
    }
  }, [sessions, user?.id, authLoading]);

  // Save active session ID to user-scoped localStorage
  useEffect(() => {
    if (authLoading || !activeSessionId) return;
    try {
      const key = getActiveSessionStorageKey(user?.id);
      localStorage.setItem(key, activeSessionId);
    } catch (e) {
      console.error('Failed to save active session ID to localStorage:', e);
    }
  }, [activeSessionId, user?.id, authLoading]);

  // Handle panel resize drag
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter || !splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const newRightWidthPx = rect.right - e.clientX;
      const newPercent = Math.round((newRightWidthPx / rect.width) * 100);
      const clamped = Math.min(Math.max(newPercent, 22), 68);
      setRightPanelWidth(clamped);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
    };

    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  // Fetch initial graph schema and model configuration
  useEffect(() => {
    fetchGraphSchema()
      .then(setSchema)
      .catch(err => console.error('Failed to load schema:', err));

    fetchServerConfig()
      .then(setConfig)
      .catch(err => console.error('Failed to load config:', err));
  }, []);

  const handleNewChat = async () => {
    if (isStreaming) handleStop();
    const newSession = createNewSession();

    if (user) {
      const dbConv = await createConversation(newSession.title);
      if (dbConv && dbConv.id) {
        newSession.id = dbConv.id;
        newSession.threadId = dbConv.id;
      }
    }

    loadedSessionsRef.current.add(newSession.id);
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setSelectedDocIds([]);
    setActiveNode(null);
    setActiveTool(null);
  };

  const handleSelectSession = (id: string) => {
    if (id === activeSessionId) return;
    if (isStreaming) handleStop();
    setActiveSessionId(id);
    setActiveNode(null);
    setActiveTool(null);
    const target = sessions.find(s => s.id === id);
    setSelectedDocIds(target?.selectedFileIds || []);
    if (!target || target.messages.length === 0 || !loadedSessionsRef.current.has(id)) {
      loadSessionHistory(id);
    }
  };

  const handleSelectedDocsChange = (newIds: string[]) => {
    setSelectedDocIds(newIds);
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? { ...s, selectedFileIds: newIds, updatedAt: new Date().toISOString() }
          : s
      )
    );
  };

  const handleDeleteSession = async (id: string) => {
    const sessionToDelete = sessions.find(s => s.id === id);
    if (sessionToDelete) {
      try {
        if (user) {
          await deleteConversation(sessionToDelete.threadId);
        } else {
          await deleteThreadMemory(sessionToDelete.threadId);
        }
      } catch {
        // non-blocking
      }
    }

    const remaining = sessions.filter(s => s.id !== id);
    if (remaining.length === 0) {
      const freshSession = createNewSession();
      setSessions([freshSession]);
      setActiveSessionId(freshSession.id);
    } else {
      setSessions(remaining);
      if (activeSessionId === id) {
        setActiveSessionId(remaining[0].id);
      }
    }
  };

  const executeChatStream = async ({
    promptText,
    historyMessages,
    targetThreadId,
    assistantPlaceholderId,
    targetFileIds,
    imageData,
    mimeType,
    systemPromptPrefix,
  }: {
    promptText: string;
    historyMessages: ChatMessage[];
    targetThreadId: string;
    assistantPlaceholderId: string;
    targetFileIds: string[];
    imageData?: string;
    mimeType?: string;
    systemPromptPrefix?: string;
  }) => {
    setIsStreaming(true);
    setActiveNode('__start__');
    setActiveTool(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let accumulatedContent = '';
    const currentToolCalls: ToolCallItem[] = [];

    await streamChat(
      promptText,
      historyMessages,
      targetThreadId,
      {
        onNodeStart: (node, _label) => {
          setActiveNode(node);
        },
        onNodeEnd: (node) => {
          if (node === 'agent' && activeTool) {
            setActiveTool(null);
          }
        },
        onToken: (token) => {
          accumulatedContent += token;
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? { ...m, content: accumulatedContent }
                        : m
                    ),
                  }
                : s
            )
          );
        },
        onToolStart: (toolName, input, id) => {
          setActiveTool(toolName);
          const toolId = id || Math.random().toString(36).substring(7);
          const newTool: ToolCallItem = {
            id: toolId,
            name: toolName,
            input,
            status: 'running',
            timestamp: new Date().toLocaleTimeString(),
          };
          currentToolCalls.push(newTool);
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? { ...m, toolCalls: [...currentToolCalls] }
                        : m
                    ),
                  }
                : s
            )
          );
        },
        onToolEnd: (toolName, output, id) => {
          let matched = false;
          if (id) {
            const item = currentToolCalls.find(t => t.id === id);
            if (item) {
              item.output = output;
              item.status = 'completed';
              matched = true;
            }
          }
          if (!matched) {
            const runningItem = currentToolCalls.find(t => t.name === toolName && t.status === 'running');
            if (runningItem) {
              runningItem.output = output;
              runningItem.status = 'completed';
            } else {
              for (let i = currentToolCalls.length - 1; i >= 0; i--) {
                if (currentToolCalls[i].name === toolName) {
                  currentToolCalls[i].output = output;
                  currentToolCalls[i].status = 'completed';
                  break;
                }
              }
            }
          }
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? { ...m, toolCalls: [...currentToolCalls] }
                        : m
                    ),
                  }
                : s
            )
          );
        },
        onValidationResult: (validation) => {
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? { ...m, validation }
                        : m
                    ),
                  }
                : s
            )
          );
        },
        onEvent: (event) => {
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? { ...s, events: [...s.events, event] }
                : s
            )
          );
        },
        onThreadAssigned: (assignedThreadId: string) => {
          if (assignedThreadId && assignedThreadId !== activeSession.id) {
            setSessions(prev =>
              prev.map(s =>
                s.id === activeSession.id
                  ? { ...s, id: assignedThreadId, threadId: assignedThreadId }
                  : s
              )
            );
            setActiveSessionId(assignedThreadId);
          }
        },
        onDone: (finalContent?: string) => {
          setIsStreaming(false);
          setActiveNode(null);
          setActiveTool(null);
          currentToolCalls.forEach(t => {
            if (t.status === 'running') {
              t.status = 'completed';
            }
          });
          const resolvedText = accumulatedContent || finalContent || '';
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? {
                            ...m,
                            content: resolvedText || m.content,
                            toolCalls: [...currentToolCalls],
                            isStreaming: false
                          }
                        : m
                    ),
                  }
                : s
            )
          );
          setTimeout(() => {
            loadSessionHistory(activeSession.id, true);
          }, 600);
        },
        onError: (err) => {
          setIsStreaming(false);
          setActiveNode(null);
          setActiveTool(null);
          setSessions(prev =>
            prev.map(s =>
              s.id === activeSession.id
                ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === assistantPlaceholderId
                        ? {
                            ...m,
                            content: m.content
                              ? `${m.content}\n\n⚠️ **Execution Error:** ${err}`
                              : `⚠️ **Execution Error:** ${err}`,
                            isStreaming: false,
                          }
                        : m
                    ),
                  }
                : s
            )
          );
        },
      },
      abortController.signal,
      imageData,
      mimeType,
      tools.filter(t => t.enabled).map(t => t.id),
      targetFileIds,
      systemPromptPrefix
    );
  };

  const handleSendMessage = async (
    text: string,
    imageData?: string,
    mimeType?: string,
    pdfAttachment?: {
      filename: string;
      content_base64: string;
      tier: DocumentTier;
      size: number;
    },
    selectedFileIds?: string[]
  ) => {
    if ((!text.trim() && !imageData && !pdfAttachment) || isStreaming) return;

    // SCENARIO 1: In-chat document upload (PDF / DOCX)
    if (pdfAttachment) {
      const userPrompt = text.trim() || `Analyze and extract the key takeaways from "${pdfAttachment.filename}".`;
      const isAgentic = pdfAttachment.tier === 'agentic';

      const userMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'user',
        content: userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        pdfAttachment: {
          filename: pdfAttachment.filename,
          size: pdfAttachment.size,
          tier: pdfAttachment.tier,
        },
        selectedFileIds: selectedDocIds,
      };

      const assistantPlaceholderId = Math.random().toString(36).substring(7);
      const assistantPlaceholder: ChatMessage = {
        id: assistantPlaceholderId,
        role: 'assistant',
        content: `⚡ **Parsing & indexing \`${pdfAttachment.filename}\` (${isAgentic ? 'Agentic OCR' : 'Fast OCR'})...**\n\nExtracting document structure and embedding records into Pinecone for retrieval...`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        toolCalls: [],
        isStreaming: true,
      };

      const currentMessages = activeSession.messages;
      const updatedMessages = [...currentMessages, userMessage, assistantPlaceholder];
      const newTitle = activeSession.title === 'New Conversation' ? pdfAttachment.filename : activeSession.title;

      setSessions(prev =>
        prev.map(s =>
          s.id === activeSession.id
            ? { ...s, title: newTitle, messages: updatedMessages, updatedAt: new Date().toISOString() }
            : s
        )
      );

      setIsStreaming(true);
      setActiveNode('__start__');
      setActiveTool(null);

      try {
        const fileExt = pdfAttachment.filename.toLowerCase().endsWith('.docx') ? 'docx' : 'pdf';
        const res = await uploadDocumentApi({
          filename: pdfAttachment.filename,
          content_base64: pdfAttachment.content_base64,
          file_type: fileExt,
          mime_type: fileExt === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
          tier: pdfAttachment.tier,
          source: 'chat',
          size_bytes: pdfAttachment.size,
          wait_for_completion: true,
        });

        const docData = res.document || res;
        const newDoc: DocumentItem = normalizeDocItem(docData);
        handleAddDocument(newDoc);

        // Keep this document selected in chat until deleted/deselected
        const targetDocId = newDoc.id;
        const newSelectedIds = Array.from(new Set([...(selectedDocIds || []), targetDocId]));
        handleSelectedDocsChange(newSelectedIds);

        // Update user message with selected file ID
        setSessions(prev =>
          prev.map(s =>
            s.id === activeSession.id
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === userMessage.id
                      ? { ...m, selectedFileIds: newSelectedIds }
                      : m
                  ),
                }
              : s
          )
        );

        // Seamlessly execute query with the digitized and indexed document
        await executeChatStream({
          promptText: userPrompt,
          historyMessages: currentMessages,
          targetThreadId: activeSession.threadId,
          assistantPlaceholderId,
          targetFileIds: newSelectedIds,
        });

      } catch (err: any) {
        console.error('Chat file processing failed:', err);
        setIsStreaming(false);
        setActiveNode(null);
        setActiveTool(null);
        setSessions(prev =>
          prev.map(s =>
            s.id === activeSession.id
              ? {
                  ...s,
                  messages: s.messages.map(m =>
                    m.id === assistantPlaceholderId
                      ? {
                          ...m,
                          content: `❌ **Failed to parse and index \`${pdfAttachment.filename}\`**:\n\n${err?.message || 'Server error occurred during processing.'}`,
                          isStreaming: false,
                        }
                      : m
                  ),
                }
              : s
          )
        );
      }
      return;
    }

    // SCENARIO 2: Regular user prompt (text and/or image)
    const effectiveFileIds = (selectedFileIds && selectedFileIds.length > 0 ? selectedFileIds : selectedDocIds) || [];

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: text || (imageData ? 'Please analyze this uploaded image.' : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageData,
      mimeType,
      selectedFileIds: effectiveFileIds.length > 0 ? effectiveFileIds : undefined,
    };

    const assistantPlaceholderId = Math.random().toString(36).substring(7);
    const assistantMessage: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      toolCalls: [],
      isStreaming: true,
    };

    const currentMessages = activeSession.messages;
    const updatedMessages = [...currentMessages, userMessage, assistantMessage];

    const queryText = text.trim() || 'Image Analysis';
    const newTitle = activeSession.title === 'New Conversation'
      ? (queryText.length > 30 ? queryText.substring(0, 30) + '...' : queryText)
      : activeSession.title;

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? { ...s, title: newTitle, messages: updatedMessages, updatedAt: new Date().toISOString() }
          : s
      )
    );

    await executeChatStream({
      promptText: text || 'Please analyze this image.',
      historyMessages: currentMessages,
      targetThreadId: activeSession.threadId,
      assistantPlaceholderId,
      targetFileIds: effectiveFileIds,
      imageData,
      mimeType,
    });
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setActiveNode(null);
    setActiveTool(null);
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? {
              ...s,
              messages: s.messages.map(m => (m.isStreaming ? { ...m, isStreaming: false } : m)),
            }
          : s
      )
    );
  };

  const handleClear = () => {
    if (isStreaming) handleStop();
    setSessions(prev =>
      prev.map(s =>
        s.id === activeSession.id
          ? { ...s, messages: [], events: [], title: 'New Conversation' }
          : s
      )
    );
    setActiveNode(null);
    setActiveTool(null);
  };

  // If landing is active, show the Introduction Landing Screen
  if (showLanding) {
    return (
      <LandingPage
        onStartAsGuest={(initialPrompt?: string) => {
          setShowLanding(false);
          setActiveNavSection('conversations');
          if (initialPrompt) {
            setTimeout(() => {
              handleSendMessage(initialPrompt);
            }, 100);
          }
        }}
      />
    );
  }

  return (
    <div className="app-layout">
      {/* Top Header */}
      <Header
        config={config}
        activeNode={activeNode}
        isStreaming={isStreaming}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onShowLanding={() => setShowLanding(true)}
        onRequestUpgrade={() => setIsUpgradeModalOpen(true)}
        onSelectNavSection={setActiveNavSection}
      />

      {/* Body Area with Left Sidebar Menu + Active Section Panel */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Sidebar Menu */}
        <ChatSidebar
          sessions={sessions}
          activeSessionId={activeSession.id}
          onSelectSession={id => {
            handleSelectSession(id);
            setActiveNavSection('conversations');
          }}
          onNewChat={() => {
            handleNewChat();
            setActiveNavSection('conversations');
          }}
          onDeleteSession={handleDeleteSession}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          activeNavSection={activeNavSection}
          onSelectNavSection={setActiveNavSection}
          onOpenHistory={() => setIsHistoryModalOpen(true)}
          onRequestUpgrade={() => setIsUpgradeModalOpen(true)}
          documentsCount={documents.length}
          toolsStats={{
            enabled: tools.filter(t => t.enabled).length,
            total: tools.length,
          }}
          workflows={workflows}
          activeWorkflowId={activeWorkflowId}
          onSelectWorkflow={handleSelectWorkflow}
          onNewWorkflow={handleNewWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onOpenWorkflowsHistory={() => setIsWorkflowsHistoryOpen(true)}
        />

        {/* Dynamic Main Workspace depending on activeNavSection */}
        {activeNavSection === 'conversations' ? (
          <main
            ref={splitContainerRef}
            className="main-content"
            style={{
              userSelect: isDraggingSplitter ? 'none' : 'auto',
            }}
          >
            {/* Chatbot Interface */}
            <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
              <ChatPanel
                messages={activeSession.messages}
                onSendMessage={handleSendMessage}
                onStop={handleStop}
                onClear={handleClear}
                isStreaming={isStreaming}
                isLoadingHistory={loadingHistory}
                availableDocuments={documents}
                selectedDocumentIds={selectedDocIds}
                onSelectedDocumentsChange={handleSelectedDocsChange}
                onRequestUpgrade={() => setIsUpgradeModalOpen(true)}
                tools={tools}
              />
            </div>

            {/* Draggable Divider Handle */}
            <div
              onMouseDown={handleSplitterMouseDown}
              className={`split-resizer ${isDraggingSplitter ? 'dragging' : ''}`}
              title="Drag to resize panel width"
            />

            {/* Real-time Execution Flow Right Panel with Width Controls */}
            <div
              style={{
                width: `${rightPanelWidth}%`,
                minWidth: '280px',
                maxWidth: '75%',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <GraphPanel
                schema={schema}
                activeNode={activeNode}
                activeTool={activeTool}
                events={activeSession.events}
                messages={activeSession.messages}
                isStreaming={isStreaming}
                panelWidth={rightPanelWidth}
                onWidthChange={setRightPanelWidth}
                availableDocuments={documents}
              />
            </div>
          </main>
        ) : activeNavSection === 'documents' ? (
          <main style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <DocumentsPanel
              documents={documents}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleDeleteDocument}
              onToggleDigitized={handleToggleDigitized}
              onUpdateDocument={handleUpdateDocument}
            />
          </main>
        ) : activeNavSection === 'admin' ? (
          <main style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <AceDashboard />
          </main>
        ) : activeNavSection === 'agent-builder' ? (
          <main style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <AgentBuilderPanel
              workflow={workflows.find(w => w.id === activeWorkflowId) || null}
              onSaveWorkflow={handleSaveWorkflow}
              onExecuteInChat={handleExecuteWorkflowInChat}
              onOpenHistory={() => setIsWorkflowsHistoryOpen(true)}
              onNewWorkflow={handleNewWorkflow}
              documents={documents}
              onUploadDocument={handleUploadDocumentFromPanel}
            />
          </main>
        ) : (
          <main style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            <ToolsPanel
              tools={tools}
              onToggleTool={handleToggleTool}
              onEnableAll={handleEnableAllTools}
              onDisableAll={handleDisableAllTools}
            />
          </main>
        )}
      </div>

      {/* Conversation History Modal */}
      <ChatHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={sessions}
        activeSessionId={activeSession.id}
        onSelectSession={id => {
          handleSelectSession(id);
          setActiveNavSection('conversations');
        }}
        onDeleteSession={handleDeleteSession}
      />

      {/* Workflows History Modal */}
      <WorkflowHistoryModal
        isOpen={isWorkflowsHistoryOpen}
        onClose={() => setIsWorkflowsHistoryOpen(false)}
        workflows={workflows}
        activeWorkflowId={activeWorkflowId}
        onSelectWorkflow={(wf) => {
          handleSelectWorkflow(wf.id);
        }}
        onDeleteWorkflow={handleDeleteWorkflow}
        onDuplicateWorkflow={handleDuplicateWorkflow}
        onNewWorkflow={handleNewWorkflow}
      />

      {/* Upgrade Request Modal */}
      {isUpgradeModalOpen && (
        <UpgradeRequestModal
          profile={profile}
          onClose={() => setIsUpgradeModalOpen(false)}
          onSubmitted={() => refreshProfile()}
        />
      )}
    </div>
  );
};

export default App;
