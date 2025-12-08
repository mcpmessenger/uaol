import { useState, useCallback, useEffect, useRef, useMemo, type SetStateAction } from 'react';
import * as Y from '../../vendor/yjs';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkflowCanvas } from './WorkflowCanvas';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WorkflowToolbar } from './WorkflowToolbar';
import { Save, Play, Trash2, RotateCcw, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowNode {
  id: string;
  type: 'start' | 'file-upload' | 'text-extraction' | 'rag-indexing' | 'rag-query' | 'ai-generation' | 'mcp-tool' | 'end';
  position: { x: number; y: number };
  data: {
    label: string;
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

type CollaborationConfig = {
  shareableLinkId: string;
  token: string;
  permission?: 'read' | 'editor';
};

interface WorkflowBuilderProps {
  onClose?: () => void;
  initialWorkflow?: WorkflowDefinition;
  template?: 'document-analysis-rag' | 'custom';
  tabId?: string;
  workflowName?: string;
  isDirty?: boolean;
  onSave?: (tabId: string) => Promise<boolean>;
  onNameChange?: (name: string) => void;
  onWorkflowChange?: (workflow: WorkflowDefinition) => void;
  workflowId?: string;
  collabConfig?: CollaborationConfig;
  collabUrl?: string;
}

export function WorkflowBuilder({ 
  onClose, 
  initialWorkflow, 
  template,
  tabId,
  workflowName: propWorkflowName,
  isDirty: propIsDirty,
  onSave,
  onNameChange,
  onWorkflowChange,
  workflowId,
  collabConfig,
  collabUrl,
}: WorkflowBuilderProps) {
  // Initialize nodes and edges
  const [nodes, setNodes] = useState<WorkflowNode[]>(() => {
    return initialWorkflow?.nodes || getDefaultDocumentAnalysisWorkflow().nodes;
  });
  const [edges, setEdges] = useState<WorkflowEdge[]>(() => {
    return initialWorkflow?.edges || getDefaultDocumentAnalysisWorkflow().edges;
  });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState(propWorkflowName || initialWorkflow?.name || 'Document Analysis & RAG');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<Record<string, 'pending' | 'running' | 'success' | 'error'>>({});
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [collabStatus, setCollabStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>(collabConfig ? 'connecting' : 'idle');
  const [collabPermission, setCollabPermission] = useState<'read' | 'editor'>(collabConfig?.permission || 'editor');
  const [collabError, setCollabError] = useState<string | null>(null);
  const [shareLinkId, setShareLinkId] = useState<string | undefined>(collabConfig?.shareableLinkId);
  const [shareToken, setShareToken] = useState<string | undefined>(collabConfig?.token);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const docRef = useRef<Y.Doc | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const collabPermissionRef = useRef(collabPermission);
  const collabWsUrl = useMemo(() => {
    const raw = collabUrl || import.meta.env.VITE_COLLAB_WS_URL || 'ws://localhost:3007/ws/collab';
    try {
      const parsed = new URL(raw);
      if (!parsed.pathname || parsed.pathname === '/' || parsed.pathname === '') {
        parsed.pathname = '/ws/collab';
      }
      return parsed.toString();
    } catch {
      const normalized = raw.endsWith('/ws/collab') ? raw : `${raw.replace(/\/$/, '')}/ws/collab`;
      return normalized;
    }
  }, [collabUrl]);
  
  // Undo/Redo history
  type WorkflowState = { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  const [history, setHistory] = useState<WorkflowState[]>(() => {
    const initialNodes = initialWorkflow?.nodes || getDefaultDocumentAnalysisWorkflow().nodes;
    const initialEdges = initialWorkflow?.edges || getDefaultDocumentAnalysisWorkflow().edges;
    return [{ 
      nodes: [...initialNodes], 
      edges: [...initialEdges] 
    }];
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoRef = useRef(false);
  const historyIndexRef = useRef(0);

  // Sync with prop changes (when switching tabs)
  // Use a ref to track the last workflow and tab to prevent unnecessary resets
  const lastWorkflowRef = useRef<WorkflowDefinition | undefined>();
  const lastTabIdRef = useRef<string | undefined>(tabId);
  const isInitialMount = useRef(true);
  const skipNextSync = useRef(false);
  
  useEffect(() => {
    // Skip sync if this was triggered by our own update
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    // Check if tab changed (switching tabs)
    const tabChanged = tabId !== lastTabIdRef.current;
    if (tabChanged) {
      lastTabIdRef.current = tabId;
      isInitialMount.current = true; // Treat tab switch as initial mount
    }

    if (initialWorkflow) {
      // Only update if this is actually a different workflow (different name or tab change)
      // Don't use node IDs in comparison as they change when nodes are added/removed
      const workflowKey = `${tabId || 'no-tab'}-${initialWorkflow.name}`;
      const lastKey = lastWorkflowRef.current 
        ? `${lastTabIdRef.current || 'no-tab'}-${lastWorkflowRef.current.name}`
        : '';
      
      // On initial mount or tab change, always set the workflow
      // Also update if workflow name changed (different workflow)
      if (isInitialMount.current || tabChanged || workflowKey !== lastKey) {
        isInitialMount.current = false;
        lastWorkflowRef.current = initialWorkflow;
        
        // Only update if we have valid nodes
        const newNodes = initialWorkflow.nodes || [];
        if (newNodes.length > 0 || nodes.length === 0) {
          console.log('[WorkflowBuilder] Updating nodes from initialWorkflow', { 
            nodeCount: newNodes.length,
            workflowName: initialWorkflow.name,
            tabId,
            tabChanged
          });
          const newEdges = initialWorkflow.edges || [];
          setNodes(newNodes);
          setEdges(newEdges);
          // Reset history when loading a new workflow
          const initialState = { nodes: newNodes, edges: newEdges };
          setHistory([initialState]);
          setHistoryIndex(0);
          historyIndexRef.current = 0;
        } else {
          console.warn('[WorkflowBuilder] Skipping node update - would clear existing nodes', {
            currentNodes: nodes.length,
            newNodes: newNodes.length
          });
        }
      }
    } else if (lastWorkflowRef.current && !isInitialMount.current) {
      // If initialWorkflow becomes undefined after mount, don't clear nodes (might be loading)
      console.warn('[WorkflowBuilder] initialWorkflow became undefined, keeping current nodes');
      lastWorkflowRef.current = undefined;
    }
  }, [initialWorkflow, tabId]);

  useEffect(() => {
    if (propWorkflowName) {
      setWorkflowName(propWorkflowName);
    }
  }, [propWorkflowName]);

  // Keep the current permission in a ref for socket send logic
  useEffect(() => {
    collabPermissionRef.current = collabPermission;
  }, [collabPermission]);

  useEffect(() => {
    setShareLinkId(collabConfig?.shareableLinkId);
    setShareToken(collabConfig?.token);
    if (collabConfig?.permission) {
      setCollabPermission(collabConfig.permission);
    }
  }, [collabConfig]);

  // Initialize Yjs doc and hydrate state from it
  useEffect(() => {
    if (!docRef.current) {
      docRef.current = new Y.Doc();
      const map = docRef.current.getMap('workflow');
      const initialDef = initialWorkflow || getDefaultDocumentAnalysisWorkflow();
      map.set('definition', initialDef);
      map.set('name', initialDef.name);
    }

    const doc = docRef.current;
    const map = doc.getMap('workflow');

    const applyFromDoc = () => {
      const definition = map.get('definition') as WorkflowDefinition | undefined;
      if (definition) {
        isApplyingRemoteRef.current = true;
        setNodes(definition.nodes || []);
        setEdges(definition.edges || []);
        setWorkflowName(definition.name || workflowName);
        // Keep the flag true through the next effect flush so we don't
        // immediately write the same state back into the doc and loop.
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 0);
      }
    };

    applyFromDoc();
    const onUpdate = () => applyFromDoc();
    doc.on('update', onUpdate);

    return () => {
      doc.off('update', onUpdate);
    };
  }, [initialWorkflow]);

  // Push local state changes into the Yjs doc (broadcasted via socket when connected)
  useEffect(() => {
    if (isApplyingRemoteRef.current) return;
    if (!docRef.current) return;

    const doc = docRef.current;
    const map = doc.getMap('workflow');
    const definition = (map.get('definition') as WorkflowDefinition | undefined) || {
      name: workflowName,
      nodes: [],
      edges: [],
    };

    const nextDefinition: WorkflowDefinition = {
      ...definition,
      name: workflowName,
      nodes,
      edges,
    };

    doc.transact(() => {
      map.set('definition', nextDefinition);
      map.set('name', nextDefinition.name);
    }, 'local-state');
  }, [nodes, edges, workflowName]);

  // WebSocket collaboration wiring
  useEffect(() => {
    if (!collabConfig || !collabConfig.shareableLinkId || !collabConfig.token) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setCollabStatus('idle');
      return;
    }

    if (!docRef.current) {
      return;
    }

    setCollabStatus('connecting');
    setCollabError(null);

    const url = new URL(collabWsUrl);
    url.searchParams.set('shareableLinkId', collabConfig.shareableLinkId);
    url.searchParams.set('token', collabConfig.token);
    if (workflowId) {
      url.searchParams.set('workflowId', workflowId);
    }

    const ws = new WebSocket(url.toString());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;
    const doc = docRef.current;

    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return;
      if (collabPermissionRef.current === 'read') return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(update);
      }
    };

    doc.on('update', handleDocUpdate);

    ws.onopen = () => {
      setCollabStatus('connected');
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data as string);
          if (message.permission) {
            setCollabPermission(message.permission);
          }
          if (message.type === 'connected' && message.permission) {
            setCollabStatus('connected');
          }
        } catch (error) {
          console.warn('[WorkflowBuilder] Failed to parse collaboration message', error);
        }
      } else {
        const update = new Uint8Array(event.data as ArrayBuffer);
        Y.applyUpdate(doc, update, 'remote');
      }
    };

    ws.onerror = () => {
      setCollabStatus('error');
      setCollabError('Collaboration connection error');
    };

    ws.onclose = () => {
      setCollabStatus(collabConfig ? 'error' : 'idle');
    };

    return () => {
      doc.off('update', handleDocUpdate);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [collabConfig?.shareableLinkId, collabConfig?.token, collabWsUrl, workflowId]);

  // Sync historyIndexRef with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  // Save state to history when nodes or edges change (but not during undo/redo)
  useEffect(() => {
    if (isInitialMount.current || isUndoRedoRef.current || isApplyingRemoteRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Save current state to history
    const currentState = { nodes: [...nodes], edges: [...edges] };
    
    setHistory(prev => {
      const currentIndex = historyIndexRef.current;
      // Remove any future history if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push(currentState);
      // Limit history to 50 states
      const limitedHistory = newHistory.length > 50 ? newHistory.slice(-50) : newHistory;
      // Update index ref and state
      const newIndex = limitedHistory.length - 1;
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex);
      return limitedHistory;
    });
  }, [nodes, edges]);

  // Notify parent of workflow changes
  useEffect(() => {
    if (onWorkflowChange && !isInitialMount.current && !isUndoRedoRef.current) {
      // Mark to skip next sync to prevent loop
      skipNextSync.current = true;
      const workflow: WorkflowDefinition = {
        name: workflowName,
        nodes,
        edges,
      };
      onWorkflowChange(workflow);
    }
    // Intentionally exclude onWorkflowChange to avoid infinite loops when parents
    // pass a new inline callback each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, workflowName]);

  const selectedNodeData = nodes.find(n => n.id === selectedNode) || null;
  const isReadOnly = collabPermission === 'read';

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNode(nodeId);
  }, []);

  const handleNodeChange = useCallback((nodeId: string, data: Partial<WorkflowNode['data']>) => {
    if (isReadOnly) return;
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
    ));
  }, [isReadOnly]);

  const handleAddMCPTool = useCallback((toolId: string, method: string, toolName: string) => {
    if (isReadOnly) return;
    const position = { x: Math.random() * 400 + 200, y: Math.random() * 300 + 100 };
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: 'mcp-tool',
      position,
      data: {
        label: `${toolName} - ${method}`,
        tool_id: toolId,
        method: method,
        tool_name: toolName,
      },
    };
    setNodes(prev => [...prev, newNode]);
  }, [isReadOnly]);

  const handleAddNode = useCallback((type: WorkflowNode['type'], position: { x: number; y: number }) => {
    if (isReadOnly) return;
    console.log(`[WorkflowBuilder] handleAddNode called:`, { type, position });
    
    // Validate node type
    const validTypes: WorkflowNode['type'][] = ['file-upload', 'text-extraction', 'rag-indexing', 'rag-query', 'ai-generation', 'mcp-tool'];
    if (!validTypes.includes(type)) {
      console.warn(`[WorkflowBuilder] Invalid node type: ${type}`);
      return;
    }
    
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type,
      position,
      data: {
        label: getNodeLabel(type),
      },
    };
    
    console.log(`[WorkflowBuilder] Created new node:`, newNode);
    setNodes(prev => {
      const updated = [...prev, newNode];
      console.log(`[WorkflowBuilder] Updated nodes count:`, updated.length);
      return updated;
    });
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    if (isReadOnly) return;
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  }, [selectedNode, isReadOnly]);

  const handleUndo = useCallback(() => {
    if (isReadOnly) return;
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      const newIndex = historyIndexRef.current - 1;
      const previousState = history[newIndex];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      historyIndexRef.current = newIndex;
      setHistoryIndex(newIndex);
      setSelectedNode(null); // Clear selection when undoing
    }
  }, [history, isReadOnly]);

  const handleNodesChange = useCallback((updater: SetStateAction<WorkflowNode[]>) => {
    if (isReadOnly) return;
    setNodes(updater);
  }, [isReadOnly]);

  const handleEdgesChange = useCallback((updater: SetStateAction<WorkflowEdge[]>) => {
    if (isReadOnly) return;
    setEdges(updater);
  }, [isReadOnly]);

  const ensureShareLink = useCallback(async () => {
    if (shareLinkId && shareToken) {
      return { shareableLinkId: shareLinkId, token: shareToken };
    }
    if (!workflowId) {
      throw new Error('Save workflow before sharing');
    }
    const { apiClient } = await import('@/lib/api/client');
    const res = await apiClient.createShareLink(workflowId, 'editor');
    if (!res.success || !res.data?.shareableLinkId || !res.data?.token) {
      throw new Error(res.error?.message || 'Failed to create share link');
    }
    setShareLinkId(res.data.shareableLinkId);
    setShareToken(res.data.token);
    return { shareableLinkId: res.data.shareableLinkId, token: res.data.token };
  }, [shareLinkId, shareToken, workflowId]);

  const buildShareUrl = useCallback((linkId: string, token: string) => {
    const appBase = import.meta.env.VITE_APP_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
    return `${appBase}/workflow/share/${linkId}?token=${encodeURIComponent(token)}`;
  }, []);

  const handleShare = useCallback(async () => {
    try {
      setShareBusy(true);
      setShareStatus(null);
      const { shareableLinkId, token } = await ensureShareLink();
      const url = buildShareUrl(shareableLinkId, token);

      if (navigator.share && typeof navigator.share === 'function') {
        await navigator.share({ title: workflowName, url });
        setShareStatus('Link shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus('Link copied to clipboard');
      } else {
        setShareStatus(url);
        alert(url);
      }
    } catch (error: any) {
      setShareStatus(error?.message || 'Unable to share link');
    } finally {
      setShareBusy(false);
    }
  }, [ensureShareLink, buildShareUrl, workflowName]);

  const handleSave = useCallback(async () => {
    if (onSave && tabId) {
      // Use the parent's save handler (for tab management)
      const success = await onSave(tabId);
      if (success) {
        alert(`Workflow "${workflowName}" saved successfully!`);
      } else {
        alert(`Failed to save workflow "${workflowName}". Please try again.`);
      }
      return;
    }

    // Fallback to direct save (if no tab context)
    try {
      const { apiClient } = await import('@/lib/api/client');
      const workflowDefinition = convertToBackendFormat(nodes, edges);
      
      const response = await apiClient.createWorkflow({
        name: workflowName,
        description: `Workflow: ${workflowName}`,
        workflowDefinition,
      });

      if (response.success) {
        console.log('Workflow saved:', response.data);
        alert(`Workflow "${workflowName}" saved successfully!`);
      } else {
        const errorMsg = response.error?.message || 'Unknown error';
        alert(`Failed to save workflow:\n\n${errorMsg}\n\nPlease try again or check your connection.`);
      }
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      const errorMsg = error.message || 'Network error';
      alert(`Failed to save workflow:\n\n${errorMsg}\n\nPlease check your connection and try again.`);
    }
  }, [workflowName, nodes, edges, onSave, tabId]);

  const validateWorkflow = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check for start and end nodes
    const hasStart = nodes.some(n => n.type === 'start');
    const hasEnd = nodes.some(n => n.type === 'end');
    
    if (!hasStart) {
      errors.push('Workflow must have a Start node');
    }
    if (!hasEnd) {
      errors.push('Workflow must have an End node');
    }

    // Check for at least one executable step
    const executableNodes = nodes.filter(n => n.type !== 'start' && n.type !== 'end');
    if (executableNodes.length === 0) {
      errors.push('Workflow must have at least one executable step');
    }

    // Check for orphaned nodes (nodes not connected)
    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
    
    const orphanedNodes = executableNodes.filter(n => !connectedNodeIds.has(n.id));
    if (orphanedNodes.length > 0) {
      errors.push(`Found ${orphanedNodes.length} disconnected node(s). All nodes must be connected.`);
    }

    // Check that file-upload nodes have files uploaded
    const fileUploadNodes = nodes.filter(n => n.type === 'file-upload');
    for (const node of fileUploadNodes) {
      const uploadedFiles = node.data.uploadedFiles;
      if (!uploadedFiles || uploadedFiles.length === 0) {
        errors.push(`File upload node "${node.data.label || node.id}" has no files uploaded. Please upload at least one file.`);
      }
    }

    // Check for circular dependencies (basic check)
    const nodeDependencies = new Map<string, string[]>();
    edges.forEach(edge => {
      if (!nodeDependencies.has(edge.target)) {
        nodeDependencies.set(edge.target, []);
      }
      nodeDependencies.get(edge.target)!.push(edge.source);
    });

    // Simple cycle detection: if a node depends on itself (directly or indirectly)
    const checkCycle = (nodeId: string, visited: Set<string>, path: Set<string>): boolean => {
      if (path.has(nodeId)) {
        return true; // Cycle detected
      }
      if (visited.has(nodeId)) {
        return false; // Already checked, no cycle
      }
      
      visited.add(nodeId);
      path.add(nodeId);
      
      const deps = nodeDependencies.get(nodeId) || [];
      for (const dep of deps) {
        if (checkCycle(dep, visited, new Set(path))) {
          return true;
        }
      }
      
      path.delete(nodeId);
      return false;
    };

    for (const nodeId of nodeDependencies.keys()) {
      if (checkCycle(nodeId, new Set(), new Set())) {
        errors.push('Workflow contains circular dependencies');
        break;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }, [nodes, edges]);

  const handleExecute = useCallback(async () => {
    // Validate workflow before execution
    const validation = validateWorkflow();
    if (!validation.valid) {
      alert(`Workflow validation failed:\n${validation.errors.join('\n')}`);
      return;
    }

    setIsExecuting(true);
    setExecutionStatus({});
    
    try {
      const { apiClient } = await import('@/lib/api/client');
      
      // Convert visual workflow to backend format
      const workflowDefinition = convertToBackendFormat(nodes, edges);
      
      // Create and execute workflow
      const createResponse = await apiClient.createWorkflow({
        name: `${workflowName} - Execution`,
        workflowDefinition,
      });

      if (!createResponse.success) {
        throw new Error(createResponse.error?.message || 'Failed to create workflow');
      }

      const workflowId = createResponse.data?.workflowId;
      if (!workflowId) {
        throw new Error('No workflow ID returned');
      }

      // Collect uploaded files from file-upload nodes
      const uploadedFiles: Record<string, any[]> = {};
      nodes.forEach(node => {
        if (node.type === 'file-upload' && node.data.uploadedFiles && node.data.uploadedFiles.length > 0) {
          // Store files by node ID for the backend to use
          uploadedFiles[node.id] = node.data.uploadedFiles.map((f: any) => ({
            fileId: f.fileId,
            filename: f.filename,
            url: f.url,
            size: f.size,
            extractedText: f.extractedText,
            metadata: f.metadata,
          }));
        }
      });

      // Execute the workflow with uploaded files as inputs
      const executeResponse = await apiClient.executeWorkflow(workflowId, {
        uploadedFiles,
      });
      
      if (!executeResponse.success) {
        throw new Error(executeResponse.error?.message || 'Failed to execute workflow');
      }

      const jobId = executeResponse.data?.jobId;
      
      // Map workflow nodes to step IDs (excluding start/end nodes)
      const nodeToStepMap = new Map<string, string>();
      workflowDefinition.steps.forEach((step: any) => {
        // Find the node that corresponds to this step
        const node = nodes.find(n => n.id === step.id);
        if (node) {
          nodeToStepMap.set(node.id, step.id);
        }
      });

      // Poll for execution status with exponential backoff
      let pollInterval = 500; // Start with 500ms
      let pollAttempts = 0;
      const maxPollAttempts = 120; // Max 2 minutes of polling (120 * 1s)
      
      const pollStatus = async () => {
        pollAttempts++;
        
        // Stop polling if we've exceeded max attempts
        if (pollAttempts > maxPollAttempts) {
          setIsExecuting(false);
          alert('Workflow execution is taking longer than expected. Please check the job status manually.');
          return;
        }

        const statusResponse = await apiClient.getWorkflowExecutionStatus(jobId);
        if (statusResponse.success && statusResponse.data) {
          const job = statusResponse.data;
          
          if (job.status === 'Success') {
            // All steps completed successfully
            // Map final_output to node statuses
            if (job.final_output) {
              Object.keys(job.final_output).forEach(stepId => {
                // Find node by step ID
                nodeToStepMap.forEach((mappedStepId, nodeId) => {
                  if (mappedStepId === stepId) {
                    setExecutionStatus(prev => ({ ...prev, [nodeId]: 'success' }));
                  }
                });
              });
            } else {
              // Fallback: mark all nodes as success
              nodes.forEach(node => {
                if (node.type !== 'start' && node.type !== 'end') {
                  setExecutionStatus(prev => ({ ...prev, [node.id]: 'success' }));
                }
              });
            }
            setIsExecuting(false);
          } else if (job.status === 'Failed') {
            // Mark all nodes as error (or could be more granular based on error_message)
            nodes.forEach(node => {
              if (node.type !== 'start' && node.type !== 'end') {
                setExecutionStatus(prev => ({ ...prev, [node.id]: 'error' }));
              }
            });
            setIsExecuting(false);
          } else if (job.status === 'Running') {
            // Job is running - check if we have partial results
            if (job.final_output) {
              // Some steps have completed
              Object.keys(job.final_output).forEach(stepId => {
                nodeToStepMap.forEach((mappedStepId, nodeId) => {
                  if (mappedStepId === stepId) {
                    setExecutionStatus(prev => ({ ...prev, [nodeId]: 'success' }));
                  }
                });
              });
            }
            
            // Mark nodes that haven't completed yet as running
            // Find the first node that hasn't completed
            const workflowSteps = workflowDefinition.steps;
            for (const step of workflowSteps) {
              const nodeId = Array.from(nodeToStepMap.entries())
                .find(([_, stepId]) => stepId === step.id)?.[0];
              
              if (nodeId) {
                // Use functional update to get current state
                setExecutionStatus(prev => {
                  const currentStatus = prev[nodeId];
                  if (!currentStatus || currentStatus === 'pending') {
                    return { ...prev, [nodeId]: 'running' };
                  }
                  return prev;
                });
              }
            }
            
            // Continue polling with current interval
            setTimeout(pollStatus, pollInterval);
          } else {
            // Queued or other status - continue polling
            setTimeout(pollStatus, pollInterval);
          }
        } else {
          // Error getting status - increase interval and retry
          pollInterval = Math.min(pollInterval * 1.5, 5000); // Max 5 seconds
          setTimeout(pollStatus, pollInterval);
        }
      };

      // Initialize all nodes as pending
      nodes.forEach(node => {
        if (node.type !== 'start' && node.type !== 'end') {
          setExecutionStatus(prev => ({ ...prev, [node.id]: 'pending' }));
        }
      });

      // Start polling
      setTimeout(pollStatus, 500);
    } catch (error: any) {
      console.error('Workflow execution failed:', error);
      nodes.forEach(node => {
        if (node.type !== 'start' && node.type !== 'end') {
          setExecutionStatus(prev => ({ ...prev, [node.id]: 'error' }));
        }
      });
      setIsExecuting(false);
      
      // Better error message
      const errorMessage = error.message || 'Unknown error occurred';
      alert(`Workflow execution failed:\n\n${errorMessage}\n\nPlease check:\n- All nodes are properly configured\n- Required tools are available\n- Network connection is stable`);
    }
  }, [workflowName, nodes, edges]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full w-full"
    >
      <GlassPanel
        variant="prominent"
        className="flex-1 flex flex-col m-4 relative"
      >
        {/* Top Left Controls */}
        <div className="absolute top-4 left-4 z-[100] flex items-center gap-2 pointer-events-auto">
          <div className="pointer-events-auto">
            <WorkflowToolbar
              onAddNode={handleAddNode}
              onAddMCPTool={handleAddMCPTool}
            />
          </div>
        </div>

        {/* Bottom Right Controls - Undo and Trash Can */}
        <div className="absolute bottom-4 right-4 z-[100] flex items-center gap-3 pointer-events-auto">
          {/* Undo Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={historyIndex === 0}
            className={cn(
              "h-10 w-10 rounded-full bg-card/90 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-primary/50 shadow-lg transition-all",
              historyIndex === 0 && "opacity-50 cursor-not-allowed"
            )}
            title={historyIndex === 0 ? "Nothing to undo" : "Undo last action"}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          {/* Trash Can - Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedNodeId) {
                setIsOverTrash(true);
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOverTrash(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOverTrash(false);
              if (draggedNodeId) {
                handleDeleteNode(draggedNodeId);
                setDraggedNodeId(null);
              }
            }}
          >
            <div 
              className={cn(
                "flex items-center justify-center transition-all group cursor-pointer",
                isOverTrash && draggedNodeId ? "scale-110" : ""
              )}
              title="Drag nodes here to delete"
            >
              <Trash2 className={cn(
                "w-6 h-6 text-muted-foreground transition-transform",
                isOverTrash && draggedNodeId ? "scale-125 text-foreground" : "group-hover:scale-110 hover:text-foreground"
              )} />
            </div>
          </div>
        </div>

        {/* Top Right Controls */}
        <div 
          className={`absolute top-4 z-20 flex items-center gap-2 transition-all ${
            selectedNodeData ? 'right-[340px]' : 'right-4'
          }`}
        >
          <div className="flex items-center gap-2 mr-2">
            <Badge variant={collabStatus === 'connected' ? 'default' : 'secondary'} className="text-[11px]">
              {collabStatus === 'connected' ? 'Live' : collabStatus === 'connecting' ? 'Connecting…' : 'Offline'}
            </Badge>
            <Badge variant={isReadOnly ? 'secondary' : 'outline'} className="text-[11px]">
              {isReadOnly ? 'Read-only' : 'Editor'}
            </Badge>
            {collabError && (
              <span className="text-[11px] text-destructive">{collabError}</span>
            )}
            {shareStatus && !shareStatus.toLowerCase().includes('unable') && (
              <span className="text-[11px] text-muted-foreground">{shareStatus}</span>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleShare}
            disabled={shareBusy || !workflowId}
            className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg hover:bg-card"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={isExecuting || isReadOnly}
            className="bg-card/90 backdrop-blur-sm border-border/50 shadow-lg hover:bg-card"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || nodes.length === 0 || isReadOnly}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg backdrop-blur-sm"
          >
            <Play className="w-4 h-4 mr-2" />
            {isExecuting ? 'Running...' : 'Run Workflow'}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Canvas */}
          <div className="flex-1 relative">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeSelect={handleNodeSelect}
              onNodeDelete={handleDeleteNode}
              onAddNode={handleAddNode}
              selectedNodeId={selectedNode}
              executionStatus={executionStatus}
              isExecuting={isExecuting}
              isReadOnly={isReadOnly}
              onNodeDragStart={setDraggedNodeId}
              onNodeDragStop={() => {
                setDraggedNodeId(null);
                setIsOverTrash(false);
              }}
            />
          </div>

          {/* Config Panel */}
          {selectedNodeData && (
            <NodeConfigPanel
              node={selectedNodeData}
              onNodeChange={handleNodeChange}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// Helper functions
function getNodeLabel(type: WorkflowNode['type']): string {
  const labels: Record<WorkflowNode['type'], string> = {
    'start': 'Start',
    'file-upload': 'Upload Document',
    'text-extraction': 'Extract Text',
    'rag-indexing': 'Index for RAG',
    'rag-query': 'Query RAG',
    'ai-generation': 'AI Generation',
    'mcp-tool': 'MCP Tool',
    'end': 'End',
  };
  return labels[type] || 'Node';
}

function getDefaultDocumentAnalysisWorkflow(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 100 },
        data: { label: 'Start' },
      },
      {
        id: 'upload',
        type: 'file-upload',
        position: { x: 300, y: 100 },
        data: { label: 'Upload Document', fileTypes: ['pdf', 'docx', 'txt'] },
      },
      {
        id: 'extract',
        type: 'text-extraction',
        position: { x: 500, y: 100 },
        data: { label: 'Extract Text', useOCR: true },
      },
      {
        id: 'index',
        type: 'rag-indexing',
        position: { x: 700, y: 100 },
        data: { label: 'Index for RAG', chunkSize: 1000 },
      },
      {
        id: 'end',
        type: 'end',
        position: { x: 900, y: 100 },
        data: { label: 'End' },
      },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'upload' },
      { id: 'e2', source: 'upload', target: 'extract' },
      { id: 'e3', source: 'extract', target: 'index' },
      { id: 'e4', source: 'index', target: 'end' },
    ],
  };
}

