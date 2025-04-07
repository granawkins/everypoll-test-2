import express, { Request, Response } from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './db';
import { SESSION_CONFIG } from './config/session';
import { attachUser } from './middleware/auth';
import authRoutes from './routes/auth';

export const app = express();
export const PORT = process.env.PORT || 5000;
export const CLIENT_DIST_PATH = path.join(__dirname, '../../client/dist');

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://everypoll.com' 
    : 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
}));
app.use(cookieParser()); // Parse cookies
app.use(express.json()); // Parse JSON bodies
app.use(session(SESSION_CONFIG)); // Session management
app.use(attachUser); // Attach user to request if session exists
app.use(express.static(CLIENT_DIST_PATH)); // Serve static files from client/dist

// Register API routes
app.use('/api/auth', authRoutes);

// Only initialize database in production mode, not during tests
if (process.env.NODE_ENV !== 'test') {
  // Initialize database on startup
  (async () => {
    try {
      await initDatabase();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Don't exit in development to allow debugging
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  })();
}

// Basic route
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the EveryPoll API!' });
});

// Serve React app
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
});
