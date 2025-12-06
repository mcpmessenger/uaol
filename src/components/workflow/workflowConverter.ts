/**
 * Converts between frontend workflow format (nodes/edges) and backend format (steps)
 */

import { WorkflowNode, WorkflowEdge, WorkflowDefinition } from './WorkflowBuilder';

interface BackendWorkflowStep {
  id: string;
  tool_id?: string;
  action: string;
  parameters: Record<string, any>;
  depends_on?: string[];
  node_type?: string;
}

interface BackendWorkflowDefinition {
  steps: BackendWorkflowStep[];
  metadata?: Record<string, any>;
}

/**
 * Converts backend workflow format (steps) to frontend format (nodes/edges)
 * Note: This is a best-effort conversion. Position information is lost.
 */
export function convertFromBackendFormat(
  backendWorkflow: BackendWorkflowDefinition,
  workflowName: string
): WorkflowDefinition {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  // Add start node
  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: 100, y: 100 },
    data: { label: 'Start' },
  });

  // Convert steps to nodes
  let xPosition = 300;
  const stepToNodeMap = new Map<string, string>();

  for (const step of backendWorkflow.steps) {
    const nodeId = step.id;
    stepToNodeMap.set(step.id, nodeId);

    // Determine node type from step
    let nodeType: WorkflowNode['type'] = 'ai-generation'; // default
    if (step.node_type) {
      nodeType = step.node_type as WorkflowNode['type'];
    } else if (step.tool_id) {
      // MCP tool
      nodeType = 'mcp-tool';
    } else {
      // Try to infer from action
      const actionToType: Record<string, WorkflowNode['type']> = {
        'upload': 'file-upload',
        'extract': 'text-extraction',
        'index': 'rag-indexing',
        'query': 'rag-query',
        'generate': 'ai-generation',
      };
      nodeType = actionToType[step.action] || 'ai-generation';
    }

    const node: WorkflowNode = {
      id: nodeId,
      type: nodeType,
      position: { x: xPosition, y: 100 },
      data: {
        label: step.action || nodeType,
        ...step.parameters,
        tool_id: step.tool_id,
        method: step.action,
      },
    };

    nodes.push(node);
    xPosition += 200;
  }

  // Add end node
  nodes.push({
    id: 'end',
    type: 'end',
    position: { x: xPosition, y: 100 },
    data: { label: 'End' },
  });

  // Create edges from dependencies
  const nodeIds = new Set(nodes.map(n => n.id));
  
  // Connect start to first step
  if (backendWorkflow.steps.length > 0) {
    edges.push({
      id: 'e-start',
      source: 'start',
      target: backendWorkflow.steps[0].id,
    });
  }

  // Connect steps based on dependencies
  for (const step of backendWorkflow.steps) {
    if (step.depends_on && step.depends_on.length > 0) {
      // Connect from the last dependency
      const lastDep = step.depends_on[step.depends_on.length - 1];
      if (nodeIds.has(lastDep)) {
        edges.push({
          id: `e-${lastDep}-${step.id}`,
          source: lastDep,
          target: step.id,
        });
      }
    } else if (backendWorkflow.steps.indexOf(step) > 0) {
      // If no dependencies, connect to previous step
      const prevStep = backendWorkflow.steps[backendWorkflow.steps.indexOf(step) - 1];
      edges.push({
        id: `e-${prevStep.id}-${step.id}`,
        source: prevStep.id,
        target: step.id,
      });
    }
  }

  // Connect last step to end
  if (backendWorkflow.steps.length > 0) {
    const lastStep = backendWorkflow.steps[backendWorkflow.steps.length - 1];
    edges.push({
      id: 'e-end',
      source: lastStep.id,
      target: 'end',
    });
  }

  return {
    name: workflowName,
    nodes,
    edges,
  };
}
