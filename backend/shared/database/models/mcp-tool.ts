import { Pool } from 'pg';
import { randomUUID } from 'crypto';

export enum ToolStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  DISABLED = 'Disabled',
}

export interface MCPTool {
  tool_id: string;
  protocol: 'json-rpc' | 'rest';
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
    developerId: string,
    protocol: 'json-rpc' | 'rest' = 'json-rpc' // New parameter with default
  ): Promise<MCPTool> {
    const toolId = randomUUID();
    
    const query = `
      INSERT INTO mcp_tools (tool_id, name, gateway_url, credit_cost_per_call, developer_id, protocol, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await this.pool.query(query, [
      toolId,
      name,
      gatewayUrl,
      creditCostPerCall,
      developerId,
      protocol, // New value
      ToolStatus.PENDING,
    ]);

    return this.mapRowToTool(result.rows[0]);
  }

  async findById(toolId: string): Promise<MCPTool | null> {
    const query = 'SELECT * FROM mcp_tools WHERE tool_id = $1';
    
    // Add detailed logging
    console.log('[MCPToolModel.findById] Looking for tool:', toolId);
    console.log('[MCPToolModel.findById] Query:', query);
    console.log('[MCPToolModel.findById] Pool exists:', !!this.pool);
    
    try {
      const result = await this.pool.query(query, [toolId]);
      
      console.log('[MCPToolModel.findById] Query result:', {
        rowCount: result.rows.length,
        rows: result.rows.length > 0 ? result.rows.map(r => ({ 
          tool_id: r.tool_id, 
          name: r.name, 
          status: r.status,
          protocol: r.protocol 
        })) : []
      });
      
      if (result.rows.length === 0) {
        console.log('[MCPToolModel.findById] No tool found with ID:', toolId);
        // Try to see if ANY tools exist
        const allTools = await this.pool.query('SELECT tool_id, name, status FROM mcp_tools LIMIT 5');
        console.log('[MCPToolModel.findById] Total tools in database:', allTools.rows.length);
        if (allTools.rows.length > 0) {
          console.log('[MCPToolModel.findById] Sample tools:', allTools.rows);
        }
        return null;
      }
      
      const tool = this.mapRowToTool(result.rows[0]);
      console.log('[MCPToolModel.findById] Tool found:', {
        tool_id: tool.tool_id,
        name: tool.name,
        status: tool.status,
        protocol: tool.protocol
      });
      
      return tool;
    } catch (error: any) {
      console.error('[MCPToolModel.findById] Database query error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
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

  async updateProtocol(toolId: string, protocol: 'json-rpc' | 'rest'): Promise<void> {
    const query = 'UPDATE mcp_tools SET protocol = $1, updated_at = NOW() WHERE tool_id = $2';
    await this.pool.query(query, [protocol, toolId]);
  }

  private mapRowToTool(row: any): MCPTool {
    return {
      tool_id: row.tool_id,
      name: row.name,
      gateway_url: row.gateway_url,
      credit_cost_per_call: row.credit_cost_per_call,
      developer_id: row.developer_id,
      protocol: (row.protocol || 'json-rpc') as 'json-rpc' | 'rest', // New mapping with fallback
      status: row.status as ToolStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

