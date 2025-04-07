import Database from 'better-sqlite3';

/**
 * Initial schema migration for EveryPoll
 * Creates the Users, Polls, Answers, and Votes tables
 */
export const up = (db: Database.Database): void => {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Create Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      name TEXT
    )
  `);

  // Create Polls table
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      question TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create Answers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    )
  `);

  // Create Votes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      answer_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(poll_id, user_id)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX idx_polls_author_id ON polls(author_id);
    CREATE INDEX idx_answers_poll_id ON answers(poll_id);
    CREATE INDEX idx_votes_poll_id ON votes(poll_id);
    CREATE INDEX idx_votes_answer_id ON votes(answer_id);
    CREATE INDEX idx_votes_user_id ON votes(user_id);
  `);
};

/**
 * Migration rollback function
 * Drops all tables in reverse order of creation
 */
export const down = (db: Database.Database): void => {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Drop tables in reverse order to respect foreign key constraints
  db.exec(`
    DROP TABLE IF EXISTS votes;
    DROP TABLE IF EXISTS answers;
    DROP TABLE IF EXISTS polls;
    DROP TABLE IF EXISTS users;
  `);
};