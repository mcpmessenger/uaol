import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '@uaol/shared/errors';

export function authorizeDeveloper(req: Request, res: Response, next: NextFunction) {
  // For now, any authenticated user can register tools
  // TODO: Add developer tier check if needed
  next();
}

