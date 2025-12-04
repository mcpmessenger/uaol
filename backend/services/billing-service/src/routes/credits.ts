import { Router } from 'express';
import { creditController } from '../controllers/credit-controller';
import { authenticate } from '../middleware/authenticate';

export const creditRoutes = Router();

creditRoutes.use(authenticate);

creditRoutes.post('/deduct', creditController.deductCredits);
creditRoutes.post('/refund', creditController.refundCredits);
creditRoutes.get('/balance', creditController.getBalance);
creditRoutes.get('/history', creditController.getHistory);

