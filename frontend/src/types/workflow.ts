export type WorkflowCategory =
  | 'all'
  | 'documents'
  | 'search'
  | 'computation'
  | 'utility'
  | 'vision'
  | 'export'
  | 'viewer';

export type WorkflowNodeType =
  | 'input'
  | 'rag'
  | 'web_scrape'
  | 'web_search'
  | 'calculate'
  | 'time'
  | 'vision'
  | 'agent'
  | 'viewer'
  | 'export_pdf'
  | 'export_docx'
  | 'export_excel'
  | 'export_txt';

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'input' | 'output';
  color?: string;
}

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  title: string;
  category: string;
  icon: string;
  x: number;
  y: number;
  config: {
    system_prompt_prefix?: string;
    selected_file_ids?: string[];
    urls?: string[];
    export_title?: string;
    description?: string;
    [key: string]: any;
  };
  status?: 'idle' | 'running' | 'completed' | 'error';
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPort?: string;
  toPort?: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  system_prompt_prefix?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  mermaid_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ToolPaletteItem {
  type: WorkflowNodeType;
  title: string;
  category: WorkflowCategory;
  categoryLabel: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  defaultConfig?: Record<string, any>;
}

