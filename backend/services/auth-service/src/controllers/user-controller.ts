import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel, SubscriptionTier } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError } from '@uaol/shared/errors';

const logger = createLogger('auth-service');
const pool = getDatabasePool();
const userModel = new UserModel(pool);

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
          avatarUrl: user.avatar_url || null,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { email, avatarUrl } = req.body;

      if (!email && !avatarUrl) {
        throw new ValidationError('At least one field (email or avatarUrl) is required');
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (email && email !== user.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          throw new ValidationError('Invalid email format');
        }

        // Check if email is already taken
        const existingUser = await userModel.findByEmail(email);
        if (existingUser && existingUser.user_id !== user.user_id) {
          throw new ValidationError('Email is already in use');
        }

        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }

      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl || null);
      }

      if (updates.length === 0) {
        throw new ValidationError('No valid fields to update');
      }

      // Update updated_at timestamp
      updates.push('updated_at = NOW()');
      values.push(user.user_id);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      const updatedUser = await userModel.findById(result.rows[0].user_id);
      
      if (!updatedUser) {
        throw new ValidationError('Failed to update profile');
      }

      logger.info('Profile updated', { userId: user.user_id, fields: Object.keys(req.body) });

      res.json({
        success: true,
        data: {
          id: updatedUser.user_id,
          email: updatedUser.email,
          avatarUrl: updatedUser.avatar_url || null,
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw new ValidationError('Current password and new password are required');
      }

      if (newPassword.length < 8) {
        throw new ValidationError('New password must be at least 8 characters long');
      }

      // For now, we don't have password storage in the database
      // This is a placeholder for when password authentication is implemented
      // For OAuth-only users, this would need different handling
      
      // TODO: Implement password verification and hashing
      // For now, return success (password change not fully implemented without password storage)
      
      logger.info('Password change requested', { userId: user.user_id });

      res.json({
        success: true,
        message: 'Password change functionality requires password storage to be implemented',
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

