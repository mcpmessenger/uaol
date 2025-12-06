/**
 * MCP (Model Context Protocol) Client
 * Handles communication with MCP-compliant tools using an adapter pattern
 * to support different protocol styles (JSON-RPC, REST).
 */

import { IMCPProtocolAdapter, JsonRpcAdapter, RestAdapter } from './adapters';

export interface MCPToolCall {
  tool_id: string;
  name: string;
  arguments: Record<string, any>;
}

export type MCPProtocol = 'json-rpc' | 'rest';

export class MCPClient {
  private adapter: IMCPProtocolAdapter;

  constructor(
    private gatewayUrl: string,
    private protocol: MCPProtocol = 'json-rpc', // Default to existing JSON-RPC
    private apiKey?: string
  ) {
    switch (protocol) {
      case 'rest':
        this.adapter = new RestAdapter(gatewayUrl, apiKey);
        break;
      case 'json-rpc':
      default:
        this.adapter = new JsonRpcAdapter(gatewayUrl, apiKey);
        break;
    }
  }

  async callTool(toolCall: MCPToolCall): Promise<any> {
    return this.adapter.callTool(toolCall);
  }

  async listTools(): Promise<any> {
    return this.adapter.listTools();
  }
}

