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

    const mcpResponse = await response.json() as { error?: { message?: string }; result?: any };

    if (mcpResponse.error) {
      throw new Error(`MCP JSON-RPC error: ${mcpResponse.error.message || 'Unknown error'}`);
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

    const mcpResponse = await response.json() as { error?: { message?: string }; result?: { tools?: any[] } };

    if (mcpResponse.error) {
      throw new Error(`MCP JSON-RPC error: ${mcpResponse.error.message || 'Unknown error'}`);
    }

    return mcpResponse.result?.tools || [];
  }
}

export class RestAdapter extends BaseAdapter implements IMCPProtocolAdapter {
  async callTool(toolCall: MCPToolCall): Promise<any> {
    // If gateway URL already ends with /mcp, use it directly; otherwise append /mcp
    const baseUrl = this.gatewayUrl.endsWith('/mcp') 
      ? this.gatewayUrl 
      : `${this.gatewayUrl}/mcp`;
    
    // LangchainMCP uses /mcp/invoke
    let invokeUrl = `${baseUrl}/invoke`;
    const body = {
      tool: toolCall.name,
      arguments: toolCall.arguments,
    };

    let response = await fetch(invokeUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    // If /mcp/invoke fails with 404, try /invoke (without /mcp)
    if (!response.ok && response.status === 404 && this.gatewayUrl.endsWith('/mcp')) {
      invokeUrl = `${this.gatewayUrl.replace(/\/mcp$/, '')}/invoke`;
      response = await fetch(invokeUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MCP REST request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const mcpResponse = await response.json() as { isError?: boolean; content?: Array<{ text?: string }>; error?: string; [key: string]: any };

    if (mcpResponse.isError) {
      throw new Error(`MCP REST error: ${mcpResponse.content?.[0]?.text || mcpResponse.error || 'Unknown error'}`);
    }

    // The REST style returns the result directly in content array
    return mcpResponse.content || mcpResponse;
  }

  async listTools(): Promise<any> {
    // Gateway URL already ends with /mcp, so just append /manifest
    // e.g., https://langchain-agent-mcp-server.../mcp -> https://langchain-agent-mcp-server.../mcp/manifest
    let manifestUrl = `${this.gatewayUrl}/manifest`;
    console.log('[RestAdapter] Fetching manifest from:', manifestUrl);
    
    let response = await fetch(manifestUrl, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    console.log('[RestAdapter] Response status:', response.status, response.statusText);

    // If that fails, try without the /mcp suffix (in case gateway URL doesn't include it)
    if (!response.ok && response.status === 404) {
      const baseUrl = this.gatewayUrl.endsWith('/mcp') 
        ? this.gatewayUrl.replace(/\/mcp$/, '')
        : this.gatewayUrl;
      manifestUrl = `${baseUrl}/mcp/manifest`;
      console.log('[RestAdapter] Trying fallback URL:', manifestUrl);
      response = await fetch(manifestUrl, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      console.log('[RestAdapter] Fallback response status:', response.status, response.statusText);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[RestAdapter] Manifest fetch failed:', { status: response.status, statusText: response.statusText, errorText });
      throw new Error(`MCP REST manifest request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const manifest = await response.json() as { tools?: any[] };
    console.log('[RestAdapter] Manifest received:', { toolCount: manifest.tools?.length || 0 });
    
    // The REST style manifest contains a 'tools' array
    return manifest.tools || [];
  }
}
