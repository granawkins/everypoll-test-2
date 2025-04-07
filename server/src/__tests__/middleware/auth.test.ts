import { Request, Response } from 'express';
import { attachUser, requireAuth } from '../../middleware/auth';
import { getUserById } from '../../services/userService';
import { SESSION_USER_KEY } from '../../config/session';

// Mock the user service
jest.mock('../../services/userService', () => ({
  getUserById: jest.fn(),
}));

// Type for Express session
type MockSession = {
  [SESSION_USER_KEY]?: string;
  destroy: (callback: (err: Error | null) => void) => void;
};

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock request, response, and next function
    mockRequest = {
      session: {} as MockSession,
      isAuthenticated: false,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('attachUser', () => {
    it('should pass through if no user in session', async () => {
      await attachUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(getUserById).not.toHaveBeenCalled();
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should attach user if valid user ID in session', async () => {
      const testUser = { id: 'test-user-id', email: null, name: null };
      mockRequest.session = { [SESSION_USER_KEY]: testUser.id } as MockSession;
      (getUserById as jest.Mock).mockResolvedValue(testUser);

      await attachUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(getUserById).toHaveBeenCalledWith(testUser.id);
      expect(mockRequest.isAuthenticated).toBe(true);
      expect(mockRequest.user).toEqual(testUser);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle case where user not found in database', async () => {
      mockRequest.session = { [SESSION_USER_KEY]: 'non-existent-id' } as MockSession;
      (getUserById as jest.Mock).mockResolvedValue(undefined);

      await attachUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(getUserById).toHaveBeenCalledWith('non-existent-id');
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.session = { [SESSION_USER_KEY]: 'error-id' } as MockSession;
      (getUserById as jest.Mock).mockRejectedValue(new Error('Database error'));

      await attachUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(getUserById).toHaveBeenCalledWith('error-id');
      expect(mockRequest.isAuthenticated).toBe(false);
      expect(mockRequest.user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should proceed if user is authenticated', () => {
      mockRequest.isAuthenticated = true;
      mockRequest.user = { id: 'test-user-id', email: null, name: null };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', () => {
      mockRequest.isAuthenticated = false;

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });
});
