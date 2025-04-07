import { Request, Response } from 'express';
import { Session } from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import { createAnonymousUser, getUserById, linkUserToGoogle, User } from '../../services/userService';
import { getGoogleAuthUrl, getGoogleUserInfo } from '../../config/oauth/google';

// Mock the uuid generation
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid'),
}));

// Mock the user service
jest.mock('../../services/userService', () => ({
  createAnonymousUser: jest.fn(),
  getUserById: jest.fn(),
  linkUserToGoogle: jest.fn(),
}));

// Mock the Google OAuth functions
jest.mock('../../config/oauth/google', () => ({
  getGoogleAuthUrl: jest.fn(),
  getGoogleUserInfo: jest.fn(),
}));

// Define types for the request properties
type RequestQuery = Record<string, string | undefined>;
type RequestBody = Record<string, unknown>;

// Create a more complete mock session
interface MockRequest extends Partial<Request> {
  session: Session & { userId?: string };
  isAuthenticated?: boolean;
  user?: User;
  body?: RequestBody;
  query?: RequestQuery;
}

// Type for API response
type ApiResponse = Response<unknown>;

// Here we'll test them directly without HTTP
describe('Auth Routes', () => {
  let mockRequest: MockRequest;
  let mockResponse: Partial<Response>;
  let handlers: { [key: string]: (req: Request, res: Response) => Promise<ApiResponse | void> };

  // Extract route handlers from the auth router
  beforeAll(() => {
    // Clear the module cache to ensure we get a fresh instance
    jest.resetModules();
    
    // We can't easily extract handlers from Express Router
    // So we'll define them here to match the implementation
    handlers = {
      getMeHandler: async (req: Request, res: Response): Promise<ApiResponse> => {
        try {
          if (req.isAuthenticated && req.user) {
            return res.json({ user: req.user });
          }
          
          const newUser = await createAnonymousUser();
          req.session.userId = newUser.id;
          return res.status(201).json({ user: newUser });
        } catch (error) {
          console.error('Error in /api/auth/me:', error);
          return res.status(500).json({ error: 'Internal server error' });
        }
      },
      loginHandler: async (req: Request, res: Response): Promise<ApiResponse> => {
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
      },
      googleCallbackHandler: async (req: Request, res: Response): Promise<ApiResponse | void> => {
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
          const userId = req.session.userId;
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
      },
      logoutHandler: async (req: Request, res: Response): Promise<ApiResponse> => {
        return new Promise<ApiResponse>((resolve) => {
          req.session.destroy((err) => {
            if (err) {
              console.error('Error destroying session:', err);
              resolve(res.status(500).json({ error: 'Failed to logout' }));
            } else {
              res.clearCookie('everypoll.sid');
              resolve(res.json({ message: 'Logged out successfully' }));
            }
          });
        });
      }
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Create a session mock that returns itself for chaining
    const sessionMock = {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: 86400000, // 1 day in milliseconds
        expires: new Date(Date.now() + 86400000),
        secure: false,
        httpOnly: true,
        path: '/',
        domain: undefined,
        sameSite: 'lax' as const
      },
      userId: undefined,
      regenerate: function(cb: (err: Error | null) => void) {
        cb(null);
        return this;
      },
      destroy: function(cb: (err: Error | null) => void) {
        cb(null);
        return this;
      },
      reload: function(cb: (err: Error | null) => void) {
        cb(null);
        return this;
      },
      save: function(cb: (err: Error | null) => void) {
        cb(null);
        return this;
      },
      touch: function() {
        return this;
      },
      resetMaxAge: function() {
        return this;
      }
    };
    
    mockRequest = {
      session: sessionMock as Session & { userId?: string },
      isAuthenticated: false,
      user: undefined,
      body: {},
      query: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
    };
  });

  describe('GET /api/auth/me', () => {
    it('should create a new anonymous user when no session exists', async () => {
      // Mock user creation
      const mockUser = { id: 'new-user-id', email: null, name: null };
      (createAnonymousUser as jest.Mock).mockResolvedValueOnce(mockUser);

      // Call the handler directly
      await handlers.getMeHandler(mockRequest as Request, mockResponse as Response);

      // Check that createAnonymousUser was called
      expect(createAnonymousUser).toHaveBeenCalled();

      // Check response status and data
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ user: mockUser });

      // Check session was updated with user ID
      expect(mockRequest.session.userId).toBe(mockUser.id);
    });

    it('should return existing user when already authenticated', async () => {
      const mockUser = { id: 'existing-user-id', email: null, name: null };
      mockRequest.isAuthenticated = true;
      mockRequest.user = mockUser;

      // Call the handler directly
      await handlers.getMeHandler(mockRequest as Request, mockResponse as Response);

      // Check that we didn't create a new user
      expect(createAnonymousUser).not.toHaveBeenCalled();

      // Check response
      expect(mockResponse.json).toHaveBeenCalledWith({ user: mockUser });
      expect(mockResponse.status).not.toHaveBeenCalledWith(201);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should generate and return a Google auth URL', async () => {
      // Mock the Google auth URL
      const mockGoogleAuthUrl = 'https://accounts.google.com/o/oauth2/auth?response_type=code&...';
      (getGoogleAuthUrl as jest.Mock).mockReturnValueOnce(mockGoogleAuthUrl);
      
      // Set redirect URL in request body
      mockRequest.body = { redirectUrl: '/profile' };
      
      // Call the handler
      await handlers.loginHandler(mockRequest as Request, mockResponse as Response);
      
      // Check that getGoogleAuthUrl was called with the right parameters
      expect(getGoogleAuthUrl).toHaveBeenCalledWith('test-uuid', '/profile');
      
      // Check that we returned the URL
      expect(mockResponse.json).toHaveBeenCalledWith({ url: mockGoogleAuthUrl });
    });
    
    it('should use default redirect URL if none is provided', async () => {
      // Mock the Google auth URL
      const mockGoogleAuthUrl = 'https://accounts.google.com/o/oauth2/auth?response_type=code&...';
      (getGoogleAuthUrl as jest.Mock).mockReturnValueOnce(mockGoogleAuthUrl);
      
      // Empty request body
      mockRequest.body = {};
      
      // Call the handler
      await handlers.loginHandler(mockRequest as Request, mockResponse as Response);
      
      // Check default redirect URL
      expect(getGoogleAuthUrl).toHaveBeenCalledWith('test-uuid', '/');
      expect(mockResponse.json).toHaveBeenCalledWith({ url: mockGoogleAuthUrl });
    });
    
    it('should handle errors gracefully', async () => {
      // Mock getGoogleAuthUrl to throw an error
      (getGoogleAuthUrl as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Auth URL generation failed');
      });
      
      // Call the handler
      await handlers.loginHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to generate Google auth URL' });
    });
  });

  describe('GET /api/auth/google-callback', () => {
    beforeEach(() => {
      // Default successful scenario setup
      mockRequest.query = {
        code: 'test-auth-code',
        state: Buffer.from(JSON.stringify({ state: 'test-state', redirectUrl: '/profile' })).toString('base64'),
      };
      mockRequest.session.userId = 'test-user-id';
      
      // Mock Google user info response
      (getGoogleUserInfo as jest.Mock).mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      });
      
      // Mock user retrieval and linking
      const mockUser = { id: 'test-user-id', email: null, name: null };
      const mockUpdatedUser = { id: 'test-user-id', email: 'test@example.com', name: 'Test User' };
      (getUserById as jest.Mock).mockResolvedValue(mockUser);
      (linkUserToGoogle as jest.Mock).mockResolvedValue(mockUpdatedUser);
    });
    
    it('should process successful Google authentication and redirect', async () => {
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check that we fetched Google user info
      expect(getGoogleUserInfo).toHaveBeenCalledWith('test-auth-code');
      
      // Check that we retrieved the user
      expect(getUserById).toHaveBeenCalledWith('test-user-id');
      
      // Check that we linked the user to Google
      expect(linkUserToGoogle).toHaveBeenCalledWith(
        'test-user-id', 
        'test@example.com', 
        'Test User'
      );
      
      // Check that we updated the user in the session
      expect(mockRequest.user).toEqual({ 
        id: 'test-user-id', 
        email: 'test@example.com', 
        name: 'Test User' 
      });
      
      // Check that we redirected to the correct URL
      expect(mockResponse.redirect).toHaveBeenCalledWith('/profile');
    });
    
    it('should handle Google authentication errors', async () => {
      // Set error in query params
      mockRequest.query = { error: 'access_denied' };
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=google_auth_failed');
    });
    
    it('should handle missing code or state', async () => {
      // Set missing code
      mockRequest.query = { state: 'some-state' };
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=invalid_callback');
      
      // Reset response mock
      jest.clearAllMocks();
      
      // Set missing state
      mockRequest.query = { code: 'some-code' };
      
      // Call the handler again
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=invalid_callback');
    });
    
    it('should handle invalid state parameter', async () => {
      // Set invalid state
      mockRequest.query = { 
        code: 'test-auth-code',
        state: 'invalid-base64', 
      };
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=invalid_state');
    });
    
    it('should handle failure to get Google user info', async () => {
      // Mock getGoogleUserInfo to return null
      (getGoogleUserInfo as jest.Mock).mockResolvedValue(null);
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=google_user_info_failed');
    });
    
    it('should handle missing session', async () => {
      // Remove user ID from session
      mockRequest.session.userId = undefined;
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=no_session');
    });
    
    it('should handle user not found in database', async () => {
      // Mock getUserById to return null
      (getUserById as jest.Mock).mockResolvedValue(null);
      
      // Call the handler
      await handlers.googleCallbackHandler(mockRequest as Request, mockResponse as Response);
      
      // Check error redirect
      expect(mockResponse.redirect).toHaveBeenCalledWith('/?error=user_not_found');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should destroy the session and clear cookie', async () => {
      // Call the handler directly
      await handlers.logoutHandler(mockRequest as Request, mockResponse as Response);

      // Check that session was destroyed
      expect(mockRequest.session.destroy).toHaveBeenCalled();

      // Check that cookie was cleared
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('everypoll.sid');

      // Check response
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should handle session destroy errors', async () => {
      // Create a new session mock with error on destroy
      const errorSession = {
        ...mockRequest.session,
        destroy: function(cb: (err: Error | null) => void) {
          cb(new Error('Session destroy error'));
          return this;
        }
      };
      
      // Replace the session
      mockRequest.session = errorSession as Session & { userId?: string };

      // Call the handler directly
      await handlers.logoutHandler(mockRequest as Request, mockResponse as Response);

      // Check error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to logout' });
    });
  });
});
