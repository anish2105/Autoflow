import { GraphSchema, ServerConfig, ChatMessage, ExecutionEvent, ToolConfigItem } from '../types';
import { supabase } from './supabase';

const rawBase = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const API_BASE = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`) : '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  } catch {
    // continue without token if not available
  }
  return headers;
}

export async function fetchGraphSchema(): Promise<GraphSchema> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/graph/schema`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Failed to load graph schema: ${res.statusText}`);
  return res.json();
}

export async function fetchServerConfig(): Promise<ServerConfig> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/graph/config`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Failed to load server config: ${res.statusText}`);
  return res.json();
}

export async function fetchThreadHistory(threadId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/chat/threads/${threadId}/history`, { headers: authHeaders });
  if (!res.ok) throw new Error(`Failed to load thread history: ${res.statusText}`);
  return res.json();
}

export async function deleteThreadMemory(threadId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/chat/threads/${threadId}`, { method: 'DELETE', headers: authHeaders });
  if (!res.ok) throw new Error(`Failed to clear thread memory: ${res.statusText}`);
  return res.json();
}

export async function fetchUserConversations(): Promise<any[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/conversations`, { headers: authHeaders });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function createConversation(title: string): Promise<any> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteConversation(conversationId: string): Promise<any> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchConversationMessages(
  conversationId: string
): Promise<{ messages: ChatMessage[]; events: ExecutionEvent[] }> {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}/messages`, {
      headers: authHeaders,
    });
    if (!res.ok) return { messages: [], events: [] };
    const data = await res.json();
    if (Array.isArray(data)) {
      return { messages: data, events: [] };
    }
    return {
      messages: data.messages || [],
      events: data.events || [],
    };
  } catch (err) {
    console.error('Failed to fetch conversation messages:', err);
    return { messages: [], events: [] };
  }
}

export interface StreamCallbacks {
  onNodeStart: (node: string, label?: string) => void;
  onNodeEnd: (node: string, output?: string) => void;
  onToken: (token: string) => void;
  onToolStart: (toolName: string, input: any, id?: string) => void;
  onToolEnd: (toolName: string, output: string, id?: string) => void;
  onValidationResult?: (validation: any) => void;
  onEvent: (event: ExecutionEvent) => void;
  onThreadAssigned?: (threadId: string) => void;
  onDone: (finalContent?: string) => void;
  onError: (error: string) => void;
}

export async function streamChat(
  message: string,
  history: ChatMessage[],
  threadId: string,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal,
  imageData?: string,
  mimeType?: string,
  enabledTools?: string[],
  selectedFileIds?: string[]
) {
  const payloadHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role,
      content: m.content,
      image_data: m.imageData,
      mime_type: m.mimeType,
    }));

  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        message,
        thread_id: threadId,
        history: payloadHistory,
        image_data: imageData,
        mime_type: mimeType,
        enabled_tools: enabledTools,
        selected_file_ids: selectedFileIds || [],
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP Error ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = 'message';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim();
        } else if (trimmed.startsWith('data:')) {
          const rawData = trimmed.replace('data:', '').trim();
          try {
            const data = JSON.parse(rawData);
            const now = new Date().toLocaleTimeString();

            if (data.thread_id && callbacks.onThreadAssigned) {
              callbacks.onThreadAssigned(data.thread_id);
            }

            if (currentEvent === 'node_start') {
              callbacks.onNodeStart(data.node, data.label);
              callbacks.onEvent({
                id: Math.random().toString(36).substring(7),
                timestamp: now,
                node: data.node,
                action: data.action || `Entering node [${data.node}]`,
                details: data,
                type: 'node_start',
              });
            } else if (currentEvent === 'node_end') {
              callbacks.onNodeEnd(data.node, data.output);
              callbacks.onEvent({
                id: Math.random().toString(36).substring(7),
                timestamp: now,
                node: data.node,
                action: `Completed node [${data.node}]`,
                details: data,
                type: 'node_end',
              });
            } else if (currentEvent === 'token') {
              callbacks.onToken(data.delta);
            } else if (currentEvent === 'tool_start') {
              callbacks.onToolStart(data.tool_name, data.input, data.id);
              callbacks.onEvent({
                id: data.id || Math.random().toString(36).substring(7),
                timestamp: now,
                node: 'tools',
                action: `Invoking tool: ${data.tool_name}`,
                details: data.input,
                type: 'tool_start',
              });
            } else if (currentEvent === 'tool_end') {
              callbacks.onToolEnd(data.tool_name, data.output, data.id);
              callbacks.onEvent({
                id: data.id || Math.random().toString(36).substring(7),
                timestamp: now,
                node: 'tools',
                action: `Tool result: ${data.tool_name}`,
                details: data.output,
                type: 'tool_end',
              });
            } else if (currentEvent === 'validation_result') {
              if (callbacks.onValidationResult) {
                callbacks.onValidationResult(data);
              }
              const statusStr = data.sufficient ? 'SUFFICIENT' : 'INSUFFICIENT';
              const score = typeof data.completeness_score === 'number' ? data.completeness_score : Math.round((data.confidence || 0) * 100);
              callbacks.onEvent({
                id: Math.random().toString(36).substring(7),
                timestamp: now,
                node: 'validator',
                action: `Task Completeness: ${statusStr} (${Math.round(score)}%)`,
                details: data,
                type: 'validation_result',
              });
            } else if (currentEvent === 'done') {
              callbacks.onDone(data.content);
            } else if (currentEvent === 'error') {
              callbacks.onError(data.error || 'Unknown error occurred');
            }
          } catch {
            // raw text line
          }
        }
      }
    }

    callbacks.onDone();
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      callbacks.onError(err.message || 'Stream connection error');
    }
  }
}

export async function generateExport(
  format: 'txt' | 'pdf' | 'xlsx',
  content: string,
  title?: string,
  conversationId?: string
): Promise<{ status: string; export_id: string; filename: string; file_type: string; size_bytes: number; download_url: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/exports/generate`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      format,
      content,
      title: title || 'AutoFlow Export',
      conversation_id: conversationId || null
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Export failed');
  }
  return res.json();
}

