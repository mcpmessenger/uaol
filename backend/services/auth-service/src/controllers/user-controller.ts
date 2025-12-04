import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel, SubscriptionTier } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError } from '@uaol/shared/errors';

const logger = createLogger('auth-service');
const userModel = new UserModel(getDatabasePool());

export const userController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          id: user.user_id,
          email: user.email,
          subscriptionTier: user.subscription_tier,
          credits: user.current_credits.toString(),
          createdAt: user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { email } = req.body;

      if (email && email !== user.email) {
        // TODO: Implement email update with verification
        throw new ValidationError('Email update not yet implemented');
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async getCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          credits: user.current_credits.toString(),
        },
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

  async updateSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { tier } = req.body;

      if (!Object.values(SubscriptionTier).includes(tier)) {
        throw new ValidationError('Invalid subscription tier');
      }

      await userModel.updateSubscriptionTier(user.user_id, tier as SubscriptionTier);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};

