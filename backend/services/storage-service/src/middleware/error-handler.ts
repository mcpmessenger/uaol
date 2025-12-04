import { Request, Response, NextFunction } from 'express';
import { UAOLError } from '@uaol/shared/errors';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('storage-service');

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  if (err instanceof UAOLError) {
    logger.warn('Handled error', { error: err.message, code: err.code, statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    },
  });
}

