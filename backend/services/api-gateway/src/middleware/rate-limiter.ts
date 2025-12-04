import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '@uaol/shared/errors';
import { config } from '@uaol/shared/config';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const limit = config.apiGateway.rateLimitPerMinute;
  const windowMs = 60 * 1000;

  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, {
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

