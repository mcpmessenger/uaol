import { ProcessingJobModel, JobStatus } from '@uaol/shared/database/models/processing-job';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { createConsumer } from '@uaol/shared/mq/queue';
import { MCPClient } from '@uaol/shared/mcp/client';
import { config } from '@uaol/shared/config';

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
      const result = await this.executeWorkflow(job.workflow_definition);

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

  private async executeWorkflow(workflow: any): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const stepResults: Map<string, any> = new Map();

    logger.info('Executing workflow', { stepCount: workflow.steps?.length || 0 });

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

      if (step.action === 'index' || step.node_type === 'rag-indexing') {
        // RAG indexing - placeholder implementation
        logger.debug('Processing rag-indexing node', { stepId: step.id });
        
        // Get text from previous step (text-extraction)
        let text = '';
        if (step.depends_on && step.depends_on.length > 0) {
          const depResult = stepResults.get(step.depends_on[0]);
          text = depResult?.text || '';
        }

        const chunkSize = step.parameters?.chunkSize || 1000;
        const chunkOverlap = step.parameters?.chunkOverlap || 200;
        
        // Simple chunking (placeholder - real implementation would use vector store)
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += chunkSize - chunkOverlap) {
          chunks.push(text.slice(i, i + chunkSize));
        }

        const stepResult = {
          indexed: true,
          chunkCount: chunks.length,
          totalLength: text.length,
          chunks: chunks.slice(0, 10), // Return first 10 chunks as sample
        };

        logger.debug('RAG indexing completed', { 
          stepId: step.id,
          chunkCount: chunks.length
        });

        stepResults.set(step.id, stepResult);
        results[step.id] = stepResult;
        continue;
      }

      if (step.action === 'query' || step.node_type === 'rag-query') {
        // RAG query - placeholder implementation
        logger.debug('Processing rag-query node', { stepId: step.id });
        
        const query = step.parameters?.query || '';
        const topK = step.parameters?.topK || 5;

        // Get indexed chunks from previous step
        let chunks: string[] = [];
        if (step.depends_on && step.depends_on.length > 0) {
          const depResult = stepResults.get(step.depends_on[0]);
          chunks = depResult?.chunks || [];
        }

        // Simple text matching (placeholder - real implementation would use semantic search)
        const results = chunks
          .map((chunk, idx) => ({
            chunk,
            index: idx,
            score: chunk.toLowerCase().includes(query.toLowerCase()) ? 0.8 : 0.1,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        const stepResult = {
          query,
          results: results.map(r => r.chunk),
          count: results.length,
        };

        logger.debug('RAG query completed', { 
          stepId: step.id,
          resultCount: results.length
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

