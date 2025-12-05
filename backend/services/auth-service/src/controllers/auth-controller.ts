import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { generateToken, verifyToken, extractTokenFromHeader } from '@uaol/shared/auth/jwt';
import { createLogger } from '@uaol/shared/logger';
import { AuthenticationError, ValidationError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';
import {
  handleOAuthCallback,
  exchangeGoogleCode,
  getGoogleUserInfo,
  exchangeOutlookCode,
  getOutlookUserInfo,
  exchangeIcloudCode,
  getIcloudUserInfo,
} from './oauth-handlers';

const logger = createLogger('auth-service');
const userModel = new UserModel(getDatabasePool());

// Helper function to get OAuth config - prioritizes process.env directly since we know those values are set
function getGoogleOAuthConfig() {
  // Scopes are static - define them directly here
  const scopes = [
    'openid',
    'email',
    'profile',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.readonly',
  ];
  
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    scopes: scopes,
  };
}

export const authController = {
  async initiateGoogleOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      // Read directly from process.env (we know these are set correctly)
      const googleConfig = getGoogleOAuthConfig();
      
      logger.info('Checking Google OAuth configuration', {
        hasClientId: !!googleConfig.clientId,
        clientIdLength: googleConfig.clientId?.length || 0,
        hasClientSecret: !!googleConfig.clientSecret,
        clientSecretLength: googleConfig.clientSecret?.length || 0,
        redirectUri: googleConfig.redirectUri,
      });

      if (!googleConfig.clientId || googleConfig.clientId.trim() === '') {
        logger.error('Google OAuth not configured: GOOGLE_CLIENT_ID is missing or empty', {
          envValue: process.env.GOOGLE_CLIENT_ID ? `SET (${process.env.GOOGLE_CLIENT_ID.length} chars)` : 'NOT SET',
        });
        return res.status(500).json({
          success: false,
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
          },
        });
      }
      
      if (!googleConfig.clientSecret || googleConfig.clientSecret.trim() === '') {
        logger.error('Google OAuth not configured: GOOGLE_CLIENT_SECRET is missing or empty');
        return res.status(500).json({
          success: false,
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
          },
        });
      }
      const state = Buffer.from(JSON.stringify({ provider: 'google' })).toString('base64');
      const scopes = googleConfig.scopes.join(' ');
      
      logger.info('Initiating Google OAuth', {
        clientId: googleConfig.clientId.substring(0, 10) + '...',
        redirectUri: googleConfig.redirectUri,
      });
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleConfig.clientId}&` +
        `redirect_uri=${encodeURIComponent(googleConfig.redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${state}`;
      
      res.redirect(authUrl);
    } catch (error: any) {
      logger.error('Google OAuth initiation error', { error: error.message });
      next(error);
    }
  },

  async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Use the same scopes as in the initiation
      const googleConfig = getGoogleOAuthConfig();
      await handleOAuthCallback(
        req,
        res,
        'google',
        exchangeGoogleCode,
        getGoogleUserInfo,
        googleConfig.scopes
      );
    } catch (error) {
      next(error);
    }
  },

  async initiateOutlookOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const state = Buffer.from(JSON.stringify({ provider: 'outlook' })).toString('base64');
      const scopes = config.oauth.outlook.scopes.join(' ');
      
      const authUrl = `https://login.microsoftonline.com/${config.oauth.outlook.tenant}/oauth2/v2.0/authorize?` +
        `client_id=${config.oauth.outlook.clientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(config.oauth.outlook.redirectUri)}&` +
        `response_mode=query&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `state=${state}`;
      
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  async handleOutlookCallback(req: Request, res: Response, next: NextFunction) {
    try {
      await handleOAuthCallback(
        req,
        res,
        'outlook',
        exchangeOutlookCode,
        getOutlookUserInfo,
        config.oauth.outlook.scopes
      );
    } catch (error) {
      next(error);
    }
  },

  async initiateIcloudOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const state = Buffer.from(JSON.stringify({ provider: 'icloud' })).toString('base64');
      const scopes = config.oauth.icloud.scopes.join(' ');
      
      // iCloud uses Sign in with Apple
      const authUrl = `https://appleid.apple.com/auth/authorize?` +
        `client_id=${config.oauth.icloud.clientId}&` +
        `redirect_uri=${encodeURIComponent(config.oauth.icloud.redirectUri)}&` +
        `response_type=code id_token&` +
        `scope=${encodeURIComponent(scopes)}&` +
        `response_mode=form_post&` +
        `state=${state}`;
      
      res.redirect(authUrl);
    } catch (error) {
      next(error);
    }
  },

  async handleIcloudCallback(req: Request, res: Response, next: NextFunction) {
    try {
      // Apple uses POST for callback, so we need to handle it differently
      const { code, id_token, error } = req.body || req.query;

      if (error) {
        throw new AuthenticationError(`OAuth error: ${error}`);
      }

      if (!code || typeof code !== 'string') {
        throw new AuthenticationError('Missing authorization code');
      }

      const tokenResponse = await exchangeIcloudCode(code);
      const userInfo = await getIcloudUserInfo(tokenResponse.access_token, id_token || tokenResponse.id_token);

      if (!userInfo || !userInfo.email) {
        throw new AuthenticationError('Failed to retrieve user email');
      }

      let user = await userModel.findByEmail(userInfo.email);
      if (!user) {
        user = await userModel.create(userInfo.email);
      }

      const { storeOAuthTokens } = await import('./oauth-handlers');
      await storeOAuthTokens(
        user.user_id,
        'icloud',
        tokenResponse.access_token,
        tokenResponse.refresh_token || null,
        tokenResponse.expires_in || null,
        config.oauth.icloud.scopes
      );

      const token = generateToken({
        userId: user.user_id,
        email: user.email,
        subscriptionTier: user.subscription_tier,
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&provider=icloud`);
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