export function triggerFileDownload(downloadUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ==============================================================================
// Documents & LlamaCloud OCR API Services
// ==============================================================================

export interface UploadDocPayload {
  filename: string;
  content_base64: string;
  file_type?: string;
  mime_type?: string;
  tier?: 'fast' | 'agentic';
  source?: 'upload' | 'chat';
  size_bytes?: number;
  wait_for_completion?: boolean;
}

export async function uploadDocumentApi(payload: UploadDocPayload): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: payload.filename,
      content_base64: payload.content_base64,
      file_type: payload.file_type || 'pdf',
      mime_type: payload.mime_type || 'application/pdf',
      tier: payload.tier || 'fast',
      source: payload.source || 'upload',
      size_bytes: payload.size_bytes,
      wait_for_completion: payload.wait_for_completion || false,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function fetchDocumentsApi(): Promise<{ documents: any[]; count: number }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error('Failed to fetch documents');
  }
  return res.json();
}

export async function fetchDocumentDetailsApi(docId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error('Failed to fetch document details');
  }
  return res.json();
}

export async function fetchDocumentStatusApi(docId: string): Promise<{
  id: string;
  status: 'uploaded' | 'processing' | 'digitized' | 'failed';
  digitized: boolean;
  error_message?: string;
  tier: string;
  has_parsed_markdown: boolean;
  pages_count: number;
}> {
  const res = await fetch(`${API_BASE}/documents/${docId}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch document status');
  }
  return res.json();
}

export async function deleteDocumentApi(docId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error('Failed to delete document');
  }
  return res.json();
}

// ==========================================
// User Profile, Quota & Tier Upgrade API
// ==========================================

export async function fetchUserProfileApi(): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/user/profile`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error('Failed to fetch user profile');
  }
  const data = await res.json();
  return data.profile;
}

export async function submitUpgradeRequestApi(requestedTier: string, reason?: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/user/upgrade-request`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requested_tier: requestedTier,
      reason: reason || '',
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to submit upgrade request');
  }
  return res.json();
}

export async function fetchUserToolsApi(): Promise<{ success: boolean; tools: ToolConfigItem[] | null; allowed_tools: string[] }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/user/tools`, { headers: authHeaders });
  if (!res.ok) {
    throw new Error('Failed to fetch user tools configuration');
  }
  return res.json();
}

export async function updateUserToolsApi(tools: ToolConfigItem[]): Promise<{ success: boolean; message: string; tools: ToolConfigItem[] }> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/user/tools`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tools }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update user tools configuration');
  }
  return res.json();
}

// ==========================================
// Ace Super Admin API
// ==========================================

export async function fetchAdminMetricsApi(): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/metrics`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch admin metrics');
  }
  const data = await res.json();
  return data.metrics;
}

export async function fetchAdminUsersApi(): Promise<any[]> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch admin users list');
  }
  const data = await res.json();
  return data.users || [];
}

export async function updateUserTierApi(userId: string, newTier: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/users/${userId}/tier`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier: newTier }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update user tier');
  }
  return res.json();
}

export async function updateUserLimitsApi(
  userId: string,
  limits: { custom_doc_limit?: number | null; custom_msg_limit?: number | null; custom_tools?: string[] | null }
): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/users/${userId}/limits`, {
    method: 'PUT',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(limits),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to update user limits');
  }
  return res.json();
}

export async function fetchAdminUpgradeRequestsApi(): Promise<any[]> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/upgrade-requests`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to fetch upgrade requests');
  }
  const data = await res.json();
  return data.requests || [];
}

export async function reviewUpgradeRequestApi(requestId: string, status: 'approved' | 'rejected'): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/admin/upgrade-requests/${requestId}/review`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to review upgrade request');
  }
  return res.json();
}

