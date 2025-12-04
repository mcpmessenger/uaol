/**
 * MCP (Model Context Protocol) Client
 * Handles communication with MCP-compliant tools
 */

export interface MCPRequest {
  method: string;
  params?: Record<string, any>;
  id?: string;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string;
}

export interface MCPToolCall {
  tool_id: string;
  name: string;
  arguments: Record<string, any>;
}

export class MCPClient {
  constructor(private gatewayUrl: string, private apiKey?: string) {}

  async callTool(toolCall: MCPToolCall): Promise<any> {
    const request: MCPRequest = {
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
      id: this.generateRequestId(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const mcpResponse = await response.json() as MCPResponse;

    if (mcpResponse.error) {
      throw new Error(`MCP error: ${mcpResponse.error.message}`);
    }

    return mcpResponse.result;
  }

  async listTools(): Promise<string[]> {
    const request: MCPRequest = {
      method: 'tools/list',
      id: this.generateRequestId(),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }

    const mcpResponse = await response.json() as MCPResponse;

    if (mcpResponse.error) {
      throw new Error(`MCP error: ${mcpResponse.error.message}`);
    }

    return mcpResponse.result?.tools || [];
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

