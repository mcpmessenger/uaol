import { Request, Response, NextFunction } from 'express';
import { createLogger } from '@uaol/shared/logger';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { WorkflowDefinition } from '@uaol/shared/database/models/processing-job';
import { WorkflowModel } from '@uaol/shared/database/models/workflow';
import { mapNodeTypeToToolId, validateWorkflowTools, getAvailableToolsForNodeType } from '../services/tool-mapper';

const logger = createLogger('workflow-controller');

// Lazy initialization - don't create model until we actually need it
let workflowModel: WorkflowModel | null = null;

function getWorkflowModel(): WorkflowModel {
  if (!workflowModel) {
    workflowModel = new WorkflowModel(getDatabasePool());
  }
  return workflowModel;
}

export const workflowController = {
  /**
   * Create a new workflow
   */
  async createWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const userId = user?.user_id || 'guest';
      const { name, description, workflowDefinition } = req.body;

      if (!name || !workflowDefinition) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'name and workflowDefinition are required',
          },
        });
      }

      // Validate workflow definition
      if (!workflowDefinition.steps || !Array.isArray(workflowDefinition.steps)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'workflowDefinition.steps must be an array',
          },
        });
      }

      // Resolve tool IDs for steps that have node_type instead of tool_id
      for (const step of workflowDefinition.steps) {
        if (step.node_type && !step.tool_id) {
          const toolId = await mapNodeTypeToToolId(step.node_type);
          if (toolId) {
            step.tool_id = toolId;
            logger.debug('Resolved tool ID for node type', { 
              stepId: step.id, 
              nodeType: step.node_type, 
              toolId 
            });
          } else {
            // Get available tools for better error message
            const { getAvailableToolsForNodeType } = await import('../services/tool-mapper');
            const availableTools = await getAvailableToolsForNodeType(step.node_type);
            
            return res.status(400).json({
              success: false,
              error: {
                code: 'TOOL_NOT_FOUND',
                message: `No available tool found for node type: ${step.node_type}`,
                details: availableTools.length > 0 
                  ? `Found ${availableTools.length} potential tool(s) but none matched: ${availableTools.map(t => t.name).join(', ')}`
                  : 'No tools registered in the system. Please register tools first.',
                stepId: step.id,
              },
            });
          }
          // Remove node_type after resolving
          delete step.node_type;
        }
      }

      // Validate that all tools exist and are approved
      const toolValidation = await validateWorkflowTools(workflowDefinition);
      if (!toolValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOOL_VALIDATION_ERROR',
            message: toolValidation.errors.join('; '),
          },
        });
      }

      const model = getWorkflowModel();
      const workflow = await model.create(userId, name, description || null, workflowDefinition);

      logger.info('Workflow created', { workflowId: workflow.workflow_id, userId, name, stepCount: workflowDefinition.steps.length });

      res.json({
        success: true,
        data: {
          workflowId: workflow.workflow_id,
          name: workflow.name,
          description: workflow.description,
          createdAt: workflow.created_at.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to create workflow', { error: error.message });
      next(error);
    }
  },

  /**
   * Get all workflows for the current user
   */
  async getWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const userId = user?.user_id || 'guest';

      const model = getWorkflowModel();
      const workflows = await model.findByUserId(userId);

      res.json({
        success: true,
        data: {
          workflows: workflows.map(w => ({
            workflowId: w.workflow_id,
            name: w.name,
            description: w.description,
            createdAt: w.created_at.toISOString(),
            updatedAt: w.updated_at.toISOString(),
          })),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get workflows', { error: error.message });
      next(error);
    }
  },

  /**
   * Get a specific workflow
   */
  async getWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const userId = user?.user_id || 'guest';
      const { workflowId } = req.params;

      const model = getWorkflowModel();
      const workflow = await model.findById(workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      if (workflow.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this workflow',
          },
        });
      }

      res.json({
        success: true,
        data: {
          workflowId: workflow.workflow_id,
          name: workflow.name,
          description: workflow.description,
          workflowDefinition: workflow.workflow_definition,
          createdAt: workflow.created_at.toISOString(),
          updatedAt: workflow.updated_at.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get workflow', { error: error.message });
      next(error);
    }
  },

  /**
   * Execute a workflow
   */
  async executeWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const userId = user?.user_id || 'guest';
      const { workflowId } = req.params;
      const { inputs } = req.body;

      const model = getWorkflowModel();
      const workflow = await model.findById(workflowId);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Workflow not found',
          },
        });
      }

      if (workflow.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this workflow',
          },
        });
      }

      // Resolve any remaining tool IDs (in case workflow was saved before tool resolution)
      const workflowDef = { ...workflow.workflowDefinition };
      for (const step of workflowDef.steps) {
        if (step.node_type && !step.tool_id) {
          const toolId = await mapNodeTypeToToolId(step.node_type);
          if (toolId) {
            step.tool_id = toolId;
            delete step.node_type;
          } else {
            return res.status(400).json({
              success: false,
              error: {
                code: 'TOOL_NOT_FOUND',
                message: `No available tool found for node type: ${step.node_type}`,
              },
            });
          }
        }
      }

      // Validate tools before execution
      const toolValidation = await validateWorkflowTools(workflowDef);
      if (!toolValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOOL_VALIDATION_ERROR',
            message: toolValidation.errors.join('; '),
          },
        });
      }

      // Create a job using the job orchestration service
      // Use the existing job creation endpoint
      const { ProcessingJobModel } = await import('@uaol/shared/database/models/processing-job');
      const { createProducer } = await import('@uaol/shared/mq/queue');
      
      const jobModel = new ProcessingJobModel(getDatabasePool());
      const producer = createProducer();
      
      // Create job directly
      const job = await jobModel.create(userId, workflowDef);
      
      // Queue job for processing
      await producer.send({
        id: job.job_id,
        type: 'job.created',
        payload: {
          jobId: job.job_id,
          userId: userId,
          workflowDefinition: workflow.workflowDefinition,
        },
        timestamp: Date.now(),
      });

      logger.info('Workflow execution started', { workflowId, jobId: job.job_id });

      res.json({
        success: true,
        data: {
          jobId: job.job_id,
          workflowId,
        },
      });
    } catch (error: any) {
      logger.error('Failed to execute workflow', { error: error.message });
      next(error);
    }
  },

  /**
   * Get available tools for a node type
   */
  async getAvailableTools(req: Request, res: Response, next: NextFunction) {
    try {
      const { nodeType } = req.params;

      if (!nodeType) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'nodeType parameter is required',
          },
        });
      }

      const tools = await getAvailableToolsForNodeType(nodeType);

      res.json({
        success: true,
        data: {
          nodeType,
          tools,
          count: tools.length,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get available tools', { error: error.message });
      next(error);
    }
  },
};
