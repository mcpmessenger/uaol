import { getDatabasePool } from '@uaol/shared/database/connection';
import { ProcessingJobModel, JobStatus } from '@uaol/shared/database/models/processing-job';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { createLogger } from '@uaol/shared/logger';
import { createConsumer } from '@uaol/shared/mq/queue';
import { MCPClient } from '@uaol/shared/mcp/client';

const logger = createLogger('job-orchestration-service');
const jobModel = new ProcessingJobModel(getDatabasePool());
const toolModel = new MCPToolModel(getDatabasePool());

class JobProcessor {
  private consumer = createConsumer();
  private isRunning = false;

  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    logger.info('Starting job processor');

    // Subscribe to job queue
    await this.consumer.subscribe('job.created', this.processJob.bind(this));
    await this.consumer.start();

    // Also poll for queued jobs (fallback)
    this.pollQueuedJobs();
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
      const job = await jobModel.findById(jobId);
      if (!job) {
        logger.error('Job not found', { jobId });
        return;
      }

      // Update status to running
      await jobModel.updateStatus(jobId, JobStatus.RUNNING);

      // Execute workflow
      const result = await this.executeWorkflow(job.workflow_definition);

      // Update job with result
      await jobModel.updateOutput(jobId, result);

      logger.info('Job completed successfully', { jobId });
    } catch (error: any) {
      logger.error('Job processing failed', error, { jobId });
      
      const job = await jobModel.findById(jobId);
      if (job) {
        await jobModel.updateError(jobId, error.message);
        
        // Retry logic
        if (job.retry_count < 3) {
          await jobModel.incrementRetryCount(jobId);
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
        const queuedJobs = await jobModel.findQueuedJobs(10);
        
        for (const job of queuedJobs) {
          await this.processJob({ payload: { jobId: job.job_id } });
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        logger.error('Error polling queued jobs', error);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}

export const jobProcessor = new JobProcessor();

