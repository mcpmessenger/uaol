import { Request, Response, NextFunction } from 'express';
import { getDatabasePool } from '../database/connection.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('guest-limits');

/**
 * Guest user limits:
 * - 10 workflows per session
 * - 100 tool calls per session
 * - 1000 credits per session
 */
const GUEST_LIMITS = {
  MAX_WORKFLOWS: 10,
  MAX_TOOL_CALLS: 100,
  INITIAL_CREDITS: 1000,
};

/**
 * Check if user is a guest and enforce limits
 */
export async function checkGuestLimits(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const isGuest = (req as any).isGuest;
    const user = (req as any).user;

    if (!isGuest) {
      // Not a guest - no limits
      return next();
    }

    // Guest user - check limits
    // For now, we'll check credits (workflow and tool call limits can be added later)
    if (user.current_credits <= 0n) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'GUEST_LIMIT_EXCEEDED',
          message: 'Guest credits exhausted. Please sign up for more credits.',
        },
      });
    }

    // Log guest usage
    logger.info('Guest user action', {
      userId: user.user_id,
      creditsRemaining: Number(user.current_credits),
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Get guest limits info
 */
export function getGuestLimits() {
  return GUEST_LIMITS;
}

