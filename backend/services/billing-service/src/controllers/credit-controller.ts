import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { createLogger } from '@uaol/shared/logger';
import { ValidationError, InsufficientCreditsError } from '@uaol/shared/errors';

const logger = createLogger('billing-service');
const userModel = new UserModel(getDatabasePool());

export const creditController = {
  async deductCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { amount, jobId } = req.body;

      if (!amount || amount <= 0) {
        throw new ValidationError('Valid amount is required');
      }

      const currentCredits = user.current_credits;
      const deductionAmount = BigInt(amount);

      if (currentCredits < deductionAmount) {
        throw new InsufficientCreditsError(Number(deductionAmount), Number(currentCredits));
      }

      const newCredits = currentCredits - deductionAmount;
      await userModel.updateCredits(user.user_id, newCredits);

      logger.info('Credits deducted', {
        userId: user.user_id,
        amount: Number(deductionAmount),
        remaining: Number(newCredits),
        jobId,
      });

      res.json({
        success: true,
        data: {
          deducted: amount,
          remaining: newCredits.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async refundCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const { amount, jobId } = req.body;

      if (!amount || amount <= 0) {
        throw new ValidationError('Valid amount is required');
      }

      const currentCredits = user.current_credits;
      const refundAmount = BigInt(amount);
      const newCredits = currentCredits + refundAmount;

      await userModel.updateCredits(user.user_id, newCredits);

      logger.info('Credits refunded', {
        userId: user.user_id,
        amount: Number(refundAmount),
        newBalance: Number(newCredits),
        jobId,
      });

      res.json({
        success: true,
        data: {
          refunded: amount,
          newBalance: newCredits.toString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getBalance(req: Request, res: Response, next: NextFunction) {
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

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement credit transaction history
      res.json({
        success: true,
        data: [],
        message: 'Credit history not yet implemented',
      });
    } catch (error) {
      next(error);
    }
  },
};

