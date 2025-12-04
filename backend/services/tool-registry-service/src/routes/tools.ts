import { Router } from 'express';
import { toolController } from '../controllers/tool-controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeDeveloper } from '../middleware/authorize';

export const toolRoutes = Router();

// Public routes
toolRoutes.get('/', toolController.listTools);
toolRoutes.get('/:toolId', toolController.getTool);

// Protected routes
toolRoutes.use(authenticate);

toolRoutes.post('/', authorizeDeveloper, toolController.registerTool);
toolRoutes.put('/:toolId', authorizeDeveloper, toolController.updateTool);
toolRoutes.delete('/:toolId', authorizeDeveloper, toolController.deleteTool);
toolRoutes.get('/my/tools', toolController.getMyTools);
toolRoutes.post('/:toolId/approve', toolController.approveTool); // Admin only
toolRoutes.post('/:toolId/disable', toolController.disableTool);

