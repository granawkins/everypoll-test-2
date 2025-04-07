import { Umzug } from 'umzug';
import Database from 'better-sqlite3';
import { DB_CONFIG } from '../config';

/**
 * Migration interface that matches our migration file structure
 */
interface Migration {
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

/**
 * Type for migration rows returned from the database
 */
interface MigrationRow {
  name: string;
}

/**
 * Custom storage implementation for SQLite
 */
const createSqliteStorage = (db: Database.Database) => {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${DB_CONFIG.migrationTableName} (
      name TEXT PRIMARY KEY,
      executed_at TEXT NOT NULL
    )
  `);

  return {
    logMigration: async (params: { name: string }) => {
      db.prepare(`
        INSERT INTO ${DB_CONFIG.migrationTableName} (name, executed_at) 
        VALUES (?, datetime('now'))
      `).run(params.name);
      return;
    },
    unlogMigration: async (params: { name: string }) => {
      db.prepare(`
        DELETE FROM ${DB_CONFIG.migrationTableName} 
        WHERE name = ?
      `).run(params.name);
      return;
    },
    executed: async () => {
      // Return the list of executed migrations
      return db.prepare(`
        SELECT name FROM ${DB_CONFIG.migrationTableName} 
        ORDER BY executed_at
      `).all().map((row: MigrationRow) => row.name);
    }
  };
};

/**
 * Type for the migrator instance
 */
type DatabaseMigrator = Umzug<{
  name: string;
  path: string;
}>;

/**
 * Dynamically import a migration file
 */
const importMigration = async (path: string): Promise<Migration> => {
  // Use dynamic import instead of require
  const module = await import(path);
  return module as Migration;
};

/**
 * Setup the migrations system
 */
export const setupMigrations = (db: Database.Database): DatabaseMigrator => {
  // Setup umzug migrator
  const migrator = new Umzug({
    migrations: {
      glob: ['*.ts', { cwd: DB_CONFIG.migrationPath }],
      resolve: async ({ name, path }) => {
        if (!path) {
          throw new Error(`Could not resolve migration path for ${name}`);
        }
        
        try {
          // Import migration file using dynamic import
          const migration = await importMigration(path);
          return {
            name,
            up: async () => migration.up(db),
            down: async () => migration.down(db),
          };
        } catch (error) {
          console.error(`Failed to import migration ${name}:`, error);
          throw error;
        }
      },
    },
    storage: createSqliteStorage(db),
    logger: console,
  });

  return migrator;
};

/**
 * Run all pending migrations
 */
export const runMigrations = async (migrator: DatabaseMigrator): Promise<void> => {
  try {
    await migrator.up();
    console.log('All migrations have been executed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
};

/**
 * Revert the most recent migration
 */
export const revertLastMigration = async (migrator: DatabaseMigrator): Promise<void> => {
  try {
    await migrator.down();
    console.log('Last migration has been reverted successfully.');
  } catch (error) {
    console.error('Error reverting migration:', error);
    throw error;
  }
};

/**
 * Revert all migrations
 */
export const revertAllMigrations = async (migrator: DatabaseMigrator): Promise<void> => {
  try {
    await migrator.down({ to: 0 });
    console.log('All migrations have been reverted successfully.');
  } catch (error) {
    console.error('Error reverting migrations:', error);
    throw error;
  }
};