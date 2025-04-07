import { v4 as uuidv4 } from 'uuid';
import { executeQuery, getRow, transaction } from '../db';

/**
 * Represents a user in the system
 */
export interface User {
  id: string;
  email: string | null;
  name: string | null;
}

/**
 * Create a new anonymous user
 * @returns Newly created anonymous user
 */
export const createAnonymousUser = async (): Promise<User> => {
  const user: User = {
    id: uuidv4(),
    email: null,
    name: null,
  };

  await executeQuery(
    'INSERT INTO users (id, email, name) VALUES (:id, :email, :name)',
    { id: user.id, email: user.email, name: user.name }
  );

  return user;
};

/**
 * Get a user by ID
 * @param id The user ID
 * @returns The user or undefined if not found
 */
export const getUserById = async (id: string): Promise<User | undefined> => {
  return getRow<User>('SELECT * FROM users WHERE id = :id', { id });
};

/**
 * Get a user by email
 * @param email The user email
 * @returns The user or undefined if not found
 */
export const getUserByEmail = async (email: string): Promise<User | undefined> => {
  return getRow<User>('SELECT * FROM users WHERE email = :email', { email });
};

/**
 * Update a user's information
 * @param user The user object with updated fields
 * @returns The updated user
 */
export const updateUser = async (user: User): Promise<User> => {
  await executeQuery(
    'UPDATE users SET email = :email, name = :name WHERE id = :id',
    { id: user.id, email: user.email, name: user.name }
  );

  return user;
};

/**
 * Link an anonymous user to a Google account
 * @param userId The anonymous user ID
 * @param email The Google email
 * @param name The user's name from Google
 * @returns The updated user
 */
export const linkUserToGoogle = async (
  userId: string,
  email: string,
  name: string
): Promise<User> => {
  // Check if a user with this email already exists
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    // If the user with this email already exists and it's not the anonymous user,
    // we need to merge the two accounts (will be implemented in step 3)
    // For now, just update the anonymous user with the Google details
    await executeQuery(
      'UPDATE users SET email = :email, name = :name WHERE id = :id',
      { id: userId, email, name }
    );

    return { id: userId, email, name };
  } else {
    // If no user with this email exists, update the anonymous user
    await executeQuery(
      'UPDATE users SET email = :email, name = :name WHERE id = :id',
      { id: userId, email, name }
    );

    return { id: userId, email, name };
  }
};