function convertToBackendFormat(nodes: WorkflowNode[], edges: WorkflowEdge[]): any {
  // Convert visual workflow to backend WorkflowDefinition format
  const steps = nodes
    .filter(n => n.type !== 'start' && n.type !== 'end')
    .map((node) => {
      // Try to get tool_id from node data
      const toolId = getToolIdForNodeType(node.type, node.data);

      const step: any = {
        id: node.id,
        action: getActionForNodeType(node.type, node.data),
        parameters: { ...node.data },
      };

      // For MCP tools, tool_id is required
      if (node.type === 'mcp-tool') {
        if (node.data.tool_id) {
          step.tool_id = node.data.tool_id;
        } else {
          throw new Error(`MCP tool node ${node.id} is missing tool_id`);
        }
      } else if (toolId) {
        step.tool_id = toolId;
      } else {
        // Store node type for backend resolution
        step.node_type = node.type;
      }

      // Add dependencies based on edges
      const incomingEdges = edges.filter(e => e.target === node.id);
      if (incomingEdges.length > 0) {
        step.depends_on = incomingEdges.map(e => e.source);
      }

      return step;
    });

  return {
    steps,
    metadata: {
      name: 'Document Analysis & RAG',
      createdBy: 'workflow-builder',
    },
  };
}

function getToolIdForNodeType(type: WorkflowNode['type'], nodeData?: any): string | null {
  // If node already has a tool_id stored, use it
  if (nodeData?.tool_id) {
    return nodeData.tool_id;
  }

  // For start/end nodes, no tool needed
  if (type === 'start' || type === 'end') {
    return null;
  }

  // Tool ID will be resolved by backend during workflow save/execute
  // Return null to indicate backend should resolve it
  return null;
}

function getActionForNodeType(type: WorkflowNode['type'], nodeData?: any): string {
  // For MCP tools, use the method from node data
  if (type === 'mcp-tool' && nodeData?.method) {
    return nodeData.method;
  }

  const actionMap: Record<WorkflowNode['type'], string> = {
    'start': '',
    'file-upload': 'upload',
    'text-extraction': 'extract',
    'rag-indexing': 'index',
    'rag-query': 'query',
    'ai-generation': 'generate',
    'mcp-tool': '',
    'end': '',
  };
  return actionMap[type] || '';
}
