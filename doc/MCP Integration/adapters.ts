import { MCPToolCall } from './client';

export interface IMCPProtocolAdapter {
  listTools(): Promise<any>;
  callTool(toolCall: MCPToolCall): Promise<any>;
}

export class BaseAdapter {
  constructor(protected gatewayUrl: string, protected apiKey?: string) {}

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }
}

export class JsonRpcAdapter extends BaseAdapter implements IMCPProtocolAdapter {
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async callTool(toolCall: MCPToolCall): Promise<any> {
    const request = {
      method: 'tools/call',
      params: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
      id: this.generateRequestId(),
    };

    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP JSON-RPC request failed: ${response.statusText}`);
    }

    const mcpResponse = await response.json();

    if (mcpResponse.error) {
      throw new Error(`MCP JSON-RPC error: ${mcpResponse.error.message}`);
    }

    return mcpResponse.result;
  }

  async listTools(): Promise<any> {
    const request = {
      method: 'tools/list',
      id: this.generateRequestId(),
    };

    const response = await fetch(this.gatewayUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP JSON-RPC request failed: ${response.statusText}`);
    }

    const mcpResponse = await response.json();

    if (mcpResponse.error) {
      throw new Error(`MCP JSON-RPC error: ${mcpResponse.error.message}`);
    }

    return mcpResponse.result?.tools || [];
  }
}

export class RestAdapter extends BaseAdapter implements IMCPProtocolAdapter {
  async callTool(toolCall: MCPToolCall): Promise<any> {
    const invokeUrl = `${this.gatewayUrl}/invoke`;
    const body = {
      tool_name: toolCall.name,
      arguments: toolCall.arguments,
    };

    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`MCP REST request failed: ${response.statusText}`);
    }

    const mcpResponse = await response.json();

    if (mcpResponse.error) {
      throw new Error(`MCP REST error: ${mcpResponse.error.message}`);
    }

    // The REST style returns the result directly, not wrapped in a 'result' field
    return mcpResponse;
  }

  async listTools(): Promise<any> {
    const manifestUrl = `${this.gatewayUrl}/manifest`;
    
    const response = await fetch(manifestUrl, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`MCP REST manifest request failed: ${response.statusText}`);
    }

    const manifest = await response.json();
    
    // The REST style manifest contains a 'tools' array
    return manifest.tools || [];
  }
}
