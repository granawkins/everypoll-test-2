/**
 * Initial database schema migration
 */
import Database from 'better-sqlite3';

// Up migration - create tables and indexes
export function up(db: Database.Database): void {
  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT UNIQUE
    );
  `);

  // Create Polls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Polls (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      question TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES Users(id) ON DELETE CASCADE
    );
  `);

  // Create index on author_id for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_polls_author_id ON Polls(author_id);
  `);

  // Create Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Answers (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES Polls(id) ON DELETE CASCADE
    );
  `);

  // Create index on poll_id for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_answers_poll_id ON Answers(poll_id);
  `);

  // Create Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS Votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      answer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES Polls(id) ON DELETE CASCADE,
      FOREIGN KEY (answer_id) REFERENCES Answers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
      UNIQUE(user_id, poll_id) -- Ensure one vote per user per poll
    );
  `);

  // Create indexes for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_votes_poll_id ON Votes(poll_id);
    CREATE INDEX IF NOT EXISTS idx_votes_answer_id ON Votes(answer_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user_id ON Votes(user_id);
  `);
}

// Down migration - drop tables
export function down(db: Database.Database): void {
  // Drop tables in reverse order to handle foreign key constraints
  db.exec(`
    DROP TABLE IF EXISTS Votes;
    DROP TABLE IF EXISTS Answers;
    DROP TABLE IF EXISTS Polls;
    DROP TABLE IF EXISTS Users;
  `);
}
