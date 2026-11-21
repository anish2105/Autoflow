import React, { useState, useEffect } from 'react';
import {
  Play,
  Save,
  Plus,
  Code,
  History,
  Check,
  Cpu,
  Trash2,
  Sparkles,
  Layers,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  Copy,
  Terminal,
  FileCode,
  Maximize2,
} from 'lucide-react';
import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
} from '../../types/workflow';
import { DocumentItem } from '../../types';
import { ToolPaletteRibbon } from './ToolPaletteRibbon';
import { WorkflowCanvas } from './WorkflowCanvas';
import { WorkflowNodeDrawer } from './WorkflowNodeDrawer';
import { MermaidCodeModal, generateMermaidCode } from './MermaidCodeModal';
import { createWorkflowApi, updateWorkflowApi, logCanvasCodeApi, streamChat } from '../../services/api';

interface AgentBuilderPanelProps {
  workflow?: WorkflowDefinition | null;
  onSaveWorkflow?: (workflow: WorkflowDefinition) => Promise<WorkflowDefinition>;
  onExecuteInChat?: (prompt: string, workflow: WorkflowDefinition) => void;
  onOpenHistory?: () => void;
  onNewWorkflow?: () => void;
  documents?: DocumentItem[];
  onUploadDocument?: (file: File) => Promise<DocumentItem | null>;
}

function createDefaultWorkflow(): WorkflowDefinition {
  const id = `wf_${Date.now()}`;
  const inputNode: WorkflowNode = {
    id: 'node_input',
    type: 'input',
    title: 'User Query',
    category: 'all',
    icon: 'MessageSquare',
    x: 80,
    y: 180,
    config: {
      default_query: 'Artificial Intelligence and Machine Learning\nBig Data Analytics\nUser Interface Design',
    },
    status: 'idle',
  };

  const agentNode: WorkflowNode = {
    id: 'node_agent',
    type: 'agent',
    title: 'AutoFlow Decision Agent',
    category: 'all',
    icon: 'Cpu',
    x: 360,
    y: 180,
    config: {
      system_prompt_prefix: '',
    },
    status: 'idle',
  };

  const viewerNode: WorkflowNode = {
    id: 'node_viewer',
    type: 'viewer',
    title: 'Browse / Result Viewer',
    category: 'export',
    icon: 'Eye',
    x: 640,
    y: 180,
    config: {
      viewer_title: 'Synthesized Result View',
    },
    status: 'idle',
  };

  const edges: WorkflowEdge[] = [
    {
      id: 'edge_in_agent',
      fromNodeId: 'node_input',
      toNodeId: 'node_agent',
    },
    {
      id: 'edge_agent_out',
      fromNodeId: 'node_agent',
      toNodeId: 'node_viewer',
    },
  ];

  return {
    id,
    name: 'Custom Agent Pipeline',
    description: 'Visual multi-tool workflow powered by AutoFlow Agent & Completeness Validator',
    system_prompt_prefix: '',
    nodes: [inputNode, agentNode, viewerNode],
    edges,
    mermaid_code: generateMermaidCode('Custom Agent Pipeline', [inputNode, agentNode, viewerNode], edges),
  };
}

