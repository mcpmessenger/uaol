import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '../database/connection.js';
import { UserModel } from '../database/models/user.js';
import { verifyToken, extractTokenFromHeader } from './jwt.js';
import { AuthenticationError } from '../errors/index.js';
import { randomUUID } from 'crypto';

// Lazy initialization - don't create model until we actually need it
let userModel: UserModel | null = null;

function getUserModel(): UserModel {
  if (!userModel) {
    userModel = new UserModel(getDatabasePool());
  }
  return userModel;
}

/**
 * Optional authentication middleware
 * - If token provided: authenticate normally
 * - If no token: create/get guest user
 * Sets req.user and req.isGuest
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    // If token provided, authenticate normally
    if (token) {
      try {
        const payload = verifyToken(token);
        const user = await getUserModel().findById(payload.userId);

        if (!user) {
          throw new AuthenticationError('User not found');
        }

        (req as any).user = user;
        (req as any).isGuest = false;
        return next();
      } catch (error) {
        // Invalid token - fall through to guest mode
        // Don't throw error, just create guest user
      }
    }

    // No token or invalid token - create/get guest user
    const guestId = (req.headers['x-guest-id'] as string) || randomUUID();
    
    let guest = await getUserModel().findGuestBySessionId(guestId);

    if (!guest) {
      // Create new guest user
      guest = await getUserModel().createGuest(guestId);
    }

    // Check if guest has expired (24 hours)
    const expiresAt = guest.expires_at ? new Date(guest.expires_at) : null;
    if (expiresAt && expiresAt < new Date()) {
      // Guest expired - create new one
      guest = await getUserModel().createGuest(guestId);
    }

    (req as any).user = guest;
    (req as any).isGuest = true;
    (req as any).guestId = guestId;
    
    next();
  } catch (error) {
    // If guest creation fails, still allow request but log error
    console.error('Guest authentication error:', error);
    // Create a minimal guest object to prevent crashes
    (req as any).user = {
      user_id: randomUUID(),
      email: `guest_${Date.now()}@uaol.guest`,
      current_credits: BigInt(1000),
      subscription_tier: 'Free',
      api_key: `guest_${randomUUID()}`,
      is_guest: true,
    };
    (req as any).isGuest = true;
    next();
  }
}

