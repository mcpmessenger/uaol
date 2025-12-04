import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';

// Simple in-memory rate limiter (should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return next();
  }

  const key = `rate_limit_${user.user_id}`;
  const now = Date.now();
  const limit = config.apiGateway.rateLimitPerMinute;
  const windowMs = 60 * 1000; // 1 minute

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  if (record.count >= limit) {
    return next(new RateLimitError(`Rate limit exceeded. Maximum ${limit} requests per minute.`));
  }

  record.count++;
  next();
}

