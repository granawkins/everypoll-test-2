import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createAnonymousUser, getUserById, linkUserToGoogle } from '../services/userService';
import { SESSION_USER_KEY } from '../config/session';
import { getGoogleAuthUrl, getGoogleUserInfo } from '../config/oauth/google';

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
 * Generates a Google authentication URL and returns it
 * The frontend will redirect the user to this URL
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    // Generate a state parameter for CSRF protection
    const state = uuidv4();
    
    // Get the redirect URL from the request body
    const redirectUrl = req.body.redirectUrl || '/';
    
    // Generate Google auth URL
    const googleAuthUrl = getGoogleAuthUrl(state, redirectUrl);
    
    // Return the Google auth URL
    return res.json({ url: googleAuthUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    return res.status(500).json({ error: 'Failed to generate Google auth URL' });
  }
});

/**
 * GET /api/auth/google-callback
 * Handles the callback from Google after user authentication
 * Verifies the authorization code and updates the user's information
 */
router.get('/google-callback', async (req: Request, res: Response) => {
  try {
    const { code, state: encodedState, error } = req.query;
    
    // Handle authentication errors
    if (error) {
      console.error('Google authentication error:', error);
      return res.redirect('/?error=google_auth_failed');
    }
    
    // Validate code and state
    if (!code || !encodedState) {
      return res.redirect('/?error=invalid_callback');
    }
    
    // Decode state parameter to get redirect URL
    // Note: In a production app, we would validate the state parameter against 
    // a stored value to prevent CSRF attacks
    let redirectUrl;
    try {
      const decodedState = Buffer.from(encodedState as string, 'base64').toString();
      const stateObj = JSON.parse(decodedState);
      // State validation would happen here
      redirectUrl = stateObj.redirectUrl || '/';
    } catch (e) {
      console.error('Error decoding state:', e);
      return res.redirect('/?error=invalid_state');
    }
    
    // Get user information from Google
    const googleUserInfo = await getGoogleUserInfo(code as string);
    if (!googleUserInfo || !googleUserInfo.email) {
      return res.redirect('/?error=google_user_info_failed');
    }
    
    // Get user ID from session
    const userId = req.session[SESSION_USER_KEY];
    if (!userId) {
      return res.redirect('/?error=no_session');
    }
    
    // Get user from database
    const user = await getUserById(userId);
    if (!user) {
      return res.redirect('/?error=user_not_found');
    }
    
    // Link user to Google account
    const updatedUser = await linkUserToGoogle(
      user.id,
      googleUserInfo.email,
      googleUserInfo.name
    );
    
    // Update the user in the session
    req.user = updatedUser;
    
    // Redirect to the original URL or home page
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in Google callback:', error);
    return res.redirect('/?error=google_callback_failed');
  }
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
