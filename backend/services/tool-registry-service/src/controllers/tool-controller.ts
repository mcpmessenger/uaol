import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { MCPToolModel, ToolStatus } from '@uaol/shared/database/models/mcp-tool';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError, NotFoundError } from '@uaol/shared/errors';
import { extractTokenFromHeader, verifyToken } from '@uaol/shared/auth/jwt';

const logger = createLogger('tool-registry-service');
const toolModel = new MCPToolModel(getDatabasePool());

// Lazy initialization for user model
let userModel: UserModel | null = null;
function getUserModel(): UserModel {
  if (!userModel) {
    userModel = new UserModel(getDatabasePool());
  }
  return userModel;
}

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
      logger.info('Register tool request received', { body: req.body });
      const user = (req as any).user;
      const { name, gateway_url, credit_cost_per_call, protocol } = req.body;

      if (!name || !gateway_url) {
        throw new ValidationError('Name and gateway_url are required');
      }

      // Validate protocol if provided
      if (protocol && protocol !== 'json-rpc' && protocol !== 'rest') {
        throw new ValidationError('Protocol must be either "json-rpc" or "rest"');
      }

      // Try to get developer ID from authenticated user first
      let developerId = user?.user_id;
      
      // If no user from middleware, try to extract from JWT token directly (avoid DB query)
      if (!developerId) {
        const token = extractTokenFromHeader(req.headers.authorization);
        
        if (token) {
          try {
            const payload = verifyToken(token);
            developerId = payload.userId;
            logger.info('Extracted user ID from JWT token', { developerId });
          } catch (tokenError: any) {
            logger.warn('Could not extract user from token:', tokenError.message);
          }
        }
      }
      
      // Last resort: query database (with timeout)
      if (!developerId) {
        logger.info('No authenticated user, querying database for first user...');
        const pool = getDatabasePool();
        const queryPromise = pool.query('SELECT user_id FROM users LIMIT 1');
        
        // Add a 3-second timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout after 3 seconds')), 3000)
        );
        
        try {
          const result = await Promise.race([queryPromise, timeoutPromise]) as any;
          if (result.rows.length === 0) {
            logger.error('No users found in database');
            throw new ValidationError('No users found in database. Please create a user first or authenticate.');
          }
          developerId = result.rows[0].user_id;
          logger.warn(`Using user ${developerId} for tool registration (development mode - no auth)`);
        } catch (error: any) {
          logger.error('Error querying for user:', error.message);
          throw new ValidationError(`Cannot register tool: ${error.message}. Please ensure database is accessible and contains at least one user.`);
        }
      }

      logger.info('Creating tool with developerId', { developerId, name, gateway_url, protocol });

      const tool = await toolModel.create(
        name,
        gateway_url,
        credit_cost_per_call || 1,
        developerId,
        protocol || 'json-rpc' // Default to json-rpc if not specified
      );

      logger.info('Tool created successfully', { toolId: tool.tool_id });
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
      const { credit_cost_per_call, protocol } = req.body;

      const tool = await toolModel.findById(toolId);

      if (!tool) {
        throw new NotFoundError('Tool');
      }

      // For development: skip auth check if no user
      if (user && tool.developer_id !== user.user_id) {
        throw new ValidationError('You can only update your own tools');
      }

      if (credit_cost_per_call !== undefined) {
        await toolModel.updateCreditCost(toolId, credit_cost_per_call);
      }

      if (protocol !== undefined) {
        if (protocol !== 'json-rpc' && protocol !== 'rest') {
          throw new ValidationError('Protocol must be either "json-rpc" or "rest"');
        }
        await toolModel.updateProtocol(toolId, protocol);
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

