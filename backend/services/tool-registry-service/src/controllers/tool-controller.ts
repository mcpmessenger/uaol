import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { MCPToolModel, ToolStatus } from '@uaol/shared/database/models/mcp-tool';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError, NotFoundError } from '@uaol/shared/errors';

const logger = createLogger('tool-registry-service');
const toolModel = new MCPToolModel(getDatabasePool());

export const toolController = {
  async listTools(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;
      
      if (status === 'approved') {
        const tools = await toolModel.findApproved();
        return res.json({
          success: true,
          data: tools,
        });
      }

      // For now, return approved tools for public access
      const tools = await toolModel.findApproved();
      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      next(error);
    }
  },

  async getTool(req: Request, res: Response, next: NextFunction) {
    try {
      const { toolId } = req.params;
      const tool = await toolModel.findById(toolId);

      if (!tool) {
        throw new NotFoundError('Tool');
      }

      res.json({
        success: true,
        data: tool,
      });
    } catch (error) {
      next(error);
    }
  },

  async registerTool(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { name, gateway_url, credit_cost_per_call } = req.body;

      if (!name || !gateway_url) {
        throw new ValidationError('Name and gateway_url are required');
      }

      const tool = await toolModel.create(
        name,
        gateway_url,
        credit_cost_per_call || 1,
        user.user_id
      );

      res.status(201).json({
        success: true,
        data: tool,
      });
    } catch (error) {
      next(error);
    }
  },

  async updateTool(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { toolId } = req.params;
      const { credit_cost_per_call } = req.body;

      const tool = await toolModel.findById(toolId);

      if (!tool) {
        throw new NotFoundError('Tool');
      }

      if (tool.developer_id !== user.user_id) {
        throw new ValidationError('You can only update your own tools');
      }

      if (credit_cost_per_call !== undefined) {
        await toolModel.updateCreditCost(toolId, credit_cost_per_call);
      }

      const updatedTool = await toolModel.findById(toolId);

      res.json({
        success: true,
        data: updatedTool,
      });
    } catch (error) {
      next(error);
    }
  },

  async deleteTool(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { toolId } = req.params;

      const tool = await toolModel.findById(toolId);

      if (!tool) {
        throw new NotFoundError('Tool');
      }

      if (tool.developer_id !== user.user_id) {
        throw new ValidationError('You can only delete your own tools');
      }

      await toolModel.updateStatus(toolId, ToolStatus.DISABLED);

      res.json({
        success: true,
        message: 'Tool disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async getMyTools(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const tools = await toolModel.findByDeveloper(user.user_id);

      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      next(error);
    }
  },

  async approveTool(req: Request, res: Response, next: NextFunction) {
    try {
      const { toolId } = req.params;
      // TODO: Check admin permissions
      await toolModel.updateStatus(toolId, ToolStatus.APPROVED);

      res.json({
        success: true,
        message: 'Tool approved successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async disableTool(req: Request, res: Response, next: NextFunction) {
    try {
      const { toolId } = req.params;
      await toolModel.updateStatus(toolId, ToolStatus.DISABLED);

      res.json({
        success: true,
        message: 'Tool disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

