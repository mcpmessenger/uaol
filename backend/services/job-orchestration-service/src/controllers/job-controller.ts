import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { ProcessingJobModel, WorkflowDefinition } from '@uaol/shared/database/models/processing-job';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError, InsufficientCreditsError } from '@uaol/shared/errors';
import { createProducer } from '@uaol/shared/mq/queue';

const logger = createLogger('job-orchestration-service');
const jobModel = new ProcessingJobModel(getDatabasePool());
const userModel = new UserModel(getDatabasePool());
const producer = createProducer();

export const jobController = {
  async createJob(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { workflow_definition } = req.body;

      if (!workflow_definition || !workflow_definition.steps) {
        throw new ValidationError('workflow_definition with steps is required');
      }

      // Calculate total credit cost
      // TODO: Fetch tool costs from Tool Registry Service
      const estimatedCost = workflow_definition.steps.length; // Placeholder

      // Check user credits
      if (user.current_credits < BigInt(estimatedCost)) {
        throw new InsufficientCreditsError(estimatedCost, Number(user.current_credits));
      }

      // Create job
      const job = await jobModel.create(user.user_id, workflow_definition as WorkflowDefinition);

      // Queue job for processing
      await producer.send({
        id: job.job_id,
        type: 'job.created',
        payload: {
          jobId: job.job_id,
          userId: user.user_id,
          workflowDefinition: workflow_definition,
        },
        timestamp: Date.now(),
      });

      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  },

  async getJob(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;

      const job = await jobModel.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Job not found' },
        });
      }

      if (job.user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: { code: 'AUTHORIZATION_ERROR', message: 'Access denied' },
        });
      }

      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  },

  async listJobs(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { limit = 50 } = req.query;

      const jobs = await jobModel.findByUser(user.user_id, Number(limit));

      res.json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelJob(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { jobId } = req.params;

      const job = await jobModel.findById(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Job not found' },
        });
      }

      if (job.user_id !== user.user_id) {
        return res.status(403).json({
          success: false,
          error: { code: 'AUTHORIZATION_ERROR', message: 'Access denied' },
        });
      }

      // TODO: Implement job cancellation
      res.json({
        success: true,
        message: 'Job cancellation not yet fully implemented',
      });
    } catch (error) {
      next(error);
    }
  },
};

