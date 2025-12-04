import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '@uaol/shared/database/connection';
import { UserModel } from '@uaol/shared/database/models/user';
import { verifyToken, extractTokenFromHeader } from '@uaol/shared/auth/jwt';
import { AuthenticationError } from '@uaol/shared/errors';

// Lazy initialization - don't create model until we actually need it
let userModel: UserModel | null = null;

function getUserModel(): UserModel {
  if (!userModel) {
    userModel = new UserModel(getDatabasePool());
  }
  return userModel;
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const payload = verifyToken(token);
    const user = await getUserModel().findById(payload.userId);

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

