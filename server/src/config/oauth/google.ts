import { OAuth2Client } from 'google-auth-library';

/**
 * Google OAuth configuration
 * These values should be set in environment variables in production
 */
export const GOOGLE_CONFIG = {
  // The client ID from Google Developer Console
  clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  
  // The client secret from Google Developer Console  
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
  
  // The OAuth 2.0 redirect URI
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google-callback',
  
  // The authorization URL for Google's OAuth 2.0 server
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  
  // The token URL for Google's OAuth 2.0 server
  tokenUrl: 'https://oauth2.googleapis.com/token',
  
  // The scopes requested from Google
  scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
};

/**
 * Create an OAuth2Client using the Google configuration
 */
export const createOAuth2Client = (): OAuth2Client => {
  return new OAuth2Client(
    GOOGLE_CONFIG.clientId,
    GOOGLE_CONFIG.clientSecret,
    GOOGLE_CONFIG.redirectUri
  );
};

/**
 * Generate a URL for Google authentication
 * @param state State parameter for CSRF protection
 * @param redirectUrl URL to redirect to after authentication
 * @returns The Google authentication URL
 */
export const getGoogleAuthUrl = (state: string, redirectUrl: string): string => {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_CONFIG.scopes,
    state: Buffer.from(JSON.stringify({ state, redirectUrl })).toString('base64'),
    prompt: 'consent',
  });
};

/**
 * Verify a Google ID token
 * @param idToken The Google ID token to verify
 * @returns Google user info or null if verification fails
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<{
  email: string;
  name: string;
  sub: string;
} | null> => {
  try {
    const oauth2Client = createOAuth2Client();
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: GOOGLE_CONFIG.clientId,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return null;
    }
    
    return {
      email: payload.email,
      name: payload.name || '',
      sub: payload.sub,
    };
  } catch (error) {
    console.error('Error verifying Google ID token:', error);
    return null;
  }
};

/**
 * Get user information from Google using an authorization code
 * @param code Authorization code from Google redirect
 * @returns Google user information
 */
export const getGoogleUserInfo = async (code: string): Promise<{
  email: string;
  name: string;
} | null> => {
  try {
    const oauth2Client = createOAuth2Client();
    
    // Exchange authorization code for access token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    if (!tokens.id_token) {
      return null;
    }
    
    // Verify the ID token to get user info
    const userInfo = await verifyGoogleIdToken(tokens.id_token);
    if (!userInfo || !userInfo.email) {
      return null;
    }
    
    return {
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
    };
  } catch (error) {
    console.error('Error getting Google user info:', error);
    return null;
  }
};
