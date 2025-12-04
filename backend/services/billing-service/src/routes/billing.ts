import { Router } from 'express';
import { billingController } from '../controllers/billing-controller';
import { authenticate } from '../middleware/authenticate';

export const billingRoutes = Router();

billingRoutes.use(authenticate);

billingRoutes.post('/subscribe', billingController.createSubscription);
billingRoutes.get('/subscription', billingController.getSubscription);
billingRoutes.post('/subscription/cancel', billingController.cancelSubscription);
billingRoutes.post('/webhook/stripe', billingController.handleStripeWebhook);

