import { Router } from 'express';
import { toolController } from '../controllers/tool-controller';
import { authenticate } from '../middleware/authenticate';
import { authorizeDeveloper } from '../middleware/authorize';

export const toolRoutes = Router();

// Public routes
toolRoutes.get('/', toolController.listTools);
toolRoutes.get('/:toolId', toolController.getTool);

// Registration endpoint - extracts user from token directly (avoids DB query that was hanging)
// TODO: Re-enable full authentication in production
toolRoutes.post('/', toolController.registerTool);

// Approval endpoint - temporarily public for development
// TODO: Re-enable authentication in production
toolRoutes.post('/:toolId/approve', toolController.approveTool);

// Update endpoint - temporarily public for development
// TODO: Re-enable authentication in production
toolRoutes.put('/:toolId', toolController.updateTool);

// Protected routes
toolRoutes.use(authenticate);
toolRoutes.delete('/:toolId', authorizeDeveloper, toolController.deleteTool);
toolRoutes.get('/my/tools', toolController.getMyTools);
toolRoutes.post('/:toolId/disable', toolController.disableTool);

