# Changelog

## 1.0.0 (2025-04-07)

### Step 1: Setup SQLite database with migrations

- Added SQLite database support with better-sqlite3
- Implemented database configuration with environment variable support
- Created connection management system with automatic initialization
- Defined data models for Users, Polls, Answers, and Votes
- Implemented migrations system using Umzug
- Created initial schema migration that sets up all required tables
- Added user repository for database operations
- Added comprehensive tests for database functionality
  - Database creation
  - Migration application
  - Schema verification
  - Basic CRUD operations
  - Foreign key constraints
  - Unique constraints
  - One vote per user per poll constraint
- Set up automatic database initialization on application startup
