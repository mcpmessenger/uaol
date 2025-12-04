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

      // Create MCP client
      const mcpClient = new MCPClient(tool.gateway_url, apiKey);

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

      const tool = await toolModel.findById(toolId);
      if (!tool || tool.status !== 'Approved') {
        throw new NotFoundError('Tool');
      }

      // Get API key from secrets manager
      const apiKey = await getSecretsManager().getSecret(`tool_${toolId}_api_key`);

      // Create MCP client
      const mcpClient = new MCPClient(tool.gateway_url, apiKey);

      // List tools
      const tools = await mcpClient.listTools();

      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      next(error);
    }
  },
};

