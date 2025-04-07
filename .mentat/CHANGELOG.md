# Changelog

## Step 1: Setup SQLite database with migrations

- Added SQLite database with better-sqlite3
- Implemented migrations system using umzug
- Created initial schema with Users, Polls, Answers, and Votes tables
- Set up the database to auto-initialize on application startup
- Added tests to verify database functions and migration process
- Added graceful shutdown to properly close database connections

The database implementation follows the requirements specified in the README.md:
- Users table with id (uuid), email (optional, unique), and name (optional)
- Polls table with id (uuid), author_id (uuid, foreign key), created_at (datetime), and question (text)
- Answers table with id (uuid), poll_id (uuid, foreign key), and text (text)
- Votes table with id (uuid), poll_id (uuid, foreign key), answer_id (uuid, foreign key), user_id (uuid, foreign key), and created_at (datetime)

The database is automatically created on application startup if it doesn't exist, and the migrations system ensures that schema changes can be applied consistently in the future.
