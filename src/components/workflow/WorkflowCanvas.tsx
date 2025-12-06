import { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode, WorkflowEdge } from './WorkflowBuilder';
import { WorkflowNodeComponent } from './WorkflowNodeComponent';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onNodeDelete: (nodeId: string) => void;
  onAddNode?: (type: WorkflowNode['type'], position: { x: number; y: number }) => void;
  selectedNodeId: string | null;
  executionStatus: Record<string, 'pending' | 'running' | 'success' | 'error'>;
  isExecuting: boolean;
  onNodeDragStart?: (nodeId: string) => void;
  onNodeDragStop?: () => void;
}

const nodeTypes: NodeTypes = {
  custom: WorkflowNodeComponent,
};

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onNodeDelete,
  onAddNode,
  selectedNodeId,
  executionStatus,
  isExecuting,
  onNodeDragStart,
  onNodeDragStop,
}: WorkflowCanvasProps) {
  // Convert our WorkflowNode format to ReactFlow Node format
  const reactFlowNodes: Node[] = useMemo(() => {
    return nodes.map(node => ({
      id: node.id,
      type: 'custom',
      position: node.position,
      data: {
        ...node.data,
        nodeType: node.type,
        isSelected: selectedNodeId === node.id,
        status: executionStatus[node.id] || 'pending',
        onSelect: () => onNodeSelect(node.id),
        onDelete: () => onNodeDelete(node.id),
      },
    }));
  }, [nodes, selectedNodeId, executionStatus, onNodeSelect, onNodeDelete]);

  // Convert our WorkflowEdge format to ReactFlow Edge format
  const reactFlowEdges: Edge[] = useMemo(() => {
    return edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: {
        stroke: getEdgeColor(edge.source, edge.target, executionStatus),
        strokeWidth: 2,
      },
      animated: isExecuting && executionStatus[edge.source] === 'running',
    }));
  }, [edges, executionStatus, isExecuting]);

  const [reactFlowNodesState, setReactFlowNodesState, onNodesChangeInternal] = useNodesState(reactFlowNodes);
  const [reactFlowEdgesState, setReactFlowEdgesState, onEdgesChangeInternal] = useEdgesState(reactFlowEdges);

  // Sync external changes to internal state
  useEffect(() => {
    setReactFlowNodesState(reactFlowNodes);
  }, [reactFlowNodes, setReactFlowNodesState]);

  useEffect(() => {
    setReactFlowEdgesState(reactFlowEdges);
  }, [reactFlowEdges, setReactFlowEdgesState]);

  // Sync internal changes back to parent
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    // Convert back to our format and notify parent
    const updatedNodes = reactFlowNodesState.map(node => ({
      id: node.id,
      type: (node.data.nodeType || 'start') as WorkflowNode['type'],
      position: node.position,
      data: {
        ...node.data,
        label: node.data.label || '',
      },
    }));
    onNodesChange(updatedNodes);
  }, [onNodesChangeInternal, reactFlowNodesState, onNodesChange]);

  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    // Convert back to our format and notify parent
    const updatedEdges = reactFlowEdgesState.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }));
    onEdgesChange(updatedEdges);
  }, [onEdgesChangeInternal, reactFlowEdgesState, onEdgesChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: WorkflowEdge = {
        id: `edge-${Date.now()}`,
        source: params.source || '',
        target: params.target || '',
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      };
      onEdgesChange([...edges, newEdge]);
    },
    [edges, onEdgesChange]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeDragStart) {
        onNodeDragStart(node.id);
      }
    },
    [onNodeDragStart]
  );

  const handleNodeDragStop = useCallback(() => {
    if (onNodeDragStop) {
      onNodeDragStop();
    }
  }, [onNodeDragStop]);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as WorkflowNode['type'];
      
      if (!nodeType || !onAddNode || !reactFlowWrapper.current) {
        return;
      }

      // Get React Flow instance from the wrapper
      const reactFlowInstance = reactFlowWrapper.current.querySelector('.react-flow');
      if (!reactFlowInstance) {
        return;
      }

      // Get the React Flow viewport bounds
      const reactFlowBounds = reactFlowInstance.getBoundingClientRect();
      
      // Calculate position relative to React Flow viewport
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      // Get the viewport element to extract transform
      const viewport = reactFlowInstance.querySelector('.react-flow__viewport') as HTMLElement;
      if (viewport) {
        const transform = window.getComputedStyle(viewport).transform;
        
        // Parse transform matrix: matrix(scaleX, skewY, skewX, scaleY, translateX, translateY)
        if (transform && transform !== 'none') {
          const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
          if (matrixMatch) {
            const values = matrixMatch[1].split(',').map(parseFloat);
            const scaleX = values[0] || 1;
            const translateX = values[4] || 0;
            const translateY = values[5] || 0;
            
            // Convert screen position to flow coordinate space
            const flowPosition = {
              x: (position.x - translateX) / scaleX,
              y: (position.y - translateY) / scaleX,
            };
            
            onAddNode(nodeType, flowPosition);
            return;
          }
        }
      }
      
      // Fallback: use position directly (no transform)
      onAddNode(nodeType, position);
    },
    [onAddNode]
  );

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={reactFlowNodesState}
        edges={reactFlowEdgesState}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-background"
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

function getEdgeColor(
  sourceId: string,
  targetId: string,
  executionStatus: Record<string, 'pending' | 'running' | 'success' | 'error'>
): string {
  const sourceStatus = executionStatus[sourceId];
  if (sourceStatus === 'success') return '#10b981'; // green
  if (sourceStatus === 'running') return '#3b82f6'; // blue
  if (sourceStatus === 'error') return '#ef4444'; // red
  return '#6b7280'; // gray
}
