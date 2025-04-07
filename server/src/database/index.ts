/**
 * Database module exports
 */

// Database connection
export * from './connection';

// Database models
export * from './models';

// Repositories
export * from './repositories/userRepository';

// Initialize database when this module is imported
import { getDatabase } from './connection';
export const db = getDatabase();
