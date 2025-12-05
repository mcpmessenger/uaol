import { Request, Response, NextFunction } from 'express';
import { UAOLError } from '@uaol/shared/errors';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('auth-service');

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

  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
  });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'An internal error occurred',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

