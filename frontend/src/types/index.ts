export interface GraphNode {
  id: string;
  label: string;
  type: 'start' | 'llm' | 'tool' | 'validator' | 'synthesizer' | 'end';
  description: string;
  icon: string;
  color: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: 'direct' | 'conditional' | 'loop';
  label: string;
}

export interface ToolMeta {
  name: string;
  description: string;
}

export interface GraphSchema {
  nodes: GraphNode[];
  edges: GraphEdge[];
  tools: ToolMeta[];
  model: string;
  features?: string[];
}

export interface ToolCallItem {
  id?: string;
  name: string;
  input?: any;
  output?: string;
  status: 'running' | 'completed' | 'error';
  timestamp?: string;
  latency_ms?: number;
}

export interface ValidationResult {
  sufficient: boolean;
  confidence: number;
  missing_information?: string[];
  issues?: string[];
  critique?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  imageData?: string;
  mimeType?: string;
  pdfAttachment?: {
    filename: string;
    size: number;
    tier: DocumentTier;
    docId?: string;
  };
  selectedFileIds?: string[];
  toolCalls?: ToolCallItem[];
  validation?: ValidationResult;
  isStreaming?: boolean;
}

export interface ExecutionEvent {
  id: string;
  timestamp: string;
  node: string;
  action: string;
  details?: any;
  latency_ms?: number;
  type: 'node_start' | 'node_end' | 'tool_start' | 'tool_end' | 'validation_result' | 'token' | 'done' | 'error';
}

export interface ServerConfig {
  model: string;
  temperature: number;
  api_key_configured: boolean;
}

export interface ChatSession {
  id: string;
  threadId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  events: ExecutionEvent[];
  selectedFileIds?: string[];
}

export type NavSection = 'conversations' | 'documents' | 'agent-builder' | 'tools' | 'admin';

export type UserTier = 'pleasant' | 'jack' | 'king' | 'ace';

export interface UserProfile {
  user_id: string | null;
  email: string | null;
  tier: UserTier;
  tier_name: string;
  max_messages: number; // -1 = unlimited
  max_documents: number; // -1 = unlimited
  max_images: number; // -1 = unlimited
  consumed_messages: number;
  consumed_documents: number;
  consumed_images: number;
  allowed_tools: string[];
  can_access_admin: boolean;
  can_upgrade: boolean;
  custom_overrides: boolean;
  custom_msg_limit?: number | null;
  custom_doc_limit?: number | null;
  usage?: {
    messages_used: number;
    documents_uploaded: number;
    images_analyzed: number;
  };
}

export interface UpgradeRequestItem {
  id: string;
  user_id: string;
  user_email: string;
  current_tier: string;
  requested_tier: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminMetrics {
  total_users: number;
  king_users: number;
  jack_users: number;
  ace_users: number;
  pending_upgrades: number;
  total_documents_consumed: number;
  total_messages_consumed: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  tier: UserTier;
  tier_name: string;
  created_at: string;
  max_messages: number;
  max_documents: number;
  max_images: number;
  consumed_messages: number;
  consumed_documents: number;
  consumed_images: number;
  custom_doc_limit?: number | null;
  custom_msg_limit?: number | null;
  custom_tools?: string[] | null;
  status: string;
}

export interface ParsedPage {
  page_number: number;
  markdown: string;
}

export type DocumentTier = 'fast' | 'agentic';
export type DocumentStatus = 'uploaded' | 'processing' | 'digitized' | 'failed';

export interface DocumentItem {
  id: string;
  name: string;
  size: number;
  type: 'pdf' | 'excel' | 'image' | 'docx' | 'other';
  mimeType: string;
  base64: string;
  tier?: DocumentTier;
  status?: DocumentStatus;
  digitized: boolean; // Yes or No
  uploadedAt: string;
  source?: 'upload' | 'chat';
  parsedMarkdown?: string;
  parsedPages?: ParsedPage[];
  errorMessage?: string;
}


export interface ToolConfigItem {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  icon: string;
  usageCount?: number;
}