export const AgentBuilderPanel: React.FC<AgentBuilderPanelProps> = ({
  workflow: initialWorkflow,
  onSaveWorkflow,
  onExecuteInChat,
  onOpenHistory,
  onNewWorkflow,
  documents = [],
  onUploadDocument,
}) => {
  const [currentWorkflow, setCurrentWorkflow] = useState<WorkflowDefinition>(() => {
    return initialWorkflow || createDefaultWorkflow();
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isMermaidOpen, setIsMermaidOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Runtime Pipeline Execution & Formatted Output State (On-Screen Viewer)
  const [executionState, setExecutionState] = useState<{
    isRunning: boolean;
    streamOutput: string;
    activeStep: string | null;
    completed: boolean;
    prompt: string;
  }>(() => {
    const inputNode = (initialWorkflow || createDefaultWorkflow()).nodes.find((n) => n.type === 'input');
    return {
      isRunning: false,
      streamOutput: '',
      activeStep: null,
      completed: false,
      prompt:
        inputNode?.config?.default_query ||
        'Artificial Intelligence and Machine Learning\nBig Data Analytics\nUser Interface Design',
    };
  });

  // Automatically sync generated Mermaid code to coding terminal whenever tools or edges change
  useEffect(() => {
    const timer = setTimeout(() => {
      const mermaidString = generateMermaidCode(
        currentWorkflow.name,
        currentWorkflow.nodes,
        currentWorkflow.edges
      );
      logCanvasCodeApi({
        workflow_name: currentWorkflow.name,
        node_count: currentWorkflow.nodes.length,
        edge_count: currentWorkflow.edges.length,
        mermaid_code: mermaidString,
      }).catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [currentWorkflow.name, currentWorkflow.nodes, currentWorkflow.edges]);

  // Execute pipeline from on-screen output node drawer or top bar button
  const handleRunExecution = async () => {
    if (!executionState.prompt.trim() || executionState.isRunning) return;

    // Automatically auto-save current workflow and prompt to database so user never has to re-type
    handleSave();

    const agentNode = currentWorkflow.nodes.find((n) => n.type === 'agent');
    const ragNodes = currentWorkflow.nodes.filter((n) => n.type === 'rag');
    const scrapeNodes = currentWorkflow.nodes.filter((n) => n.type === 'web_scrape');

    const systemPromptPrefix =
      agentNode?.config?.system_prompt_prefix || currentWorkflow.system_prompt_prefix || '';

    const allFileIds = Array.from(
      new Set(ragNodes.flatMap((n) => n.config?.selected_file_ids || []))
    );

    const allUrls = Array.from(
      new Set(scrapeNodes.flatMap((n) => n.config?.urls || []))
    );

    const enabledTools: string[] = ['calculate', 'get_current_time'];
    if (ragNodes.length > 0 || allFileIds.length > 0) enabledTools.push('retrieve_document_context');
    if (currentWorkflow.nodes.some((n) => n.type === 'web_search')) enabledTools.push('web_search');
    if (scrapeNodes.length > 0 || allUrls.length > 0) enabledTools.push('web_scrape');
    if (currentWorkflow.nodes.some((n) => n.type === 'vision')) enabledTools.push('process_image');

    // Focus output node drawer
    const outputNode =
      currentWorkflow.nodes.find((n) => n.type === 'viewer') ||
      currentWorkflow.nodes.find((n) => n.type.startsWith('export_')) ||
      agentNode ||
      null;

    if (outputNode && selectedNodeId !== outputNode.id) {
      setSelectedNodeId(outputNode.id);
    }

    setExecutionState((prev) => ({
      ...prev,
      isRunning: true,
      streamOutput: '',
      activeStep: 'Initializing agent graph & validator...',
      completed: false,
    }));

    const threadId = `wf_run_${Date.now()}`;

    try {
      await streamChat(
        executionState.prompt,
        [],
        threadId,
        {
          onToken: (token) => {
            setExecutionState((prev) => ({ ...prev, streamOutput: prev.streamOutput + token }));
          },
          onNodeStart: (node, label) => {
            setExecutionState((prev) => ({ ...prev, activeStep: `Running node: ${label || node}` }));
          },
          onNodeEnd: (node) => {
            if (node === 'validator') {
              setExecutionState((prev) => ({
                ...prev,
                activeStep: 'Completeness Validator: Verified (>=80% evidence)',
              }));
            }
          },
          onToolStart: (toolName) => {
            setExecutionState((prev) => ({ ...prev, activeStep: `Executing tool: ${toolName}...` }));
          },
          onToolEnd: (toolName) => {
            setExecutionState((prev) => ({ ...prev, activeStep: `Completed tool: ${toolName}` }));
          },
          onEvent: () => {},
          onDone: (finalContent) => {
            if (finalContent) {
              setExecutionState((prev) => ({ ...prev, streamOutput: finalContent }));
            }
          },
          onError: (err) => {
            console.error('Run error:', err);
            setExecutionState((prev) => ({ ...prev, activeStep: `Error: ${err}` }));
          },
        },
        undefined,
        undefined,
        undefined,
        enabledTools,
        allFileIds,
        systemPromptPrefix
      );

      setExecutionState((prev) => ({
        ...prev,
        completed: true,
        activeStep: 'Execution completed successfully!',
      }));

      // Update output node to show ready status badge on canvas
      if (outputNode) {
        handleUpdateConfig(outputNode.id, { has_output: true });
      }
    } catch (err: any) {
      console.error('Execution stream failed:', err);
      setExecutionState((prev) => ({
        ...prev,
        activeStep: `Execution error: ${err.message || 'Server error'}`,
      }));
    } finally {
      setExecutionState((prev) => ({ ...prev, isRunning: false }));
    }
  };

  // Handle runtime prompt change, keeping input node config continuously synchronized
  const handlePromptChange = (prompt: string) => {
    setExecutionState((prev) => ({ ...prev, prompt }));
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) =>
        n.type === 'input'
          ? { ...n, config: { ...n.config, default_query: prompt } }
          : n
      ),
    }));
  };

  // Sync when prop changes (e.g. from history or switching workflows)
  useEffect(() => {
    if (initialWorkflow) {
      setCurrentWorkflow(initialWorkflow);
      const inputNode = initialWorkflow.nodes.find((n) => n.type === 'input');
      if (inputNode?.config?.default_query) {
        setExecutionState((prev) => ({
          ...prev,
          prompt: inputNode.config.default_query,
        }));
      }
    }
  }, [initialWorkflow]);

  const selectedNode = currentWorkflow.nodes.find((n) => n.id === selectedNodeId) || null;

  // Add node from ribbon
  const handleAddNode = (type: WorkflowNodeType, x?: number, y?: number) => {
    const newId = `node_${type}_${Date.now().toString(36)}`;
    let title = 'Tool Node';

    switch (type) {
      case 'input': title = 'User Query'; break;
      case 'rag': title = 'Document Scope (RAG)'; break;
      case 'web_scrape': title = 'Web Scraper (Firecrawl)'; break;
      case 'web_search': title = 'Web Search (Tavily)'; break;
      case 'calculate': title = 'Math Calculator'; break;
      case 'time': title = 'Date & Timezones'; break;
      case 'vision': title = 'Multimodal Vision'; break;
      case 'agent': title = 'AutoFlow Agent'; break;
      case 'export_docx': title = 'Word Document (.docx)'; break;
      case 'export_pdf': title = 'PDF Report (.pdf)'; break;
      case 'export_excel': title = 'Excel Sheet (.xlsx)'; break;
      case 'export_txt': title = 'Plain Text (.txt)'; break;
    }

    // Default position if not dropped
    const posX = x ?? 260 + Math.random() * 80;
    const posY = y ?? 140 + Math.random() * 80;

    const newNode: WorkflowNode = {
      id: newId,
      type,
      title,
      category: 'all',
      icon: 'Tool',
      x: posX,
      y: posY,
      config: {},
      status: 'idle',
    };

    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));

    setSelectedNodeId(newId);
  };

  // Node updates
  const handleUpdateNodes = (newNodes: WorkflowNode[]) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: newNodes,
    }));
  };

  const handleUpdateEdges = (newEdges: WorkflowEdge[]) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      edges: newEdges,
    }));
  };

  const handleDeleteNode = (nodeId: string) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleDeleteEdge = (edgeId: string) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  };

  const handleUpdateConfig = (nodeId: string, updatedConfig: Record<string, any>) => {
    setCurrentWorkflow((prev) => {
      const targetNode = prev.nodes.find((n) => n.id === nodeId);
      const isAgent = targetNode?.type === 'agent';
      return {
        ...prev,
        system_prompt_prefix:
          isAgent && updatedConfig.system_prompt_prefix !== undefined
            ? updatedConfig.system_prompt_prefix
            : prev.system_prompt_prefix,
        nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, config: updatedConfig } : n)),
      };
    });
  };

  const handleUpdateTitle = (nodeId: string, newTitle: string) => {
    setCurrentWorkflow((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, title: newTitle } : n)),
    }));
  };

  // Save workflow (persists query, agent prompt prefix, tool configs, and node DAG to DB)
  const handleSave = async (overrideWorkflow?: WorkflowDefinition) => {
    setIsSaving(true);
    setSaveSuccess(false);

    const baseWorkflow = overrideWorkflow || currentWorkflow;

    // Ensure input node always contains the latest runtime query prompt
    const updatedNodes = baseWorkflow.nodes.map((n) => {
      if (n.type === 'input') {
        return {
          ...n,
          config: {
            ...n.config,
            default_query: executionState.prompt || n.config?.default_query || '',
          },
        };
      }
      return n;
    });

    // Ensure agent node and top-level workflow share the latest custom system prompt prefix
    const agentNode = updatedNodes.find((n) => n.type === 'agent');
    const systemPrefix =
      agentNode?.config?.system_prompt_prefix || baseWorkflow.system_prompt_prefix || '';

    // Sync mermaid code
    const mermaid = generateMermaidCode(
      baseWorkflow.name,
      updatedNodes,
      baseWorkflow.edges
    );

    const payload: WorkflowDefinition = {
      ...baseWorkflow,
      system_prompt_prefix: systemPrefix,
      nodes: updatedNodes,
      mermaid_code: mermaid,
    };

    try {
      if (onSaveWorkflow) {
        const saved = await onSaveWorkflow(payload);
        setCurrentWorkflow(saved);
      } else {
        // Fallback direct API save
        try {
          const res = await createWorkflowApi(payload);
          if (res) setCurrentWorkflow(res.workflow || res);
        } catch {
          const res = await updateWorkflowApi(payload.id, payload);
          if (res) setCurrentWorkflow(res.workflow || res);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save workflow:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCanvas = () => {
    if (onNewWorkflow) {
      onNewWorkflow();
    } else {
      setCurrentWorkflow(createDefaultWorkflow());
      setSelectedNodeId(null);
    }
  };

  const liveMermaidString = generateMermaidCode(
    currentWorkflow.name,
    currentWorkflow.nodes,
    currentWorkflow.edges
  );

  const liveJsonString = JSON.stringify(
    {
      name: currentWorkflow.name,
      nodes: currentWorkflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        config: n.config,
      })),
      edges: currentWorkflow.edges.map((e) => ({
        from: e.fromNodeId,
        to: e.toNodeId,
      })),
    },
    null,
    2
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        background: 'var(--color-canvas)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 1. Alteryx-Style Studio Top Action Bar */}
      <div
        style={{
          height: '52px',
          background: 'var(--color-surface-white)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 30,
        }}
      >
        {/* Left: Workflow Title & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#0D3273',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Cpu size={18} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={currentWorkflow.name}
              onChange={(e) => setCurrentWorkflow((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Workflow Name..."
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                borderBottom: '1px dashed var(--border-subtle)',
                padding: '2px 4px',
                minWidth: '220px',
              }}
            />
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: 'var(--text-tertiary)',
                background: 'var(--color-surface-subtle)',
                padding: '2px 6px',
                borderRadius: '6px',
              }}
            >
              {currentWorkflow.nodes.length} nodes
            </span>
          </div>
        </div>

        {/* Right: Studio Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Browse saved workflows"
            >
              <History size={14} />
              <span>Workflows</span>
            </button>
          )}

          <button
            onClick={handleResetCanvas}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Create clean workflow"
          >
            <Plus size={14} />
            <span>New</span>
          </button>

          <button
            onClick={() => setIsMermaidOpen(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="View Mermaid code modal"
          >
            <Code size={14} />
            <span>Mermaid</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: saveSuccess ? 'rgba(22, 163, 74, 0.12)' : 'var(--color-surface)',
              border: saveSuccess ? '1px solid #16A34A' : '1px solid var(--border-subtle)',
              color: saveSuccess ? '#16A34A' : 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            {saveSuccess ? <Check size={14} color="#16A34A" /> : <Save size={14} />}
            <span>{saveSuccess ? 'Saved!' : isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            onClick={() => {
              const outputNode =
                currentWorkflow.nodes.find((n) => n.type === 'viewer') ||
                currentWorkflow.nodes.find((n) => n.type.startsWith('export_')) ||
                currentWorkflow.nodes.find((n) => n.type === 'agent') ||
                null;
              if (outputNode) {
                setSelectedNodeId(outputNode.id);
              }
              handleRunExecution();
            }}
            className="pill-button-primary"
            style={{
              padding: '6px 16px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Play size={14} />
            <span>Run Workflow</span>
          </button>
        </div>
      </div>

      {/* 2. Tool Palette Ribbon (Alteryx Categorized Tabs) */}
      <ToolPaletteRibbon onAddNode={handleAddNode} />

      {/* 3. Main Studio Workspace */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <WorkflowCanvas
          nodes={currentWorkflow.nodes}
          edges={currentWorkflow.edges}
          selectedNodeId={selectedNodeId}
          onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
          onUpdateNodes={handleUpdateNodes}
          onUpdateEdges={handleUpdateEdges}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
          onAddNode={handleAddNode}
        />

        {/* 4. Slide-over Output & Node Configuration Drawer (On-Screen Execution) */}
        <WorkflowNodeDrawer
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onUpdateConfig={handleConfigChangeWrapper}
          onUpdateTitle={handleTitleChangeWrapper}
          documents={documents}
          onUploadDocument={onUploadDocument}
          workflow={currentWorkflow}
          executionState={executionState}
          onPromptChange={handlePromptChange}
          onRunExecution={handleRunExecution}
          onExecuteInChat={onExecuteInChat}
        />
      </div>

      {/* 5. Mermaid Diagram Modal */}
      <MermaidCodeModal
        isOpen={isMermaidOpen}
        onClose={() => setIsMermaidOpen(false)}
        workflowName={currentWorkflow.name}
        nodes={currentWorkflow.nodes}
        edges={currentWorkflow.edges}
      />
    </div>
  );

  function handleConfigChangeWrapper(nodeId: string, updatedConfig: Record<string, any>) {
    handleUpdateConfig(nodeId, updatedConfig);
  }

  function handleTitleChangeWrapper(nodeId: string, newTitle: string) {
    handleUpdateTitle(nodeId, newTitle);
  }
};
