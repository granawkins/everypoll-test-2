import { v4 as uuidv4 } from 'uuid';
import { 
  createAnonymousUser, 
  getUserById, 
  getUserByEmail, 
  updateUser,
  linkUserToGoogle,
  User 
} from '../../services/userService';
import { executeQuery, getRow } from '../../db';

// Mock uuid to return predictable values
jest.mock('uuid', () => ({
  v4: jest.fn()
}));

// Mock the db module to avoid ESM issues with migrations
jest.mock('../../db', () => {
  const mockDb = {
    executeQuery: jest.fn(),
    getRow: jest.fn(),
    initDatabase: jest.fn().mockResolvedValue({}),
    closeDatabase: jest.fn().mockResolvedValue({}),
  };
  return mockDb;
});

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAnonymousUser', () => {
    it('should create a new anonymous user with a UUID', async () => {
      const mockUuid = '00000000-0000-0000-0000-000000000001';
      (uuidv4 as jest.Mock).mockReturnValueOnce(mockUuid);
      
      // Mock database operations
      (executeQuery as jest.Mock).mockResolvedValueOnce(undefined);
      (getRow as jest.Mock).mockResolvedValueOnce({
        id: mockUuid,
        email: null,
        name: null
      });

      const user = await createAnonymousUser();

      expect(user).toEqual({
        id: mockUuid,
        email: null,
        name: null
      });

      expect(executeQuery).toHaveBeenCalledWith(
        'INSERT INTO users (id, email, name) VALUES (:id, :email, :name)',
        { id: mockUuid, email: null, name: null }
      );
    });
  });

  describe('getUserById', () => {
    it('should return a user by ID if it exists', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000002';
      const mockUser = {
        id: testUserId,
        email: null,
        name: null
      };
      
      (getRow as jest.Mock).mockResolvedValueOnce(mockUser);

      const user = await getUserById(testUserId);

      expect(user).toEqual(mockUser);
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = :id',
        { id: testUserId }
      );
    });

    it('should return undefined if user does not exist', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000099';
      (getRow as jest.Mock).mockResolvedValueOnce(undefined);
      
      const user = await getUserById(nonExistentId);
      
      expect(user).toBeUndefined();
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = :id',
        { id: nonExistentId }
      );
    });
  });

  describe('getUserByEmail', () => {
    it('should return a user by email if it exists', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000003';
      const testEmail = 'test@example.com';
      const mockUser = {
        id: testUserId,
        email: testEmail,
        name: 'Test User'
      };
      
      (getRow as jest.Mock).mockResolvedValueOnce(mockUser);

      const user = await getUserByEmail(testEmail);

      expect(user).toEqual(mockUser);
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = :email',
        { email: testEmail }
      );
    });

    it('should return undefined if email does not exist', async () => {
      const nonExistentEmail = 'nonexistent@example.com';
      (getRow as jest.Mock).mockResolvedValueOnce(undefined);
      
      const user = await getUserByEmail(nonExistentEmail);
      
      expect(user).toBeUndefined();
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = :email',
        { email: nonExistentEmail }
      );
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000004';
      const updatedUser: User = {
        id: testUserId,
        email: 'updated@example.com',
        name: 'Updated User'
      };
      
      (executeQuery as jest.Mock).mockResolvedValueOnce(undefined);

      await updateUser(updatedUser);

      expect(executeQuery).toHaveBeenCalledWith(
        'UPDATE users SET email = :email, name = :name WHERE id = :id',
        { id: testUserId, email: 'updated@example.com', name: 'Updated User' }
      );
    });
  });

  describe('linkUserToGoogle', () => {
    it('should update anonymous user with Google details', async () => {
      const testUserId = '00000000-0000-0000-0000-000000000005';
      const googleEmail = 'google@example.com';
      const googleName = 'Google User';
      
      (getRow as jest.Mock).mockResolvedValueOnce(undefined);
      (executeQuery as jest.Mock).mockResolvedValueOnce(undefined);

      const updatedUser = await linkUserToGoogle(testUserId, googleEmail, googleName);

      expect(updatedUser).toEqual({
        id: testUserId,
        email: googleEmail,
        name: googleName
      });
      
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = :email',
        { email: googleEmail }
      );
      
      expect(executeQuery).toHaveBeenCalledWith(
        'UPDATE users SET email = :email, name = :name WHERE id = :id',
        { id: testUserId, email: googleEmail, name: googleName }
      );
    });

    it('should handle existing email case', async () => {
      const anonymousUserId = '00000000-0000-0000-0000-000000000006';
      const existingEmail = 'existing@example.com';
      
      // Mock an existing user with this email
      (getRow as jest.Mock).mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000007',
        email: existingEmail,
        name: 'Existing User'
      });
      
      (executeQuery as jest.Mock).mockResolvedValueOnce(undefined);

      const updatedUser = await linkUserToGoogle(
        anonymousUserId, 
        existingEmail, 
        'New Name'
      );

      expect(updatedUser).toEqual({
        id: anonymousUserId,
        email: existingEmail,
        name: 'New Name'
      });
      
      expect(getRow).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = :email',
        { email: existingEmail }
      );
      
      expect(executeQuery).toHaveBeenCalledWith(
        'UPDATE users SET email = :email, name = :name WHERE id = :id',
        { id: anonymousUserId, email: existingEmail, name: 'New Name' }
      );
    });
  });
});
