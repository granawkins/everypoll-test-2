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

## Step 2: Implement anonymous user system

- Added session management to the Express server using express-session
- Created a user service to handle database interactions for users
- Implemented anonymous user creation when a new session starts
- Added authentication middleware to attach user data to requests
- Implemented the /api/auth/me endpoint that:
  - Returns existing user data if a session exists
  - Creates a new anonymous user if no session exists
  - Sets the appropriate session cookie
- Added /api/auth/logout endpoint to destroy sessions
- Created placeholder endpoints for Google authentication (to be implemented in Step 3)
- Added comprehensive tests to verify:
  - Anonymous users are created properly
  - Session cookies are set and managed correctly
  - The /api/auth/me endpoint returns correct user information
  - User records are properly stored in the database
  - Logout functionality correctly clears sessions

The implementation follows the stateless HTTP model where:
1. When a user first accesses the API, a session is created with a unique cookie
2. An anonymous user record (with UUID but no email/name) is created in the database
3. The user ID is stored in the session
4. On subsequent requests, the user is automatically identified by their session cookie

This system provides the foundation for the Google authentication that will be implemented in Step 3, where anonymous users can be linked to Google accounts.
