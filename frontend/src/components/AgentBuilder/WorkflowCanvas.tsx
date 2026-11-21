import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeType,
  ToolPaletteItem,
} from '../../types/workflow';
import {
  BookOpen,
  Globe,
  FileCode,
  Calculator,
  Clock,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  FileEdit,
  MessageSquare,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Cpu,
  Layers,
  Eye,
} from 'lucide-react';

const NODE_WIDTH = 220;
const NODE_HEIGHT = 92;

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: WorkflowNode | null) => void;
  onUpdateNodes: (nodes: WorkflowNode[]) => void;
  onUpdateEdges: (edges: WorkflowEdge[]) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onAddNode: (type: WorkflowNodeType, x?: number, y?: number) => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onUpdateNodes,
  onUpdateEdges,
  onDeleteNode,
  onDeleteEdge,
  onAddNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Dragging Nodes
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Wire Connection (Click or Drag from port)
  const [pendingWire, setPendingWire] = useState<{
    fromNodeId: string;
    fromX: number;
    fromY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Hovered edge for delete button
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Helper: Get node color and icon
  const getNodeColor = (type: WorkflowNodeType) => {
    switch (type) {
      case 'input': return '#0D3273';
      case 'rag': return '#2563EB';
      case 'web_scrape': return '#EA580C';
      case 'web_search': return '#0284C7';
      case 'calculate': return '#16A34A';
      case 'time': return '#0D9488';
      case 'vision': return '#7C3AED';
      case 'agent': return '#0D3273';
      case 'viewer': return '#4F46E5';
      case 'export_docx': return '#2563EB';
      case 'export_pdf': return '#DC2626';
      case 'export_excel': return '#16A34A';
      case 'export_txt': return '#64748B';
      default: return '#0D3273';
    }
  };

  const renderNodeIcon = (type: WorkflowNodeType) => {
    const size = 18;
    switch (type) {
      case 'input': return <MessageSquare size={size} color="#0D3273" />;
      case 'rag': return <BookOpen size={size} color="#2563EB" />;
      case 'web_scrape': return <FileCode size={size} color="#EA580C" />;
      case 'web_search': return <Globe size={size} color="#0284C7" />;
      case 'calculate': return <Calculator size={size} color="#16A34A" />;
      case 'time': return <Clock size={size} color="#0D9488" />;
      case 'vision': return <ImageIcon size={size} color="#7C3AED" />;
      case 'agent': return <Cpu size={size} color="#0D3273" />;
      case 'viewer': return <Eye size={size} color="#4F46E5" />;
      case 'export_docx': return <FileEdit size={size} color="#2563EB" />;
      case 'export_pdf': return <FileText size={size} color="#DC2626" />;
      case 'export_excel': return <FileSpreadsheet size={size} color="#16A34A" />;
      case 'export_txt': return <FileText size={size} color="#64748B" />;
      default: return <Sparkles size={size} color="#0D3273" />;
    }
  };

  const getNodeSummary = (node: WorkflowNode) => {
    switch (node.type) {
      case 'agent':
        return node.config.system_prompt_prefix
          ? 'Custom instructions active'
          : 'Decision Agent + Validator Gate';
      case 'rag':
        const fileCount = (node.config.selected_file_ids || []).length;
        return fileCount > 0 ? `${fileCount} doc(s) in scope` : 'Click to select documents';
      case 'web_scrape':
        const urlCount = (node.config.urls || []).length;
        return urlCount > 0 ? `${urlCount} target URL(s)` : 'Click to add URLs';
      case 'web_search':
        return 'Autonomous Tavily search';
      case 'calculate':
        return 'Deterministic math';
      case 'time':
        return 'Current timestamps & zones';
      case 'vision':
        return 'Multimodal visual OCR';
      case 'input':
        return 'Workflow trigger query';
      case 'viewer':
        return node.config.has_output ? '✓ Result Ready (Click to View)' : 'Browse formatted result';
      case 'export_pdf':
      case 'export_docx':
      case 'export_excel':
      case 'export_txt':
        return node.config.export_title || 'Export on completion';
      default:
        return 'Ready';
    }
  };

  // Convert mouse event to canvas space
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      return { x, y };
    },
    [pan, zoom]
  );

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((prev) => Math.min(Math.max(0.4, prev * zoomFactor), 2.0));
  };

  // Canvas Pan Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
    }
  };

  // Mouse Move on Canvas
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingNodeId) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      onUpdateNodes(
        nodes.map((node) =>
          node.id === draggingNodeId
            ? { ...node, x: Math.round(coords.x - dragOffset.x), y: Math.round(coords.y - dragOffset.y) }
            : node
        )
      );
      return;
    }

    if (pendingWire) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      setPendingWire((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Drag over dropzone for palette items
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const toolData = e.dataTransfer.getData('application/autoflow-tool');
    if (!toolData) return;

    try {
      const tool: ToolPaletteItem = JSON.parse(toolData);
      const coords = screenToCanvas(e.clientX, e.clientY);
      onAddNode(tool.type, coords.x - NODE_WIDTH / 2, coords.y - NODE_HEIGHT / 2);
    } catch (err) {
      console.error('Failed to parse dropped tool:', err);
    }
  };

  // Port Connections
  const hasInputPort = (type: WorkflowNodeType) => type !== 'input';
  const hasOutputPort = (type: WorkflowNodeType) => !type.startsWith('export_') && type !== 'viewer';

  const startWireConnection = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    const fromX = node.x + NODE_WIDTH;
    const fromY = node.y + NODE_HEIGHT / 2;
    setPendingWire({
      fromNodeId: node.id,
      fromX,
      fromY,
      currentX: fromX,
      currentY: fromY,
    });
  };

  const completeWireConnection = (e: React.MouseEvent, targetNode: WorkflowNode) => {
    e.stopPropagation();
    if (!pendingWire) return;
    if (pendingWire.fromNodeId === targetNode.id) {
      setPendingWire(null);
      return;
    }

    // Check if edge already exists
    const exists = edges.some(
      (edge) => edge.fromNodeId === pendingWire.fromNodeId && edge.toNodeId === targetNode.id
    );

    if (!exists) {
      const newEdge: WorkflowEdge = {
        id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fromNodeId: pendingWire.fromNodeId,
        toNodeId: targetNode.id,
      };
      onUpdateEdges([...edges, newEdge]);
    }

    setPendingWire(null);
  };

  // Global escape / cancel wire
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPendingWire(null);
      } else if (e.key === 'Delete' && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, onDeleteNode]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--color-canvas)',
        backgroundImage: 'radial-gradient(circle, #CBD5E1 1.2px, transparent 1.2px)',
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
        cursor: isPanning ? 'grabbing' : 'default',
        userSelect: 'none',
      }}
    >
      {/* Canvas Controls Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--color-surface-white)',
          padding: '6px 10px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setZoom((prev) => Math.min(2.0, prev + 0.15))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            minWidth: '38px',
            textAlign: 'center',
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((prev) => Math.max(0.4, prev - 0.15))}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 2px' }} />
        <button
          onClick={() => {
            setZoom(1);
            setPan({ x: 40, y: 40 });
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Reset View"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Helpful Hint banner when canvas is empty */}
      {nodes.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'var(--text-tertiary)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(13, 50, 115, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0D3273',
            }}
          >
            <Layers size={32} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Start Building Your Agent Pipeline
          </div>
          <div style={{ fontSize: '0.85rem', maxWidth: '380px', lineHeight: 1.5 }}>
            Drag tools from the Alteryx ribbon above or click tools to add them. Connect ports to wire inputs, RAG scopes, web scrapers, and export formats into the AutoFlow Agent.
          </div>
        </div>
      )}

      {/* Transformed Canvas Container */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* SVG Layer for Edges */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '8000px',
            height: '8000px',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#0D3273" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#2563EB" />
            </marker>
          </defs>

          {/* Render Existing Edges */}
          {edges.map((edge) => {
            const fromNode = nodes.find((n) => n.id === edge.fromNodeId);
            const toNode = nodes.find((n) => n.id === edge.toNodeId);
            if (!fromNode || !toNode) return null;

            const x1 = fromNode.x + NODE_WIDTH;
            const y1 = fromNode.y + NODE_HEIGHT / 2;
            const x2 = toNode.x;
            const y2 = toNode.y + NODE_HEIGHT / 2;
            const dx = Math.max(50, Math.abs(x2 - x1) * 0.5);

            const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isHovered = hoveredEdgeId === edge.id;

            return (
              <g key={edge.id} style={{ pointerEvents: 'auto' }}>
                {/* Invisible wider path for easier clicking/hovering */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  onMouseEnter={() => setHoveredEdgeId(edge.id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                  style={{ cursor: 'pointer' }}
                />
                {/* Visible curve */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isHovered ? '#DC2626' : '#0D3273'}
                  strokeWidth={isHovered ? '2.5' : '2'}
                  strokeDasharray={isHovered ? '4 4' : 'none'}
                  markerEnd={isHovered ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  style={{ transition: 'stroke 0.15s ease' }}
                />
                {/* Delete button on hover */}
                {isHovered && (
                  <g
                    transform={`translate(${midX - 10}, ${midY - 10})`}
                    onClick={() => onDeleteEdge(edge.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx="10" cy="10" r="10" fill="#DC2626" />
                    <text
                      x="10"
                      y="14"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="bold"
                    >
                      ×
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Pending Wire Curve */}
          {pendingWire && (
            <path
              d={`M ${pendingWire.fromX} ${pendingWire.fromY} C ${
                pendingWire.fromX + Math.max(50, Math.abs(pendingWire.currentX - pendingWire.fromX) * 0.5)
              } ${pendingWire.fromY}, ${
                pendingWire.currentX - Math.max(50, Math.abs(pendingWire.currentX - pendingWire.fromX) * 0.5)
              } ${pendingWire.currentY}, ${pendingWire.currentX} ${pendingWire.currentY}`}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
          )}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const nodeColor = getNodeColor(node.type);
          const showInput = hasInputPort(node.type);
          const showOutput = hasOutputPort(node.type);

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node);
              }}
              onMouseDown={(e) => {
                // Ignore port clicks for dragging node
                if ((e.target as HTMLElement).dataset.port) return;
                e.stopPropagation();
                setDraggingNodeId(node.id);
                const coords = screenToCanvas(e.clientX, e.clientY);
                setDragOffset({
                  x: coords.x - node.x,
                  y: coords.y - node.y,
                });
                onSelectNode(node);
              }}
              style={{
                position: 'absolute',
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
                background: 'var(--color-surface-white)',
                borderRadius: '12px',
                border: isSelected
                  ? `2px solid ${nodeColor}`
                  : '1px solid var(--border-subtle)',
                boxShadow: isSelected
                  ? `0 8px 24px rgba(13, 50, 115, 0.18)`
                  : '0 3px 12px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '10px 12px',
                cursor: draggingNodeId === node.id ? 'grabbing' : 'grab',
                transition: draggingNodeId === node.id ? 'none' : 'border 0.15s ease, box-shadow 0.15s ease',
                zIndex: isSelected ? 20 : 10,
              }}
            >
              {/* Left Input Port */}
              {showInput && (
                <div
                  data-port="input"
                  onClick={(e) => completeWireConnection(e, node)}
                  title="Connect tool output to this input"
                  style={{
                    position: 'absolute',
                    left: '-8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: `3px solid ${nodeColor}`,
                    cursor: pendingWire ? 'pointer' : 'crosshair',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)';
                    e.currentTarget.style.background = nodeColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                    e.currentTarget.style.background = '#FFFFFF';
                  }}
                />
              )}

              {/* Right Output Port */}
              {showOutput && (
                <div
                  data-port="output"
                  onClick={(e) => startWireConnection(e, node)}
                  title="Click to drag wire to target input"
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: nodeColor,
                    border: '3px solid #FFFFFF',
                    cursor: 'crosshair',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  }}
                />
              )}

              {/* Node Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: `${nodeColor}14`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {renderNodeIcon(node.type)}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        maxWidth: '125px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={node.title}
                    >
                      {node.title}
                    </div>
                  </div>
                </div>

                {/* Node Status or Delete Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {node.status === 'running' && (
                    <Loader2 size={14} className="animate-spin" color="#2563EB" />
                  )}
                  {node.status === 'completed' && (
                    <CheckCircle2 size={14} color="#16A34A" />
                  )}
                  {node.status === 'error' && (
                    <AlertCircle size={14} color="#DC2626" />
                  )}

                  {isSelected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNode(node.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#DC2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                      title="Delete Node"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Node Card Body / Config Preview */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  background: 'var(--color-surface-subtle)',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getNodeSummary(node)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

