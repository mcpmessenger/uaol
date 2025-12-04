import { Router } from 'express';
import { proxyController } from '../controllers/proxy-controller';
import { authenticate } from '../middleware/authenticate';

export const proxyRoutes = Router();

proxyRoutes.use(authenticate);

proxyRoutes.post('/:toolId/call', proxyController.callTool);
proxyRoutes.get('/:toolId/tools', proxyController.listToolMethods);

