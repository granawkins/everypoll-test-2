import path from 'path';

const isTest = process.env.NODE_ENV === 'test';

export const DB_CONFIG = {
  dbPath: isTest
    ? path.join(process.cwd(), 'data', 'everypoll.test.db')
    : path.join(process.cwd(), 'data', 'everypoll.db'),
  migrationTableName: 'migrations',
  migrationPath: path.join(__dirname, 'migrations')
};