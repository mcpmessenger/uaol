/**
 * Tool Execution Routes
 * Routes for executing MCP-compliant wrapper tools
 */

import { Router } from 'express';
import { toolExecutionController } from '../controllers/tool-execution-controller';
import { authenticate } from '../middleware/authenticate';

export const toolExecutionRoutes = Router();

toolExecutionRoutes.use(authenticate);

toolExecutionRoutes.post('/execute-tool', toolExecutionController.executeTool);
