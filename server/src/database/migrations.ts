/**
 * Database migrations system
 */
import { Umzug } from 'umzug';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// Type for migration
interface Migration {
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

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
      resolve: ({ name, path }) => {
        if (!path) {
          throw new Error(`Cannot resolve path for migration ${name}`);
        }
        
        // Load the migration module
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const migration = require(path) as Migration;
        
        return {
          name,
          up: async (params) => migration.up(params.context.db),
          down: async (params) => migration.down(params.context.db),
        };
      },
    },
    context: { db },
    storage: {
      logMigration: async ({ name }) => {
        const stmt = db.prepare(`
          INSERT INTO migrations (name, executed_at)
          VALUES (?, ?)
        `);
        stmt.run(name, new Date().toISOString());
      },
      unlogMigration: async ({ name }) => {
        const stmt = db.prepare(`
          DELETE FROM migrations
          WHERE name = ?
        `);
        stmt.run(name);
      },
      executed: async () => {
        // Create migrations table if it doesn't exist
        db.exec(`
          CREATE TABLE IF NOT EXISTS migrations (
            name TEXT PRIMARY KEY,
            executed_at TEXT NOT NULL
          )
        `);
        
        const stmt = db.prepare(`
          SELECT name FROM migrations
          ORDER BY name
        `);
        const rows = stmt.all() as { name: string }[];
        return rows.map(row => row.name);
      },
    },
    logger: console,
  });

  // Run pending migrations
  await umzug.up();
}
