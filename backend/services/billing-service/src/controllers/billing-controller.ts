import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { config } from '@uaol/shared/config';

const logger = createLogger('billing-service');
const userModel = new UserModel(getDatabasePool());

export const billingController = {
  async createSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { tier, paymentMethodId } = req.body;

      // TODO: Implement Stripe subscription creation
      logger.info('Creating subscription', { userId: user.user_id, tier });

      res.json({
        success: true,
        message: 'Subscription creation not yet fully implemented',
      });
    } catch (error) {
      next(error);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          tier: user.subscription_tier,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      // TODO: Implement Stripe subscription cancellation
      logger.info('Cancelling subscription', { userId: user.user_id });

      res.json({
        success: true,
        message: 'Subscription cancellation not yet fully implemented',
      });
    } catch (error) {
      next(error);
    }
  },

  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement Stripe webhook handling
      const signature = req.headers['stripe-signature'];
      logger.info('Received Stripe webhook', { signature });

      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  },
};

