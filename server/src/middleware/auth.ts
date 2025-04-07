import { Request, Response, NextFunction } from 'express';
import { getUserById, User } from '../services/userService';

/**
 * Extend Express Request to include user property
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    isAuthenticated: boolean;
  }
}

/**
 * Middleware to attach user to request if session exists
 */
export const attachUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Default to unauthenticated
  req.isAuthenticated = false;

  // Check if there's a user ID in the session
  const userId = req.session.userId;
  if (userId) {
    try {
      // Get user from database
      const user = await getUserById(userId);
      if (user) {
        // Attach user to request
        req.user = user;
        req.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Error fetching user from session:', error);
      // Don't throw error, just proceed as unauthenticated
    }
  }

  next();
};

/**
 * Middleware to require authentication
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.isAuthenticated || !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
};
