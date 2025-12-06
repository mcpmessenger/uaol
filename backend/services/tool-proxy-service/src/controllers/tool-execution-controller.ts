/**
 * Tool Execution Controller
 * Handles requests to execute MCP-compliant wrapper tools
 */

import { Request, Response, NextFunction } from 'express';
import { ToolRequest, ToolResponse } from '../types/tool-request';
import { executeWrapper } from '../services/wrapper-dispatcher';
import { ValidationError } from '@uaol/shared/errors';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('tool-execution-controller');

export const toolExecutionController = {
  /**
   * Execute a tool using MCP-compliant wrapper
   * POST /execute-tool
   * Body: { tool_name, job_id, parameters }
   */
  async executeTool(req: Request, res: Response, next: NextFunction) {
    try {
      const { tool_name, job_id, parameters } = req.body;

      if (!tool_name) {
        throw new ValidationError('tool_name is required');
      }

      if (!job_id) {
        throw new ValidationError('job_id is required');
      }

      if (!parameters || typeof parameters !== 'object') {
        throw new ValidationError('parameters must be an object');
      }

      const request: ToolRequest = {
        tool_name,
        job_id,
        parameters,
      };

      logger.info('Executing tool', { tool_name, job_id });

      const response: ToolResponse = await executeWrapper(request);

      res.json(response);
    } catch (error) {
      next(error);
    }
  },
};
