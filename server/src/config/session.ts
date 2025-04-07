import { SessionOptions } from 'express-session';

/**
 * Session configuration options
 */
export const SESSION_CONFIG: SessionOptions = {
  // Secret should be in an environment variable in production
  secret: process.env.SESSION_SECRET || 'everypoll-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
  },
  name: 'everypoll.sid',
};

/**
 * Session user key - used to store the user ID in the session
 */
export const SESSION_USER_KEY = 'userId';
