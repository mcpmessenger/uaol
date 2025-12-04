import { ProcessingJobModel, JobStatus } from '@uaol/shared/database/models/processing-job';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { createLogger } from '@uaol/shared/logger';
import { createConsumer } from '@uaol/shared/mq/queue';
import { MCPClient } from '@uaol/shared/mcp/client';

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

      // Update job with result
      await model.updateOutput(jobId, result);

      logger.info('Job completed successfully', { jobId });
    } catch (error: any) {
      logger.error('Job processing failed', error, { jobId });
      
      const model = await getJobModel();
      const job = await model.findById(jobId);
      if (job) {
        await model.updateError(jobId, error.message);
        
        // Retry logic
        if (job.retry_count < 3) {
          await model.incrementRetryCount(jobId);
          // Re-queue for retry
          logger.info('Re-queuing job for retry', { jobId, retryCount: job.retry_count + 1 });
        }
      }
    }
  }

  private async executeWorkflow(workflow: any): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    const stepResults: Map<string, any> = new Map();

    // Execute steps in order (respecting dependencies)
    for (const step of workflow.steps) {
      // Check dependencies
      if (step.depends_on) {
        for (const depId of step.depends_on) {
          if (!stepResults.has(depId)) {
            throw new Error(`Dependency ${depId} not found`);
          }
        }
      }

      // Get tool
      const toolModel = await getToolModel();
      const tool = await toolModel.findById(step.tool_id);
      if (!tool || tool.status !== 'Approved') {
        throw new Error(`Tool ${step.tool_id} not found or not approved`);
      }

      // Create MCP client
      const mcpClient = new MCPClient(tool.gateway_url);

      // Execute tool call
      const stepResult = await mcpClient.callTool({
        tool_id: step.tool_id,
        name: step.action,
        arguments: step.parameters,
      });

      stepResults.set(step.id, stepResult);
      results[step.id] = stepResult;
    }

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

