import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export enum ToolStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DISABLED = 'Disabled',
}

export interface MCPTool {
  tool_id: string;
  name: string;
  gateway_url: string;
  credit_cost_per_call: number;
  developer_id: string;
  status: ToolStatus;
  created_at: Date;
  updated_at: Date;
}

export class MCPToolModel {
  constructor(private pool: Pool) {}

  async create(
    name: string,
    gatewayUrl: string,
    creditCostPerCall: number,
    developerId: string
  ): Promise<MCPTool> {
    const toolId = randomUUID();
    
    const query = `
      INSERT INTO mcp_tools (tool_id, name, gateway_url, credit_cost_per_call, developer_id, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      toolId,
      name,
      gatewayUrl,
      creditCostPerCall,
      developerId,
      ToolStatus.PENDING,
    ]);

    return this.mapRowToTool(result.rows[0]);
  }

  async findById(toolId: string): Promise<MCPTool | null> {
    const query = 'SELECT * FROM mcp_tools WHERE tool_id = $1';
    const result = await this.pool.query(query, [toolId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToTool(result.rows[0]);
  }

  async findByDeveloper(developerId: string): Promise<MCPTool[]> {
    const query = 'SELECT * FROM mcp_tools WHERE developer_id = $1 ORDER BY created_at DESC';
    const result = await this.pool.query(query, [developerId]);
    
    return result.rows.map(row => this.mapRowToTool(row));
  }

  async findApproved(): Promise<MCPTool[]> {
    const query = 'SELECT * FROM mcp_tools WHERE status = $1 ORDER BY name';
    const result = await this.pool.query(query, [ToolStatus.APPROVED]);
    
    return result.rows.map(row => this.mapRowToTool(row));
  }

  async updateStatus(toolId: string, status: ToolStatus): Promise<void> {
    const query = 'UPDATE mcp_tools SET status = $1, updated_at = NOW() WHERE tool_id = $2';
    await this.pool.query(query, [status, toolId]);
  }

  async updateCreditCost(toolId: string, creditCost: number): Promise<void> {
    const query = 'UPDATE mcp_tools SET credit_cost_per_call = $1, updated_at = NOW() WHERE tool_id = $2';
    await this.pool.query(query, [creditCost, toolId]);
  }

  private mapRowToTool(row: any): MCPTool {
    return {
      tool_id: row.tool_id,
      name: row.name,
      gateway_url: row.gateway_url,
      credit_cost_per_call: row.credit_cost_per_call,
      developer_id: row.developer_id,
      status: row.status as ToolStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

