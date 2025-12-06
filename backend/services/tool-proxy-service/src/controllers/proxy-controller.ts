import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { MCPClient } from '@uaol/shared/mcp/client';
import { createLogger } from '@uaol/shared/logger';
import { NotFoundError, ValidationError } from '@uaol/shared/errors';
import { getSecretsManager } from '../services/secrets-manager';

const logger = createLogger('tool-proxy-service');
const toolModel = new MCPToolModel(getDatabasePool());

export const proxyController = {
  async callTool(req: Request, res: Response, next: NextFunction) {
    try {
      const { toolId } = req.params;
      const { method, params } = req.body;

      if (!method) {
        throw new ValidationError('Method is required');
      }

      // Get tool
      const tool = await toolModel.findById(toolId);
      if (!tool || tool.status !== 'Approved') {
        throw new NotFoundError('Tool');
      }

      // Get API key from secrets manager
      const apiKey = await getSecretsManager().getSecret(`tool_${toolId}_api_key`);

      // Create MCP client with protocol from tool
      const mcpClient = new MCPClient(tool.gateway_url, tool.protocol || 'json-rpc', apiKey);

      // Call tool
      const result = await mcpClient.callTool({
        tool_id: toolId,
        name: method,
        arguments: params || {},
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async listToolMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const { toolId } = req.params;
      logger.info('Listing tool methods', { toolId });

      const tool = await toolModel.findById(toolId);
      if (!tool || tool.status !== 'Approved') {
        logger.warn('Tool not found or not approved', { toolId, found: !!tool, status: tool?.status });
        throw new NotFoundError('Tool');
      }

      logger.info('Tool found', { 
        toolId, 
        name: tool.name, 
        gateway_url: tool.gateway_url, 
        protocol: tool.protocol 
      });

      // Get API key from secrets manager
      const apiKey = await getSecretsManager().getSecret(`tool_${toolId}_api_key`);

      // Create MCP client with protocol from tool
      const protocol = (tool.protocol as 'json-rpc' | 'rest') || 'json-rpc';
      logger.info('Creating MCP client', { gateway_url: tool.gateway_url, protocol });
      const mcpClient = new MCPClient(tool.gateway_url, protocol, apiKey);

      // List tools
      logger.info('Fetching tools from MCP server...');
      const tools = await mcpClient.listTools();
      logger.info('Tools fetched successfully', { toolCount: tools?.length || 0, tools });

      res.json({
        success: true,
        data: tools,
      });
    } catch (error: any) {
      logger.error('Error listing tool methods', { 
        toolId: req.params.toolId, 
        error: error.message,
        stack: error.stack 
      });
      next(error);
    }
  },
};

