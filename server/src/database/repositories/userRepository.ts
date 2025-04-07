/**
 * User repository for database operations
 */
import { getDatabase } from '../connection';
import { User, createUser } from '../models';

/**
 * Insert a new user into the database
 */
export function insertUser(user: User): User {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO Users (id, email, name)
    VALUES (?, ?, ?)
  `);
  
  stmt.run(user.id, user.email, user.name);
  return user;
}

/**
 * Get a user by ID
 */
export function getUserById(id: string): User | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM Users WHERE id = ?');
  const row = stmt.get(id) as User | undefined;
  return row;
}

/**
 * Get a user by email
 */
export function getUserByEmail(email: string): User | undefined {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM Users WHERE email = ?');
  const row = stmt.get(email) as User | undefined;
  return row;
}

/**
 * Update a user
 */
export function updateUser(user: User): User {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE Users
    SET email = ?, name = ?
    WHERE id = ?
  `);
  
  stmt.run(user.email, user.name, user.id);
  return getUserById(user.id) as User;
}

/**
 * Delete a user by ID
 */
export function deleteUser(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM Users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Create a new anonymous user
 */
export function createAnonymousUser(): User {
  const user = createUser();
  return insertUser(user);
}
