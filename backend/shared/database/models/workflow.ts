import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { WorkflowDefinition } from './processing-job';

export interface Workflow {
  workflow_id: string;
  user_id: string;
  name: string;
  description: string | null;
  workflow_definition: WorkflowDefinition;
  created_at: Date;
  updated_at: Date;
}

export class WorkflowModel {
  constructor(private pool: Pool) {}

  async create(
    userId: string,
    name: string,
    description: string | null,
    workflowDefinition: WorkflowDefinition
  ): Promise<Workflow> {
    const workflowId = randomUUID();
    const result = await this.pool.query(
      `INSERT INTO workflows (workflow_id, user_id, name, description, workflow_definition)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [workflowId, userId, name, description, JSON.stringify(workflowDefinition)]
    );

    return this.mapRowToWorkflow(result.rows[0]);
  }

  async findById(workflowId: string): Promise<Workflow | null> {
    const result = await this.pool.query(
      'SELECT * FROM workflows WHERE workflow_id = $1',
      [workflowId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToWorkflow(result.rows[0]);
  }

  async findByUserId(userId: string, limit: number = 100): Promise<Workflow[]> {
    const result = await this.pool.query(
      `SELECT * FROM workflows 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows.map(row => this.mapRowToWorkflow(row));
  }

  async update(
    workflowId: string,
    updates: {
      name?: string;
      description?: string | null;
      workflowDefinition?: WorkflowDefinition;
    }
  ): Promise<Workflow> {
    const updatesList: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updatesList.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.description !== undefined) {
      updatesList.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }

    if (updates.workflowDefinition !== undefined) {
      updatesList.push(`workflow_definition = $${paramIndex++}`);
      values.push(JSON.stringify(updates.workflowDefinition));
    }

    if (updatesList.length === 0) {
      const workflow = await this.findById(workflowId);
      if (!workflow) {
        throw new Error('Workflow not found');
      }
      return workflow;
    }

    values.push(workflowId);

    const result = await this.pool.query(
      `UPDATE workflows 
       SET ${updatesList.join(', ')} 
       WHERE workflow_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Workflow not found');
    }

    return this.mapRowToWorkflow(result.rows[0]);
  }

  async delete(workflowId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM workflows WHERE workflow_id = $1',
      [workflowId]
    );

    if (result.rowCount === 0) {
      throw new Error('Workflow not found');
    }
  }

  private mapRowToWorkflow(row: any): Workflow {
    return {
      workflow_id: row.workflow_id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      workflow_definition: row.workflow_definition,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
