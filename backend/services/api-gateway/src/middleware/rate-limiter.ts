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
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', (limit - 1).toString());
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    
    return next();
  }

  if (record.count >= limit) {
    // Add rate limit headers even when limit exceeded
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
    res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
    
    return next(new RateLimitError(`Rate limit exceeded. Maximum ${limit} requests per minute.`));
  }

  record.count++;
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', limit.toString());
  res.setHeader('X-RateLimit-Remaining', (limit - record.count).toString());
  res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());
  
  next();
}

