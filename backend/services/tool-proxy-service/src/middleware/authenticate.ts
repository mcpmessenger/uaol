import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { verifyToken, extractTokenFromHeader } from '@uaol/shared/auth/jwt';
import { AuthenticationError } from '@uaol/shared/errors';

const userModel = new UserModel(getDatabasePool());

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = verifyToken(token);
    const user = await userModel.findById(payload.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    (req as any).user = user;
    next();
  } catch (error) {
    if (error instanceof AuthenticationError) {
      next(error);
    } else {
      next(new AuthenticationError('Invalid token'));
    }
  }
}

