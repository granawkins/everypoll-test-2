/**
 * Database migrations system
 */
import { Umzug, SequelizeStorage } from 'umzug';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// Initialize migrations system
export async function setupMigrations(db: Database.Database): Promise<void> {
  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Initialize umzug with SQLite adapter
  const umzug = new Umzug({
    migrations: {
      glob: ['migrations/*.ts', { cwd: __dirname }],
      resolve: ({ name, path, context }) => {
        // Load the migration module
        const migration = require(path as string);
        
        return {
          name,
          up: async () => migration.up(context.db),
          down: async () => migration.down(context.db),
        };
      },
    },
    context: { db },
    storage: new UmzugSQLiteStorage({ db }),
    logger: console,
  });

  // Run pending migrations
  await umzug.up();
}

// SQLite storage adapter for Umzug
class UmzugSQLiteStorage implements SequelizeStorage {
  private db: Database.Database;
  private tableName: string;

  constructor({ db, tableName = 'migrations' }: { db: Database.Database; tableName?: string }) {
    this.db = db;
    this.tableName = tableName;
    this.createTable();
  }

  // Create migrations table if it doesn't exist
  private createTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        name TEXT PRIMARY KEY,
        executed_at TEXT NOT NULL
      )
    `);
  }

  // Log executed migration
  async logMigration({ name }: { name: string }): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO ${this.tableName} (name, executed_at)
      VALUES (?, ?)
    `);
    stmt.run(name, new Date().toISOString());
  }

  // Remove migration log
  async unlogMigration({ name }: { name: string }): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM ${this.tableName}
      WHERE name = ?
    `);
    stmt.run(name);
  }

  // Get executed migrations
  async executed(): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT name FROM ${this.tableName}
      ORDER BY name
    `);
    const rows = stmt.all() as { name: string }[];
    return rows.map(row => row.name);
  }
}
