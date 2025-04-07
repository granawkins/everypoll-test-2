# EveryPoll Development Roadmap

This document outlines the step-by-step plan for building EveryPoll, a social network for polls with cross-referencing capabilities. Each step builds on previous work to create a complete, functioning application.

## Step 1: Setup SQLite database with migrations

Initialize the SQLite database with required tables (Users, Polls, Answers, Votes) and implement a migrations system. Ensure the database is automatically created on application startup if it doesn't exist.

Tests should verify:
- Database creation works successfully
- Migrations system applies schema changes correctly
- All required tables are created with proper schema
- The application can connect to and query the database

## Step 2: Implement anonymous user system

Create the backend functionality for anonymous users with session management. Implement the /api/auth/me endpoint that creates new anonymous users when no session exists.

### Implementation Details

1. **Session Management**:
   - Install and configure express-session with cookie settings
   - Properly extend SessionData interface to include userId
   - Use secure defaults for session cookies

2. **User Service**:
   - Create a userService.ts file with createAnonymousUser, getUserById functions
   - Ensure proper typings for database interactions
   - Keep business logic separate from route handlers

3. **Authentication Routes**:
   - Create a dedicated auth.ts router with the /api/auth/me endpoint
   - Implement /api/auth/logout endpoint for session destruction
   - Add placeholder endpoints for Google auth (to be implemented in Step 3)

4. **Authentication Middleware**:
   - Create middleware to attach user data to requests based on session
   - Add requireAuth middleware for protected routes (will be used in later steps)

### Testing Strategy

Tests should verify:
- Anonymous users are created when a new session starts
- Session cookies are properly set and managed
- The /api/auth/me endpoint returns the correct user information
- Anonymous user records are properly stored in the database

**Testing Tips**:
- Keep test mocks simple - focus on unit testing route handlers directly
- For session tests, use supertest with the agent to maintain cookies
- Properly mock user service functions in route tests
- Keep database tests separate from authentication tests

### Potential Challenges
- TypeScript typing with express-session requires careful declaration merging
- Express route typing can be complex when using async handlers
- Session cookie testing requires proper agent configuration

## Step 3: Add Google authentication support

Implement Google OAuth authentication with endpoints for /api/auth/login, /api/auth/google-callback, and /api/auth/logout. Add functionality to link anonymous accounts with Google logins.

### Implementation Details

1. **Type Definitions**:
   - Create a TypeScript declaration file to extend express-session with userId property
   - Ensure proper type integration between session and authentication systems
   - Define clear interfaces for Google user data and authentication responses

2. **Google OAuth Configuration**:
   - Install the google-auth-library package
   - Create a configuration module with environment variable support
   - Implement utility functions for generating OAuth URLs and verifying tokens
   - Keep OAuth logic separate from route handlers

3. **Authentication Routes**:
   - Implement `/api/auth/login` to generate and return Google OAuth URLs
   - Create `/api/auth/google-callback` endpoint to process authorization codes
   - Ensure the logout endpoint properly clears sessions
   - Use a consistent pattern for route handlers (all synchronous or all async)

4. **User Account Linking**:
   - Enhance the `linkUserToGoogle` function to associate anonymous accounts with Google user data
   - Handle the case of existing Google accounts properly
   - Update session with new user information after successful linking

### Testing Strategy

Tests should verify:
- Google authentication flow redirects and processes returns correctly
- User information is updated after successful Google login
- Sessions are maintained properly across requests
- Logout functionality properly clears session data

**Testing Tips**:
- Create a consistent session mocking approach with proper session method return values
- Use proper cookie object structures in session mocks
- Mock Google OAuth interactions without making real API calls
- Test both successful authentication flows and error scenarios

### Potential Challenges
- TypeScript typing with Google API responses and session extensions
- Session handling with async route handlers requires careful design
- CSRF protection in the OAuth flow needs proper implementation
- Environment variables must be handled properly for production vs development

## Step 4: Create poll management API endpoints

