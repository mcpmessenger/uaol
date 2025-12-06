import { Router } from 'express';
import { billingController } from '../controllers/billing-controller';
import { creditController } from '../controllers/credit-controller';
import { authenticate } from '../middleware/authenticate';

export const billingRoutes = Router();

// Webhook route must be before authenticate middleware (Stripe sends raw body)
billingRoutes.post('/webhook/stripe', billingController.handleStripeWebhook);

// All other routes require authentication
billingRoutes.use(authenticate);

billingRoutes.post('/subscribe', billingController.createSubscription);
billingRoutes.get('/subscription', billingController.getSubscription);
billingRoutes.post('/subscription/cancel', billingController.cancelSubscription);

// Credit routes
billingRoutes.get('/credits', creditController.getBalance);
billingRoutes.post('/credits/deduct', creditController.deductCredits);
billingRoutes.post('/credits/refund', creditController.refundCredits);
billingRoutes.get('/credits/history', creditController.getHistory);

