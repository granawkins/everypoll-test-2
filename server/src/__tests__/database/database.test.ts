/**
 * Tests for database functionality
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createDatabaseConnection, closeDatabase } from '../../database/connection';
import { createUser, createPoll, createAnswer, createVote } from '../../database/models';
import { setupMigrations } from '../../database/migrations';

describe('Database Functionality', () => {
  let db: Database.Database;

  beforeEach(async () => {
    // Use an in-memory database for testing
    db = createDatabaseConnection(true);
    
    // Run migrations
    await setupMigrations(db);
  });

  afterEach(() => {
    // Close the database connection
    if (db) {
      db.close();
    }
    closeDatabase();
  });

  it('should create the database successfully', () => {
    expect(db).toBeDefined();
    expect(typeof db.exec).toBe('function');
  });

  it('should create all required tables with correct schema', () => {
    // Check if tables exist
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name IN ('Users', 'Polls', 'Answers', 'Votes', 'migrations')
    `).all() as { name: string }[];
    
    const tableNames = tables.map(t => t.name);
    
    // Check all required tables exist
    expect(tableNames).toContain('Users');
    expect(tableNames).toContain('Polls');
    expect(tableNames).toContain('Answers');
    expect(tableNames).toContain('Votes');
    expect(tableNames).toContain('migrations');
    
    // Check Users table structure
    const usersInfo = db.prepare(`PRAGMA table_info(Users)`).all() as any[];
    const userColumns = usersInfo.map(col => col.name);
    expect(userColumns).toContain('id');
    expect(userColumns).toContain('email');
    expect(userColumns).toContain('name');
    
    // Check Polls table structure
    const pollsInfo = db.prepare(`PRAGMA table_info(Polls)`).all() as any[];
    const pollColumns = pollsInfo.map(col => col.name);
    expect(pollColumns).toContain('id');
    expect(pollColumns).toContain('author_id');
    expect(pollColumns).toContain('created_at');
    expect(pollColumns).toContain('question');
    
    // Check Answers table structure
    const answersInfo = db.prepare(`PRAGMA table_info(Answers)`).all() as any[];
    const answerColumns = answersInfo.map(col => col.name);
    expect(answerColumns).toContain('id');
    expect(answerColumns).toContain('poll_id');
    expect(answerColumns).toContain('text');
    
    // Check Votes table structure
    const votesInfo = db.prepare(`PRAGMA table_info(Votes)`).all() as any[];
    const voteColumns = votesInfo.map(col => col.name);
    expect(voteColumns).toContain('id');
    expect(voteColumns).toContain('poll_id');
    expect(voteColumns).toContain('answer_id');
    expect(voteColumns).toContain('user_id');
    expect(voteColumns).toContain('created_at');
  });

  it('should record migrations correctly', () => {
    // Check migrations table
    const migrations = db.prepare('SELECT * FROM migrations').all() as { name: string }[];
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0].name).toBe('00001-initial-schema.ts');
  });

  it('should be able to insert and query data', () => {
    // Insert test user
    const userId = uuidv4();
    db.prepare('INSERT INTO Users (id, email, name) VALUES (?, ?, ?)')
      .run(userId, 'test@example.com', 'Test User');
    
    // Query user
    const user = db.prepare('SELECT * FROM Users WHERE id = ?').get(userId) as any;
    expect(user).toBeDefined();
    expect(user.id).toBe(userId);
    expect(user.email).toBe('test@example.com');
    expect(user.name).toBe('Test User');
    
    // Insert test poll
    const pollId = uuidv4();
    db.prepare('INSERT INTO Polls (id, author_id, created_at, question) VALUES (?, ?, ?, ?)')
      .run(pollId, userId, new Date().toISOString(), 'Test Poll Question');
    
    // Insert test answer
    const answerId = uuidv4();
    db.prepare('INSERT INTO Answers (id, poll_id, text) VALUES (?, ?, ?)')
      .run(answerId, pollId, 'Test Answer');
    
    // Insert test vote
    const voteId = uuidv4();
    db.prepare('INSERT INTO Votes (id, poll_id, answer_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(voteId, pollId, answerId, userId, new Date().toISOString());
    
    // Count the number of votes
    const voteCount = db.prepare('SELECT COUNT(*) as count FROM Votes').get() as { count: number };
    expect(voteCount.count).toBe(1);
    
    // Test foreign key constraint (should work since we enabled foreign keys)
    expect(() => {
      const invalidVoteId = uuidv4();
      const invalidPollId = uuidv4(); // This poll_id doesn't exist
      db.prepare('INSERT INTO Votes (id, poll_id, answer_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(invalidVoteId, invalidPollId, answerId, userId, new Date().toISOString());
    }).toThrow(); // Should throw due to foreign key constraint violation
  });

  it('should enforce foreign key constraints', () => {
    // Create a user
    const userId = uuidv4();
    db.prepare('INSERT INTO Users (id, email, name) VALUES (?, ?, ?)')
      .run(userId, 'test@example.com', 'Test User');

    // Create a poll with the user as author
    const pollId = uuidv4();
    db.prepare('INSERT INTO Polls (id, author_id, created_at, question) VALUES (?, ?, ?, ?)')
      .run(pollId, userId, new Date().toISOString(), 'Test Poll Question');

    // Check that deleting the user will cascade to delete the poll (due to ON DELETE CASCADE)
    db.prepare('DELETE FROM Users WHERE id = ?').run(userId);
    
    // The poll should also be deleted
    const pollCount = db.prepare('SELECT COUNT(*) as count FROM Polls WHERE id = ?').get(pollId) as { count: number };
    expect(pollCount.count).toBe(0);
  });

  it('should enforce unique constraints', () => {
    // Insert test user
    const userId = uuidv4();
    db.prepare('INSERT INTO Users (id, email, name) VALUES (?, ?, ?)')
      .run(userId, 'unique@example.com', 'Unique User');
    
    // Attempting to insert a user with the same email should fail
    expect(() => {
      const userId2 = uuidv4();
      db.prepare('INSERT INTO Users (id, email, name) VALUES (?, ?, ?)')
        .run(userId2, 'unique@example.com', 'Another User');
    }).toThrow(); // Should throw due to unique constraint violation
  });

  it('should enforce one vote per user per poll', () => {
    // Create a user
    const userId = uuidv4();
    db.prepare('INSERT INTO Users (id, email, name) VALUES (?, ?, ?)')
      .run(userId, 'voter@example.com', 'Voter');

    // Create a poll
    const pollId = uuidv4();
    db.prepare('INSERT INTO Polls (id, author_id, created_at, question) VALUES (?, ?, ?, ?)')
      .run(pollId, userId, new Date().toISOString(), 'Test Poll Question');

    // Create answers
    const answerId1 = uuidv4();
    const answerId2 = uuidv4();
    db.prepare('INSERT INTO Answers (id, poll_id, text) VALUES (?, ?, ?)')
      .run(answerId1, pollId, 'Answer 1');
    db.prepare('INSERT INTO Answers (id, poll_id, text) VALUES (?, ?, ?)')
      .run(answerId2, pollId, 'Answer 2');

    // Vote for an answer
    const voteId = uuidv4();
    db.prepare('INSERT INTO Votes (id, poll_id, answer_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(voteId, pollId, answerId1, userId, new Date().toISOString());

    // Attempting to vote again for the same poll should fail (even for a different answer)
    expect(() => {
      const voteId2 = uuidv4();
      db.prepare('INSERT INTO Votes (id, poll_id, answer_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(voteId2, pollId, answerId2, userId, new Date().toISOString());
    }).toThrow(); // Should throw due to unique constraint violation (user_id, poll_id)
  });
});
