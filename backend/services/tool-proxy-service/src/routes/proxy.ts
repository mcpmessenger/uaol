import { Router } from 'express';
import { proxyController } from '../controllers/proxy-controller';
import { authenticate } from '../middleware/authenticate';

export const proxyRoutes = Router();

// List tool methods endpoint - temporarily public for development
// TODO: Re-enable authentication in production
proxyRoutes.get('/:toolId/tools', proxyController.listToolMethods);

proxyRoutes.use(authenticate);

proxyRoutes.post('/:toolId/call', proxyController.callTool);

