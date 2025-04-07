import { Router, Request, Response } from 'express';
import { createAnonymousUser } from '../services/userService';
import { SESSION_USER_KEY } from '../config/session';

const router = Router();

/**
 * GET /api/auth/me
 * Returns the current user's information
 * Creates a new anonymous user if no user is authenticated
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // If user is already authenticated, return user data
    if (req.isAuthenticated && req.user) {
      return res.json({ user: req.user });
    }

    // If no user in session, create a new anonymous user
    const newUser = await createAnonymousUser();
    
    // Store user ID in session
    req.session[SESSION_USER_KEY] = newUser.id;
    
    // Return the new user
    return res.status(201).json({ user: newUser });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Placeholder for Google login redirect
 * Will be implemented in step 3
 */
router.post('/login', (req: Request, res: Response) => {
  // Will be implemented in step 3 - Google OAuth
  res.status(501).json({ error: 'Not implemented yet' });
});

/**
 * POST /api/auth/google-callback
 * Placeholder for Google callback
 * Will be implemented in step 3
 */
router.post('/google-callback', (req: Request, res: Response) => {
  // Will be implemented in step 3 - Google OAuth
  res.status(501).json({ error: 'Not implemented yet' });
});

/**
 * POST /api/auth/logout
 * Logs out the current user by destroying the session
 */
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.clearCookie('everypoll.sid');
    return res.json({ message: 'Logged out successfully' });
  });
});

export default router;