Implement backend functionality for creating, retrieving, and voting on polls with endpoints for /api/poll, /api/poll/:id, and /api/poll/:id/vote.

Tests should verify:
- Polls can be created and stored in the database
- Poll details can be retrieved by ID
- Users can vote on polls and votes are recorded
- Vote counts and percentages are calculated correctly

## Step 5: Set up React Router and basic components

Set up React Router with routes for the landing page, poll view, user profile, and poll creation. Create the basic layout components and navigation structure.

Tests should verify:
- All routes are configured correctly
- Navigation between pages works as expected
- Components render without errors
- Layout is responsive on different screen sizes

## Step 6: Build sticky header with search and login

Create the sticky header component with the EveryPoll logo, search bar, and conditional login/avatar buttons.

Tests should verify:
- Header is displayed correctly on all pages
- Header remains sticky when scrolling the page
- All elements (logo, search bar, buttons) are properly positioned
- Header adapts responsively to different screen sizes

## Step 7: Implement PollCard component with display functionality

Develop the core PollCard component that displays poll questions and answer options without voting or cross-referencing capabilities.

Tests should verify:
- PollCard renders poll data correctly
- Question, author information, and answer options are displayed properly
- UI styling matches design requirements
- Component handles different poll data formats appropriately

## Step 8: Add voting and results visualization to PollCard

Enhance the PollCard component with voting functionality and the ability to display results using column charts after a user votes.

Tests should verify:
- Users can click to vote on poll options
- Results are displayed properly after voting
- Column charts show correct percentages and data
- The user's selected vote is highlighted appropriately

## Step 9: Create landing page with infinite scroll poll feed

Implement the landing page with an infinite scroll feed of polls fetching data from the /api/feed endpoint. Create the backend logic for selecting polls to display.

Tests should verify:
- Feed loads initial set of polls correctly
- Infinite scroll loads additional polls when scrolling down
- Feed refreshes with new data when appropriate
- Feed handles loading states and error conditions properly

## Step 10: Integrate frontend with authentication system

Connect the frontend authentication flow with the backend services. Implement the login button, Google authentication flow, and avatar display for logged-in users.

Tests should verify:
- Login button is displayed for anonymous users
- Authentication flow properly redirects to Google
- Avatar and user information displays for logged-in users
- UI updates appropriately after login/logout actions

## Step 11: Build user profile page with created and voted polls

Create the user profile page with tabs for viewing created polls and voted polls. Implement the UI and data fetching for displaying user-specific polls.

Tests should verify:
- Profile page loads user data correctly
- Tabs switch between created and voted polls
- Polls are displayed correctly in both tabs
- Logout functionality works properly from the profile page

## Step 12: Implement poll creation functionality

Build the poll creation screen with form inputs for the question and multiple answer options. Implement validation and submission to create new polls.

Tests should verify:
- Form accepts question input and multiple answer options
- Validation prevents invalid submissions (empty questions, insufficient options)
- New polls are created and saved to database
- User is redirected appropriately after successful submission

## Step 13: Add search functionality for polls

Implement search capabilities for the header search bar and create the /api/feed/search endpoint for filtering polls based on search queries.

Tests should verify:
- Search queries properly filter the poll feed
- Backend search endpoint returns correct results
- UI handles search results and no-match cases appropriately
- Search state is maintained during navigation when appropriate

## Step 14: Enable cross-reference search in PollCard

Implement the search functionality within PollCards to find and select other polls for cross-referencing, using the /api/poll/:id/search endpoint.

Tests should verify:
- Search bar appears in PollCard after voting
- Search queries return relevant polls for cross-referencing
- Users can select polls to cross-reference
- UI updates to show the selected cross-referenced poll

## Step 15: Complete interactive cross-referenced poll visualization

Add the ability to visualize cross-referenced poll data with interactive charts showing how answers to one poll correlate with answers to another.

Tests should verify:
- Charts display cross-referenced data correctly
- Users can interact with charts to see different correlations
- Multiple levels of cross-referencing work properly
- UI handles complex cross-referenced data presentation
