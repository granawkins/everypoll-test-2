/**
 * Database configuration
 */
import path from 'path';
import fs from 'fs';

// Database directory path
const DB_DIR = process.env.DB_DIR || path.join(__dirname, '../../../data');

// Ensure the database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Database file path
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'everypoll.sqlite');

// Test database file path (for testing)
const TEST_DB_PATH = process.env.TEST_DB_PATH || ':memory:';

export default {
  path: process.env.NODE_ENV === 'test' ? TEST_DB_PATH : DB_PATH,
};
