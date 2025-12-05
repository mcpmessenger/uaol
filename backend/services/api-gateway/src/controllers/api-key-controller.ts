import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserApiKeyModel } from '@uaol/shared/database/models/user-api-key';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError, AuthenticationError } from '@uaol/shared/errors';

const logger = createLogger('api-key-controller');
const apiKeyModel = new UserApiKeyModel(getDatabasePool());

type AIProvider = 'openai' | 'gemini' | 'claude';

function validateApiKeyFormat(provider: AIProvider, key: string): boolean {
  const trimmed = key.trim();
  
  switch (provider) {
    case 'openai':
      return trimmed.startsWith('sk-') && trimmed.length > 20;
    case 'gemini':
      return /^[A-Za-z0-9_-]+$/.test(trimmed) && trimmed.length >= 20;
    case 'claude':
      return trimmed.startsWith('sk-ant-') && trimmed.length > 20;
    default:
      return false;
  }
}

export const apiKeyController = {
  async createOrUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const { provider, apiKey, isDefault } = req.body;

      if (!provider || !apiKey) {
        throw new ValidationError('Provider and API key are required');
      }

      if (!['openai', 'gemini', 'claude'].includes(provider)) {
        throw new ValidationError('Invalid provider. Must be one of: openai, gemini, claude');
      }

      if (!validateApiKeyFormat(provider as AIProvider, apiKey)) {
        throw new ValidationError(`Invalid ${provider} API key format`);
      }

      // upsert expects plaintext - it will encrypt internally
      const result = await apiKeyModel.upsert(
        user.user_id,
        provider as AIProvider,
        apiKey.trim(),
        isDefault === true
      );

      logger.info('API key created/updated', {
        userId: user.user_id,
        provider,
        isDefault: isDefault === true,
      });

      // Mask the API key for display
      const maskedKey = apiKey.trim().length <= 12 
        ? '****' 
        : `${apiKey.trim().substring(0, 8)}...${apiKey.trim().substring(apiKey.trim().length - 4)}`;

      res.json({
        success: true,
        data: {
          provider: result.provider,
          isDefault: result.is_default,
          maskedKey,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const keys = await apiKeyModel.listByUser(user.user_id);

      res.json({
        success: true,
        data: keys.map(key => ({
          provider: key.provider,
          isDefault: key.is_default,
          maskedKey: '***',
          createdAt: key.created_at,
          updatedAt: key.updated_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  },

  async getByProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const { provider } = req.params;

      if (!['openai', 'gemini', 'claude'].includes(provider)) {
        throw new ValidationError('Invalid provider. Must be one of: openai, gemini, claude');
      }

      const key = await apiKeyModel.findByUserAndProvider(user.user_id, provider as AIProvider);

      if (!key) {
        return res.json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: {
          provider: key.provider,
          isDefault: key.is_default,
          maskedKey: '***',
          createdAt: key.created_at,
          updatedAt: key.updated_at,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const { provider } = req.params;

      if (!['openai', 'gemini', 'claude'].includes(provider)) {
        throw new ValidationError('Invalid provider. Must be one of: openai, gemini, claude');
      }

      const existingKey = await apiKeyModel.findByUserAndProvider(user.user_id, provider as AIProvider);
      if (!existingKey) {
        throw new ValidationError(`API key for provider ${provider} not found. Please set it first.`);
      }

      await apiKeyModel.setDefault(user.user_id, provider as AIProvider);

      // Get the updated key to return
      const updatedKey = await apiKeyModel.findByUserAndProvider(user.user_id, provider as AIProvider);

      logger.info('Default provider set', {
        userId: user.user_id,
        provider,
      });

      res.json({
        success: true,
        data: {
          provider: updatedKey!.provider,
          isDefault: updatedKey!.is_default,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      const { provider } = req.params;

      if (!['openai', 'gemini', 'claude'].includes(provider)) {
        throw new ValidationError('Invalid provider. Must be one of: openai, gemini, claude');
      }

      await apiKeyModel.delete(user.user_id, provider as AIProvider);

      logger.info('API key deleted', {
        userId: user.user_id,
        provider,
      });

      res.json({
        success: true,
        data: {
          message: `API key for ${provider} deleted successfully`,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
