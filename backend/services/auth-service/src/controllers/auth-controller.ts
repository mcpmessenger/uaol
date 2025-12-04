import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { generateToken, verifyToken, extractTokenFromHeader } from '@uaol/shared/auth/jwt';
import { createLogger } from '@uaol/shared/logger';
import { AuthenticationError, ValidationError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';

const logger = createLogger('auth-service');
const userModel = new UserModel(getDatabasePool());

export const authController = {
  async initiateGoogleOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement Google OAuth flow
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${config.oauth.google.clientId}&` +
        `redirect_uri=${config.oauth.google.redirectUri}&` +
        `response_type=code&` +
        `scope=openid email profile`;
      
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      
      if (!code) {
        throw new AuthenticationError('Missing authorization code');
      }

      // TODO: Exchange code for token, get user info
      // For now, create a mock user
      const email = 'user@example.com'; // Get from Google
      
      let user = await userModel.findByEmail(email);
      
      if (!user) {
        user = await userModel.create(email);
      }

      const token = generateToken({
        userId: user.user_id,
        email: user.email,
        subscriptionTier: user.subscription_tier,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.user_id,
            email: user.email,
            subscriptionTier: user.subscription_tier,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new ValidationError('Email is required');
      }

      // Check if user already exists
      const existingUser = await userModel.findByEmail(email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Create new user (API key is auto-generated)
      const user = await userModel.create(email);

      // Generate token for immediate login
      const token = generateToken({
        userId: user.user_id,
        email: user.email,
        subscriptionTier: user.subscription_tier,
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.user_id,
            email: user.email,
            subscriptionTier: user.subscription_tier,
            credits: user.current_credits.toString(),
            apiKey: user.api_key, // Return API key on registration
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, apiKey } = req.body;

      if (apiKey) {
        const user = await userModel.findByApiKey(apiKey);
        if (!user) {
          throw new AuthenticationError('Invalid API key');
        }

        const token = generateToken({
          userId: user.user_id,
          email: user.email,
          subscriptionTier: user.subscription_tier,
        });

        return res.json({
          success: true,
          data: { token },
        });
      }

      if (email) {
        const user = await userModel.findByEmail(email);
        if (!user) {
          throw new AuthenticationError('User not found');
        }

        const token = generateToken({
          userId: user.user_id,
          email: user.email,
          subscriptionTier: user.subscription_tier,
        });

        return res.json({
          success: true,
          data: { token },
        });
      }

      throw new AuthenticationError('Email or API key required');
    } catch (error) {
      next(error);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement token blacklisting if needed
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
      next(error);
    }
  },

  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          id: user.user_id,
          email: user.email,
          subscriptionTier: user.subscription_tier,
          credits: user.current_credits.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async regenerateApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      // TODO: Implement API key regeneration
      res.json({
        success: true,
        message: 'API key regeneration not yet implemented',
      });
    } catch (error) {
      next(error);
    }
  },

  async getApiKey(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      res.json({
        success: true,
        data: {
          apiKey: user.api_key,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

