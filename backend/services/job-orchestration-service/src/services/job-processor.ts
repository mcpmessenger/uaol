import { ProcessingJobModel, JobStatus } from '@uaol/shared/database/models/processing-job';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { createConsumer } from '@uaol/shared/mq/queue';
import { MCPClient } from '@uaol/shared/mcp/client';
import { config } from '@uaol/shared/config';
import { indexDocumentChunks, queryVectorStore, DocumentChunk } from '@uaol/shared/vector-store/vector-store';

const logger = createLogger('job-orchestration-service');

// Lazy initialization - don't create models until we actually need them
// This ensures .env is loaded first
let jobModel: ProcessingJobModel | null = null;
let toolModel: MCPToolModel | null = null;

async function getJobModel(): Promise<ProcessingJobModel> {
  if (!jobModel) {
    // Import database pool dynamically - ensures .env is loaded first
    const { getDatabasePool } = await import('@uaol/shared/database/connection');
    jobModel = new ProcessingJobModel(getDatabasePool());
  }
  return jobModel;
}

async function getToolModel(): Promise<MCPToolModel> {
  if (!toolModel) {
    // Import database pool dynamically - ensures .env is loaded first
    const { getDatabasePool } = await import('@uaol/shared/database/connection');
    toolModel = new MCPToolModel(getDatabasePool());
  }
  return toolModel;
}

let userModel: UserModel | null = null;
async function getUserModel(): Promise<UserModel> {
  if (!userModel) {
    const { getDatabasePool } = await import('@uaol/shared/database/connection');
    userModel = new UserModel(getDatabasePool());
  }
  return userModel;
}

class JobProcessor {
  private consumer = createConsumer();
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting job processor');

    // Wait for database connection to be ready
    await this.waitForDatabase();

    // Subscribe to job queue
    await this.consumer.subscribe('job.created', this.processJob.bind(this));
    await this.consumer.start();

