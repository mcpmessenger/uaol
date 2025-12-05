// RAG Workflow Definition Helper
// Provides templates and utilities for creating RAG-enabled workflows

import { WorkflowDefinition, WorkflowStep } from '../database/models/processing-job';

/**
 * Creates a RAG workflow definition for document retrieval and generation
 * 
 * This workflow can be used with the job-orchestration-service to perform
 * RAG operations as part of a larger workflow.
 * 
 * Note: Currently, RAG is primarily used directly in the chat endpoint.
 * This workflow definition is provided for cases where RAG needs to be
 * orchestrated as part of a multi-step workflow.
 */
export interface RAGWorkflowParams {
  fileId: string;
  query: string;
  topK?: number;
  userId: string;
}

/**
 * Creates a workflow definition for RAG retrieval
 * 
 * Example usage:
 * ```typescript
 * const workflow = createRAGWorkflow({
 *   fileId: 'file_123',
 *   query: 'What is the main topic?',
 *   topK: 5,
 *   userId: 'user_456'
 * });
 * ```
 */
export function createRAGWorkflow(params: RAGWorkflowParams): WorkflowDefinition {
  const { fileId, query, topK = 5 } = params;

  // Note: This is a template workflow definition
  // In practice, RAG is currently implemented directly in the chat endpoint
  // This workflow definition can be used if you want to integrate RAG
  // into a larger orchestrated workflow
  
  const workflow: WorkflowDefinition = {
    steps: [
      // Step 1: Retrieve relevant chunks (would need a tool for this)
      // This is a placeholder - in practice, RAG retrieval happens directly
      // via the vector-store module
      {
        id: 'rag-retrieve',
        tool_id: 'rag-tool-id', // This would be registered in the tool registry
        action: 'retrieve_document_chunks',
        parameters: {
          fileId,
          query,
          topK,
        },
      },
      // Step 2: Generate response using retrieved context
      // This would call an LLM with the retrieved chunks
      {
        id: 'rag-generate',
        tool_id: 'llm-tool-id', // This would be registered in the tool registry
        action: 'generate_with_context',
        parameters: {
          query,
          context: '{{rag-retrieve.result}}', // Reference to previous step result
        },
      },
    ],
    metadata: {
      type: 'rag',
      fileId,
      query,
      createdAt: new Date().toISOString(),
    },
  };

  return workflow;
}

/**
 * Helper to create a simple RAG query workflow
 */
export function createSimpleRAGQuery(fileId: string, query: string): WorkflowDefinition {
  return createRAGWorkflow({
    fileId,
    query,
    topK: 5,
    userId: '', // Will be set when workflow is executed
  });
}
