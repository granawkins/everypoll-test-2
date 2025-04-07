import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DB_CONFIG } from './config';
import { setupMigrations, runMigrations } from './migrations';

// Database instance
let db: Database.Database | null = null;

/**
 * Initialize the database connection
 * Creates the database file if it doesn't exist
 */
export const initDatabase = async (): Promise<Database.Database> => {
  try {
    // Ensure data directory exists
    const dbDir = path.dirname(DB_CONFIG.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Create database connection
    db = new Database(DB_CONFIG.dbPath);

    // Set pragmas for better performance and safety
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Setup and run migrations
    const migrator = setupMigrations(db);
    await runMigrations(migrator);

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

/**
 * Get the database instance
 * Initializes the database if it hasn't been initialized yet
 */
export const getDatabase = async (): Promise<Database.Database> => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

/**
 * Close the database connection
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

// Direct query execution helpers

/**
 * Execute a query that doesn't return any rows
 */
export const executeQuery = async (
  sql: string,
  params: Record<string, any> = {}
): Promise<void> => {
  const database = await getDatabase();
  database.prepare(sql).run(params);
};

/**
 * Execute a query and return all rows
 */
export const getAllRows = async <T = any>(
  sql: string,
  params: Record<string, any> = {}
): Promise<T[]> => {
  const database = await getDatabase();
  return database.prepare(sql).all(params);
};

/**
 * Execute a query and return the first row
 */
export const getRow = async <T = any>(
  sql: string,
  params: Record<string, any> = {}
): Promise<T | undefined> => {
  const database = await getDatabase();
  return database.prepare(sql).get(params);
};

/**
 * Execute a query in a transaction
 */
export const transaction = async <T>(
  callback: (db: Database.Database) => T
): Promise<T> => {
  const database = await getDatabase();
  return database.transaction(callback)(database);
};