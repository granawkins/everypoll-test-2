/**
 * Database connection module
 */
import Database from 'better-sqlite3';
import type { Options } from 'better-sqlite3';
import dbConfig from './config';
import { setupMigrations } from './migrations';

// Creates and sets up the database connection
export function createDatabaseConnection(testMode = false) {
  const dbPath = testMode ? ':memory:' : dbConfig.path;
  
  // Define options with correct type
  const options: Options = {
    verbose: console.log,
  };
  
  try {
    // Create database connection
    const db = new Database(dbPath, options);
    
    // Set pragmas (database settings)
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
    db.pragma('foreign_keys = ON');  // Enable foreign key constraints
    
    console.log(`Connected to SQLite database at ${dbPath}`);
    
    return db;
  } catch (error) {
    console.error('Error connecting to the database:', error);
    throw error;
  }
}

// The singleton database connection
let db: Database.Database | null = null;

// Get database connection (create if it doesn't exist)
export function getDatabase(): Database.Database {
  if (!db) {
    db = createDatabaseConnection();
    
    // Run migrations
    setupMigrations(db).then(() => {
      console.log('Database migrations completed successfully');
    }).catch((error) => {
      console.error('Error running migrations:', error);
    });
  }
  return db;
}

// Close database connection (useful for tests)
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
