import fs from 'fs';
import path from 'path';
import {
  initDatabase,
  getDatabase,
  closeDatabase,
  executeQuery,
  getAllRows,
  getRow,
  transaction,
} from '../index';

// Mock the migrations system for testing
jest.mock('../migrations', () => ({
  setupMigrations: jest.fn().mockReturnValue({}),
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

// Override db path for testing
const TEST_DB_PATH = path.join(process.cwd(), 'data', 'everypoll.test.db');
jest.mock('../config', () => ({
  DB_CONFIG: {
    dbPath: path.join(process.cwd(), 'data', 'everypoll.test.db'),
    migrationTableName: 'migrations',
    migrationPath: path.join(process.cwd(), 'src/db/migrations'),
  },
}));

describe('Database Module', () => {
  // Remove test database before each test
  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  // Close database and clean up after each test
  afterEach(async () => {
    await closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  test('initDatabase creates a new database file when it does not exist', async () => {
    expect(fs.existsSync(TEST_DB_PATH)).toBe(false);
    await initDatabase();
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
  });

  test('getDatabase initializes the database if not already initialized', async () => {
    expect(fs.existsSync(TEST_DB_PATH)).toBe(false);
    const db = await getDatabase();
    expect(fs.existsSync(TEST_DB_PATH)).toBe(true);
    expect(db).toBeDefined();
  });

  test('getDatabase returns the same instance when called multiple times', async () => {
    const db1 = await getDatabase();
    const db2 = await getDatabase();
    expect(db1).toBe(db2);
  });

  test('executeQuery executes a query without returning rows', async () => {
    await initDatabase();
    
    // Create a test table
    await executeQuery(`
      CREATE TABLE test_table (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    // Insert a row
    await executeQuery(`
      INSERT INTO test_table (id, value) VALUES (:id, :value)
    `, { id: 'test1', value: 'Test Value' });
    
    // Verify the row was inserted
    const rows = await getAllRows('SELECT * FROM test_table');
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('test1');
    expect(rows[0].value).toBe('Test Value');
  });

  test('getAllRows returns all rows that match a query', async () => {
    await initDatabase();
    
    // Create test table and insert multiple rows
    await executeQuery(`
      CREATE TABLE test_table (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    await executeQuery(`
      INSERT INTO test_table (id, value) VALUES (:id, :value)
    `, { id: 'test1', value: 'Value 1' });
    
    await executeQuery(`
      INSERT INTO test_table (id, value) VALUES (:id, :value)
    `, { id: 'test2', value: 'Value 2' });
    
    // Get all rows
    const rows = await getAllRows('SELECT * FROM test_table ORDER BY id');
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('test1');
    expect(rows[1].id).toBe('test2');
    
    // Get filtered rows
    const filteredRows = await getAllRows(
      'SELECT * FROM test_table WHERE id = :id',
      { id: 'test1' }
    );
    expect(filteredRows.length).toBe(1);
    expect(filteredRows[0].id).toBe('test1');
  });

  test('getRow returns the first row that matches a query', async () => {
    await initDatabase();
    
    // Create test table and insert multiple rows
    await executeQuery(`
      CREATE TABLE test_table (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    await executeQuery(`
      INSERT INTO test_table (id, value) VALUES (:id, :value)
    `, { id: 'test1', value: 'Value 1' });
    
    await executeQuery(`
      INSERT INTO test_table (id, value) VALUES (:id, :value)
    `, { id: 'test2', value: 'Value 2' });
    
    // Get a specific row
    const row = await getRow(
      'SELECT * FROM test_table WHERE id = :id',
      { id: 'test2' }
    );
    expect(row).toBeDefined();
    expect(row!.id).toBe('test2');
    expect(row!.value).toBe('Value 2');
    
    // Get non-existent row
    const nonExistentRow = await getRow(
      'SELECT * FROM test_table WHERE id = :id',
      { id: 'test3' }
    );
    expect(nonExistentRow).toBeUndefined();
  });

  test('transaction executes multiple queries as a single transaction', async () => {
    await initDatabase();
    
    // Create test table
    await executeQuery(`
      CREATE TABLE test_table (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    // Execute transaction
    await transaction((db) => {
      db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run('txn1', 'Txn Value 1');
      db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run('txn2', 'Txn Value 2');
    });
    
    // Verify both rows were inserted
    const rows = await getAllRows('SELECT * FROM test_table ORDER BY id');
    expect(rows.length).toBe(2);
    expect(rows[0].id).toBe('txn1');
    expect(rows[1].id).toBe('txn2');
  });

  test('transaction rolls back changes if an error occurs', async () => {
    await initDatabase();
    
    // Create test table
    await executeQuery(`
      CREATE TABLE test_table (
        id TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    
    // Insert an initial row
    await executeQuery('INSERT INTO test_table (id, value) VALUES (:id, :value)', 
      { id: 'initial', value: 'Initial Value' });
    
    // Execute transaction with error
    try {
      await transaction((db) => {
        db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run('txn1', 'Txn Value 1');
        // This will fail due to duplicate primary key
        db.prepare('INSERT INTO test_table (id, value) VALUES (?, ?)').run('initial', 'Duplicate');
      });
      fail('Transaction should have thrown an error');
    } catch (error) {
      // Expected error
    }
    
    // Verify only the initial row exists
    const rows = await getAllRows('SELECT * FROM test_table');
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('initial');
  });
});