    // Also poll for queued jobs (fallback)
    this.pollQueuedJobs();
  }

  private async waitForDatabase(maxRetries: number = 5): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // CRITICAL: Import connection module dynamically to ensure it uses latest code
        // This bypasses any module caching issues
        const connectionModule = await import('@uaol/shared/database/connection');
        
        // Force pool recreation by calling getDatabasePool
        // This ensures process.env.DATABASE_URL is used
        const pool = connectionModule.getDatabasePool();
        
        // Log what we got
        logger.info('Pool obtained, testing connection...');
        logger.info('process.env.DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
        
        // Initialize model on first use (ensures .env is loaded)
        const model = await getJobModel();
        
        // Try a simple query to verify connection
        await model.findQueuedJobs(1);
        logger.info('Database connection ready');
        return;
      } catch (error: any) {
        if (i < maxRetries - 1) {
          logger.warn(`Database not ready, retrying... (${i + 1}/${maxRetries})`);
          if (error?.code === 'ECONNREFUSED') {
            logger.warn('Connection refused - check if DATABASE_URL is correct');
          }
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          logger.error('Database connection failed after retries', error);
          // Don't throw - let the service continue, it will retry in pollQueuedJobs
          return;
        }
      }
    }
  }

  async stop() {
    this.isRunning = false;
    await this.consumer.stop();
    logger.info('Job processor stopped');
  }

  private async processJob(message: any) {
    const { jobId } = message.payload;
    logger.info('Processing job', { jobId });

    try {
      const model = await getJobModel();
      const job = await model.findById(jobId);
      if (!job) {
        logger.error('Job not found', { jobId });
        return;
      }

      // Update status to running
      await model.updateStatus(jobId, JobStatus.RUNNING);

      // Execute workflow
      const result = await this.executeWorkflow(job.workflow_definition, job.user_id);

      // Update job with result (this also sets status to SUCCESS)
      await model.updateOutput(jobId, result);

      // Deduct credits after successful job completion
      await this.deductCredits(job.user_id, job.workflow_definition, jobId);

      logger.info('Job completed successfully', { jobId });
    } catch (error: any) {
      logger.error('Job processing failed', error, { jobId });
      
      const model = await getJobModel();
      const job = await model.findById(jobId);
      if (job) {
        await model.updateError(jobId, error.message);
        await model.updateStatus(jobId, JobStatus.FAILED);
        
        // Retry logic
        if (job.retry_count < 3) {
          await model.incrementRetryCount(jobId);
          // Re-queue for retry
          logger.info('Re-queuing job for retry', { jobId, retryCount: job.retry_count + 1 });
        } else {
          // Job failed permanently - refund credits if deducted
          // Note: Credits are only deducted on success, so no refund needed here
          logger.info('Job failed permanently', { jobId });
        }
      }
    }
  }

  private async deductCredits(userId: string, workflowDefinition: any, jobId: string): Promise<void> {
    try {
      // Calculate total credit cost based on workflow steps
      const toolModel = await getToolModel();
      let totalCost = 0;

      for (const step of workflowDefinition.steps || []) {
        if (step.tool_id) {
          const tool = await toolModel.findById(step.tool_id);
          if (tool) {
            totalCost += tool.credit_cost_per_call || 1;
          } else {
            // Default cost if tool not found
            totalCost += 1;
          }
        } else {
          // Default cost for steps without tools
          totalCost += 1;
        }
      }

      if (totalCost === 0) {
        logger.warn('No credit cost calculated for job', { userId, jobId });
        return;
      }

      // Get user to verify they have enough credits
      const userModel = await getUserModel();
      const user = await userModel.findById(userId);
      if (!user) {
        logger.error('User not found for credit deduction', { userId, jobId });
        return;
      }

      if (user.current_credits < BigInt(totalCost)) {
        logger.warn('Insufficient credits for job', {
          userId,
          jobId,
          required: totalCost,
          available: Number(user.current_credits),
        });
        // Don't deduct, but log warning
        return;
      }

      // Call billing service to deduct credits
      const billingServiceUrl = `http://localhost:${config.services.billing.port}`;
      
      // Create a temporary token or use service-to-service auth
      // For now, we'll make a direct database call instead of HTTP call
      // to avoid authentication issues
      const newCredits = user.current_credits - BigInt(totalCost);
      await userModel.updateCredits(userId, newCredits);

      logger.info('Credits deducted successfully', {
        userId,
        jobId,
        totalCost,
        creditsBefore: Number(user.current_credits),
        creditsAfter: Number(newCredits),
      });

      // Dispatch event for frontend to update credit display
      // This would typically be done via WebSocket or polling
    } catch (error: any) {
      logger.error('Error deducting credits', {
        userId,
        jobId,
        error: error.message,
        stack: error.stack,
      });
      // Don't throw - log error but don't fail the job
    }
  }

  private async executeWorkflow(workflow: any, userId: string): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const stepResults: Map<string, any> = new Map();

    logger.info('Executing workflow', { stepCount: workflow.steps?.length || 0 });

    // Treat "start" as a virtual step that is always satisfied so downstream
    // nodes with depends_on: ["start"] do not fail dependency checks.
    const START_STEP_ID = 'start';
    stepResults.set(START_STEP_ID, { ok: true, virtual: true });

    // Execute steps in order (respecting dependencies)
    for (const step of workflow.steps || []) {
      logger.debug('Executing step', { 
        stepId: step.id, 
        action: step.action, 
        toolId: step.tool_id,
        dependsOn: step.depends_on 
      });

      // Check dependencies
      if (step.depends_on && step.depends_on.length > 0) {
        for (const depId of step.depends_on) {
          // Skip the virtual start node; it is always considered satisfied
          if (depId === START_STEP_ID) {
            continue;
          }
          if (!stepResults.has(depId)) {
            throw new Error(`Dependency ${depId} not found for step ${step.id}. Ensure all dependencies execute before this step.`);
          }
        }
        
        // Pass dependency results as inputs if needed
        const dependencyResults = step.depends_on.map(depId => stepResults.get(depId));
        logger.debug('Dependency results available', { 
          stepId: step.id, 
          dependencyCount: dependencyResults.length 
        });
      }

      const dependencyOutputs = step.depends_on?.map(depId => stepResults.get(depId)) || [];

      // Check condition label - only execute if condition result matches the label
      if (step.condition_label) {
        // Find the condition dependency
        const conditionDepIndex = step.depends_on?.findIndex((depId, idx) => {
          const depOutput = dependencyOutputs[idx];
          return depOutput && typeof depOutput.result === 'boolean';
        });
        
        if (conditionDepIndex !== undefined && conditionDepIndex >= 0) {
          const conditionResult = dependencyOutputs[conditionDepIndex]?.result;
          const expectedResult = step.condition_label === 'true';
          
          if (conditionResult !== expectedResult) {
            const stepResult = { skipped: true, reason: `condition-${step.condition_label}-branch-not-taken` };
            stepResults.set(step.id, stepResult);
            results[step.id] = stepResult;
            logger.debug('Skipping step - condition branch not taken', { 
              stepId: step.id, 
              conditionLabel: step.condition_label,
              conditionResult 
            });
            continue;
          }
        }
      } else {
        // Legacy behavior: if a condition dependency evaluated to false and no label specified, skip
        const hasBlockingCondition = dependencyOutputs.some(output => output && typeof output.result === 'boolean' && output.result === false);
        if (hasBlockingCondition) {
          const stepResult = { skipped: true, reason: 'condition-false' };
          stepResults.set(step.id, stepResult);
          results[step.id] = stepResult;
          logger.debug('Skipping step due to false condition dependency (legacy)', { stepId: step.id });
          continue;
        }
      }

      // Handle built-in node types that don't require tool registration
      const inputs = (workflow as any).inputs || {};
      
      if (step.action === 'upload' || step.node_type === 'file-upload') {
        // File upload is a data input node - files are already uploaded
        // Just pass through the uploaded files from inputs
        const uploadedFiles = inputs.uploadedFiles?.[step.id] || step.parameters.uploadedFiles || [];
        
        logger.debug('Processing file-upload node', { 
          stepId: step.id,
          fileCount: uploadedFiles.length
        });

        const stepResult = {
          files: uploadedFiles,
          fileIds: uploadedFiles.map((f: any) => f.fileId),
          count: uploadedFiles.length,
        };

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue; // Skip tool execution for file-upload
      }

      if (step.action === 'extract' || step.node_type === 'text-extraction') {
        // Text extraction - get text from uploaded files
        logger.debug('Processing text-extraction node', { stepId: step.id });
        
        // Get files from previous step (file-upload)
        let files: any[] = [];
        if (step.depends_on && step.depends_on.length > 0) {
          const depResult = stepResults.get(step.depends_on[0]);
          if (depResult?.files) {
            files = depResult.files;
          }
        } else {
          // Fallback: get from inputs
          const uploadedFiles = inputs.uploadedFiles || {};
          files = Object.values(uploadedFiles).flat() as any[];
        }

        // Extract text from files (files already have extractedText from upload)
        const extractedTexts = files
          .filter(f => f.extractedText)
          .map(f => ({
            fileId: f.fileId,
            filename: f.filename,
            text: f.extractedText,
            length: f.extractedText.length,
          }));

        const combinedText = extractedTexts.map(t => t.text).join('\n\n');
        
        const stepResult = {
          text: combinedText,
          files: extractedTexts,
          totalLength: combinedText.length,
          fileCount: extractedTexts.length,
        };

        logger.debug('Text extraction completed', { 
          stepId: step.id,
          textLength: combinedText.length,
          fileCount: extractedTexts.length
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      if (step.action === 'condition' || step.node_type === 'condition') {
        logger.debug('Processing condition node', { stepId: step.id });

        const params = step.parameters || {};
        const leftRaw = params.leftOperand ?? '';
        const rightRaw = params.rightOperand ?? '';
        const operator = params.operator || 'equals';

        const coerce = (val: any) => {
          if (val === undefined || val === null) return '';
          if (typeof val === 'number' || typeof val === 'boolean') return val;
          return String(val);
        };

        const left = coerce(leftRaw);
        const right = coerce(rightRaw);

        let comparisonResult = true;
        switch (operator) {
          case 'not_equals':
            comparisonResult = left !== right;
            break;
          case 'contains':
            comparisonResult = String(left).includes(String(right));
            break;
          case 'gt':
            comparisonResult = Number(left) > Number(right);
            break;
          case 'lt':
            comparisonResult = Number(left) < Number(right);
            break;
          case 'gte':
            comparisonResult = Number(left) >= Number(right);
            break;
          case 'lte':
            comparisonResult = Number(left) <= Number(right);
            break;
          case 'equals':
          default:
            comparisonResult = left === right;
            break;
        }

        const finalResult = params.conditionValue !== undefined ? !!params.conditionValue : comparisonResult;

        const stepResult = {
          result: finalResult,
          left,
          right,
          operator,
          comparisonResult,
        };

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      if (step.action === 'loop' || step.node_type === 'loop') {
        logger.debug('Processing loop node', { stepId: step.id });
        const params = step.parameters || {};
        let items = params.items;

        if (typeof items === 'string') {
          try {
            const parsed = JSON.parse(items);
            items = parsed;
          } catch (err: any) {
            logger.warn('Loop items could not be parsed as JSON string, defaulting to empty array', {
              stepId: step.id,
              error: err?.message,
            });
            items = [];
          }
        }

        if (!Array.isArray(items)) {
          logger.warn('Loop items is not an array, defaulting to empty array', { stepId: step.id });
          items = [];
        }

        const itemKey = params.itemKey || 'item';
        const stepResult = {
          items,
          count: items.length,
          itemKey,
        };

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      // Loop body execution: if this step is marked as loop_body, find the loop dependency and execute per item
      if (step.loop_body) {
        const loopDep = dependencyOutputs.find((dep: any) => dep && Array.isArray(dep.items));
        if (loopDep && Array.isArray(loopDep.items) && loopDep.items.length > 0) {
          const itemKey = loopDep.itemKey || 'item';
          const items = loopDep.items;
          
          logger.debug('Executing loop body step', { 
            stepId: step.id, 
            itemCount: items.length,
            itemKey 
          });
          
          // Execute this step for each item in the loop
          const perItemResults: any[] = [];
          
          for (let loopIndex = 0; loopIndex < items.length; loopIndex++) {
            const loopItem = items[loopIndex];
            
            // Merge loop context into step parameters
            const loopParams = {
              ...step.parameters,
              [itemKey]: loopItem,
              loopItem,
              loopIndex,
            };
            
            try {
              // Execute the step with loop context
              const itemResult = await this.executeStepWithLoopContext(step, loopParams, userId, workflow, stepResults, inputs);
              perItemResults.push(itemResult);
            } catch (itemError: any) {
              logger.error('Loop body step execution failed for item', {
                stepId: step.id,
                loopIndex,
                error: itemError.message,
              });
              perItemResults.push({ error: itemError.message, loopIndex });
            }
          }
          
          const stepResult = {
            items: perItemResults,
            count: perItemResults.length,
            itemKey,
            loopBody: true,
          };
          
          stepResults.set(step.id, stepResult);
          results[step.id] = stepResult;
          continue;
        } else {
          // No loop items, skip loop body
          logger.debug('Skipping loop body - no items', { stepId: step.id });
          stepResults.set(step.id, { skipped: true, reason: 'loop-empty' });
          results[step.id] = { skipped: true, reason: 'loop-empty' };
          continue;
        }
      }
      
      // Legacy loop fan-out: if a dependency emits items (and step is not explicitly loop_body), run once per item
      const loopDep = dependencyOutputs.find((dep: any) => dep && Array.isArray(dep.items));
      if (loopDep && !step.loop_body) {
        const itemKey = loopDep.itemKey || 'item';
        const items: any[] = loopDep.items || [];
        const perItemResults: Array<{ index: number; item: any; result: any }> = [];

        // Preload tool if needed
        let cachedTool: any = null;
        if (step.tool_id) {
          const toolModel = await getToolModel();
          cachedTool = await toolModel.findById(step.tool_id);
          if (!cachedTool) {
            throw new Error(`Tool ${step.tool_id} not found for step ${step.id}. Please ensure the tool is registered.`);
          }
          if (cachedTool.status !== 'Approved') {
            throw new Error(`Tool "${cachedTool.name}" (${step.tool_id}) is not approved (status: ${cachedTool.status}) for step ${step.id}`);
          }
        }

        const runAiGeneration = async (mergedParams: any, deps: any[]) => {
          const prompt = mergedParams?.prompt || '';
          const model = mergedParams?.model || 'gpt-4o';
          let context = '';
          if (step.depends_on && step.depends_on.length > 0) {
            const depResults = step.depends_on.map(depId => stepResults.get(depId));
            context = depResults
              .map(r => r?.text || r?.results?.join('\n') || '')
              .filter(Boolean)
              .join('\n\n');
          }
          return {
            generated: `[AI Generation Placeholder]\nPrompt: ${prompt}\nModel: ${model}\nContext length: ${context.length} characters`,
            model,
            prompt,
            contextLength: context.length,
            loopContext: { item: mergedParams[itemKey], index: mergedParams.loopIndex },
          };
        };

        const runToolCall = async (mergedParams: any) => {
          const mcpClient = new MCPClient(cachedTool.gateway_url, cachedTool.protocol || 'json-rpc');
          return mcpClient.callTool({
            tool_id: cachedTool.tool_id,
            name: step.action,
            arguments: mergedParams,
          });
        };

        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const mergedParams = {
            ...step.parameters,
            [itemKey]: item,
            loopItem: item,
            loopIndex: idx,
          };

          let perResult: any = { note: 'loop item skipped' };

          if (step.action === 'generate' || step.node_type === 'ai-generation') {
            perResult = await runAiGeneration(mergedParams, dependencyOutputs);
          } else if (cachedTool) {
            perResult = await runToolCall(mergedParams);
          } else {
            // Default: just pass through item for unsupported node types in loop context
            perResult = { item, loopIndex: idx, parameters: mergedParams };
          }

          perItemResults.push({ index: idx, item, result: perResult });
        }

        const aggregated = {
          items,
          count: items.length,
          itemKey,
          results: perItemResults,
        };

        stepResults.set(step.id, aggregated);
        results[step.id] = aggregated;
        continue;
      }

      if (step.action === 'index' || step.node_type === 'rag-indexing') {
        logger.debug('Processing rag-indexing node', { stepId: step.id });

        if (!userId) {
          logger.warn('Skipping rag-indexing - missing userId');
          continue;
        }

        const chunkSize = step.parameters?.chunkSize || 1000;
        const chunkOverlap = step.parameters?.chunkOverlap || 200;

        // Prefer file-scoped indexing when available
        const dependencyResult = step.depends_on && step.depends_on.length > 0
          ? stepResults.get(step.depends_on[0])
          : null;
        const sourceFiles = (dependencyResult?.files as any[]) || [];

        let totalChunks = 0;
        const indexedFiles: Array<{ fileId: string; filename?: string; chunkCount: number; length: number }> = [];

        const chunkText = (text: string, fileId: string, filename?: string): DocumentChunk[] => {
          const safeChunkSize = Math.max(chunkSize, 1);
          const overlap = Math.min(chunkOverlap, safeChunkSize - 1);
          const chunks: DocumentChunk[] = [];
          for (let i = 0, idx = 0; i < text.length; i += safeChunkSize - overlap, idx++) {
            chunks.push({
              id: `${fileId}_chunk_${idx}`,
              text: text.slice(i, i + safeChunkSize),
              metadata: {
                chunkIndex: idx,
                filename,
              },
            });
          }
          return chunks;
        };

        const performIndex = async (fileId: string, text: string, filename?: string) => {
          const chunks = chunkText(text, fileId, filename);
          if (chunks.length === 0) {
            logger.warn('No chunks generated for file', { fileId, stepId: step.id });
            return;
          }
          try {
            await indexDocumentChunks(fileId, userId, chunks);
            indexedFiles.push({
              fileId,
              filename,
              chunkCount: chunks.length,
              length: text.length,
            });
            totalChunks += chunks.length;
          } catch (err: any) {
            logger.error('Indexing failed for file; continuing workflow', {
              fileId,
              stepId: step.id,
              error: err.message,
            });
          }
        };

        if (Array.isArray(sourceFiles) && sourceFiles.length > 0) {
          for (const file of sourceFiles) {
            const text = file?.text || '';
            const fileId = file?.fileId;
            if (!fileId || !text) continue;
            await performIndex(fileId, text, file?.filename);
          }
        } else {
          // Fallback: index combined text if no file metadata is available
          const text = dependencyResult?.text || '';
          if (text) {
            const fallbackFileId = step.parameters?.fileId || `workflow_${step.id}`;
            await performIndex(fallbackFileId, text);
          } else {
            logger.warn('No text available for rag-indexing step', { stepId: step.id });
          }
        }

        const stepResult = {
          indexed: indexedFiles.length > 0,
          chunkCount: totalChunks,
          totalLength: indexedFiles.reduce((sum, f) => sum + f.length, 0),
          files: indexedFiles,
        };

        logger.debug('RAG indexing completed', {
          stepId: step.id,
          indexedFiles: indexedFiles.length,
          chunkCount: totalChunks,
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      if (step.action === 'query' || step.node_type === 'rag-query') {
        logger.debug('Processing rag-query node', { stepId: step.id });

        if (!userId) {
          logger.warn('Skipping rag-query - missing userId');
          continue;
        }

        const query = step.parameters?.query || '';
        const topK = step.parameters?.topK || 5;

        // Determine which file to query, default to dependency result when available
        let fileId = step.parameters?.fileId as string | undefined;
        if (!fileId && step.depends_on && step.depends_on.length > 0) {
          const depResult = stepResults.get(step.depends_on[0]);
          fileId = depResult?.files?.[0]?.fileId;
        }

        const retrieved = await queryVectorStore(query, fileId, userId, topK);

        const stepResult = {
          query,
          fileId,
          results: retrieved,
          count: retrieved.length,
        };

        logger.debug('RAG query completed', {
          stepId: step.id,
          resultCount: retrieved.length,
          fileId,
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      if (step.action === 'generate' || step.node_type === 'ai-generation') {
        // AI generation - placeholder implementation
        logger.debug('Processing ai-generation node', { stepId: step.id });
        
        const prompt = step.parameters?.prompt || '';
        const model = step.parameters?.model || 'gpt-4o';

        // Get context from previous steps
        let context = '';
        if (step.depends_on && step.depends_on.length > 0) {
          const depResults = step.depends_on.map(depId => stepResults.get(depId));
          context = depResults
            .map(r => r?.text || r?.results?.join('\n') || '')
            .filter(Boolean)
            .join('\n\n');
        }

        // Placeholder result - real implementation would call AI API
        const stepResult = {
          generated: `[AI Generation Placeholder]\nPrompt: ${prompt}\nModel: ${model}\nContext length: ${context.length} characters`,
          model,
          prompt,
          contextLength: context.length,
        };

        logger.debug('AI generation completed', { 
          stepId: step.id,
          model
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      // Get tool
      const toolModel = await getToolModel();
      const tool = await toolModel.findById(step.tool_id);
      if (!tool) {
        throw new Error(`Tool ${step.tool_id} not found for step ${step.id}. Please ensure the tool is registered.`);
      }
      if (tool.status !== 'Approved') {
        throw new Error(`Tool "${tool.name}" (${step.tool_id}) is not approved (status: ${tool.status}) for step ${step.id}`);
      }

      logger.debug('Tool found', { 
        stepId: step.id, 
        toolName: tool.name, 
        toolId: tool.tool_id,
        gatewayUrl: tool.gateway_url 
      });

      // Create MCP client with protocol from tool
      const mcpClient = new MCPClient(tool.gateway_url, tool.protocol || 'json-rpc');

      // Prepare parameters - merge step parameters with dependency outputs if needed
      const parameters = { ...step.parameters };
      
      // If step has dependencies, we can pass their outputs
      // This allows chaining workflow steps
      if (step.depends_on && step.depends_on.length > 0) {
        const dependencyOutputs = step.depends_on.map(depId => stepResults.get(depId));
        // Add dependency outputs to parameters if not already present
        if (dependencyOutputs.length === 1) {
          // Single dependency - pass as 'input' or merge into parameters
          if (!parameters.input && !parameters.text && !parameters.content) {
            const depOutput = dependencyOutputs[0];
            if (typeof depOutput === 'string') {
              parameters.input = depOutput;
            } else if (depOutput?.text) {
              parameters.text = depOutput.text;
            } else if (depOutput?.content) {
              parameters.content = depOutput.content;
            } else if (depOutput?.result) {
              parameters.input = depOutput.result;
            } else if (depOutput?.files) {
              // Pass files from file-upload node to next step
              parameters.files = depOutput.files;
              parameters.fileIds = depOutput.fileIds;
            }
          }
        } else if (dependencyOutputs.length > 1) {
          // Multiple dependencies - pass as array
          parameters.dependencies = dependencyOutputs;
        }
      }

      // Execute tool call
      try {
        logger.debug('Calling tool', { 
          stepId: step.id, 
          toolName: tool.name, 
          action: step.action,
          parameterKeys: Object.keys(parameters)
        });

        const stepResult = await mcpClient.callTool({
          tool_id: step.tool_id,
          name: step.action,
          arguments: parameters,
        });

        logger.debug('Step completed', { 
          stepId: step.id, 
          resultType: typeof stepResult,
          hasResult: !!stepResult
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
      } catch (error: any) {
        logger.error('Step execution failed', { 
          stepId: step.id, 
          toolName: tool.name,
          action: step.action,
          error: error.message 
        });
        throw new Error(`Step ${step.id} (${step.action}) failed: ${error.message}`);
      }
    }

    logger.info('Workflow execution completed', { 
      totalSteps: workflow.steps?.length || 0,
      completedSteps: Object.keys(results).length
    });

    return results;
  }

  /**
   * Execute a step with loop context (for loop body execution)
   */
  private async executeStepWithLoopContext(
    step: any,
    loopParams: any,
    userId: string,
    workflow: any,
    stepResults: Map<string, any>,
    inputs: any
  ): Promise<any> {
    // Handle different step types within loop context
    if (step.action === 'generate' || step.node_type === 'ai-generation') {
      const prompt = loopParams?.prompt || '';
      const model = loopParams?.model || 'gpt-4o';
      return {
        generated: `[AI Generation Placeholder]\nPrompt: ${prompt}\nModel: ${model}\nLoop item: ${JSON.stringify(loopParams.loopItem)}`,
        model,
        prompt,
        loopContext: { item: loopParams.loopItem, index: loopParams.loopIndex },
      };
    }

    if (step.action === 'extract' || step.node_type === 'text-extraction') {
      // Text extraction with loop context
      return {
        text: `[Extracted text for loop item ${loopParams.loopIndex}]`,
        loopContext: { item: loopParams.loopItem, index: loopParams.loopIndex },
      };
    }

    if (step.action === 'query' || step.node_type === 'rag-query') {
      const query = loopParams?.query || '';
      return {
        query,
        results: [],
        loopContext: { item: loopParams.loopItem, index: loopParams.loopIndex },
      };
    }

    // MCP tool call
    if (step.tool_id) {
      const toolModel = await getToolModel();
      const tool = await toolModel.findById(step.tool_id);
      if (!tool || tool.status !== 'Approved') {
        throw new Error(`Tool ${step.tool_id} not found or not approved`);
      }

      const mcpClient = new MCPClient(tool.gateway_url, tool.protocol || 'json-rpc');
      return await mcpClient.callTool({
        tool_id: step.tool_id,
        name: step.action,
        arguments: loopParams,
      });
    }

    // Default: return loop context
    return {
      loopContext: { item: loopParams.loopItem, index: loopParams.loopIndex },
      parameters: loopParams,
    };
  }

  private async pollQueuedJobs() {
    while (this.isRunning) {
      try {
        const model = await getJobModel();
        const queuedJobs = await model.findQueuedJobs(10);
        
        for (const job of queuedJobs) {
          await this.processJob({ payload: { jobId: job.job_id } });
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error: any) {
        // Check if it's a connection error
        if (error?.code === 'ECONNREFUSED' || error?.message?.includes('ECONNREFUSED')) {
          logger.warn('Database connection refused - will retry. Check DATABASE_URL in .env file');
        } else {
          logger.error('Error polling queued jobs', error);
        }
        // Wait longer on error before retrying
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}

export const jobProcessor = new JobProcessor();

