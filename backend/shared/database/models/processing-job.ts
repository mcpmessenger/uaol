import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export enum JobStatus {
  QUEUED = 'Queued',
  RUNNING = 'Running',
  SUCCESS = 'Success',
  FAILED = 'Failed',
  RETRYING = 'Retrying',
}

export interface WorkflowDefinition {
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  tool_id: string;
  action: string;
  parameters: Record<string, any>;
  depends_on?: string[];
}

export interface ProcessingJob {
  job_id: string;
  user_id: string;
  workflow_definition: WorkflowDefinition;
  status: JobStatus;
  start_time: Date;
  end_time: Date | null;
  final_output: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

export class ProcessingJobModel {
  constructor(private pool: Pool) {}

  async create(
    userId: string,
    workflowDefinition: WorkflowDefinition
  ): Promise<ProcessingJob> {
    const jobId = randomUUID();
    
    const query = `
      INSERT INTO processing_jobs (
        job_id, user_id, workflow_definition, status, start_time, 
        end_time, final_output, error_message, retry_count, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NULL, NULL, NULL, 0, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      jobId,
      userId,
      JSON.stringify(workflowDefinition),
      JobStatus.QUEUED,
    ]);

    return this.mapRowToJob(result.rows[0]);
  }

  async findById(jobId: string): Promise<ProcessingJob | null> {
    const query = 'SELECT * FROM processing_jobs WHERE job_id = $1';
    const result = await this.pool.query(query, [jobId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToJob(result.rows[0]);
  }

  async findByUser(userId: string, limit: number = 50): Promise<ProcessingJob[]> {
    const query = `
      SELECT * FROM processing_jobs 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [userId, limit]);
    
    return result.rows.map(row => this.mapRowToJob(row));
  }

  async updateStatus(jobId: string, status: JobStatus): Promise<void> {
    const query = 'UPDATE processing_jobs SET status = $1, updated_at = NOW() WHERE job_id = $2';
    await this.pool.query(query, [status, jobId]);
  }

  async updateOutput(jobId: string, output: Record<string, any>): Promise<void> {
    const query = `
      UPDATE processing_jobs 
      SET final_output = $1, status = $2, end_time = NOW(), updated_at = NOW() 
      WHERE job_id = $3
    `;
    await this.pool.query(query, [JSON.stringify(output), JobStatus.SUCCESS, jobId]);
  }

  async updateError(jobId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE processing_jobs 
      SET error_message = $1, status = $2, end_time = NOW(), updated_at = NOW() 
      WHERE job_id = $3
    `;
    await this.pool.query(query, [errorMessage, JobStatus.FAILED, jobId]);
  }

  async incrementRetryCount(jobId: string): Promise<void> {
    const query = `
      UPDATE processing_jobs 
      SET retry_count = retry_count + 1, status = $1, updated_at = NOW() 
      WHERE job_id = $2
    `;
    await this.pool.query(query, [JobStatus.RETRYING, jobId]);
  }

  async findQueuedJobs(limit: number = 100): Promise<ProcessingJob[]> {
    const query = `
      SELECT * FROM processing_jobs 
      WHERE status = $1 
      ORDER BY created_at ASC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [JobStatus.QUEUED, limit]);
    
    return result.rows.map(row => this.mapRowToJob(row));
  }

  private mapRowToJob(row: any): ProcessingJob {
    return {
      job_id: row.job_id,
      user_id: row.user_id,
      workflow_definition: typeof row.workflow_definition === 'string' 
        ? JSON.parse(row.workflow_definition) 
        : row.workflow_definition,
      status: row.status as JobStatus,
      start_time: row.start_time,
      end_time: row.end_time,
      final_output: row.final_output ? (
        typeof row.final_output === 'string' 
          ? JSON.parse(row.final_output) 
          : row.final_output
      ) : null,
      error_message: row.error_message,
      retry_count: row.retry_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

