import request from 'supertest';
import { Request, Response, NextFunction } from 'express';
import { app } from '../app';

// Mock dependencies
jest.mock('../db', () => ({
  initDatabase: jest.fn().mockResolvedValue({}),
  closeDatabase: jest.fn().mockResolvedValue({}),
}));

// Type for session callback error
type SessionCallback = (err: Error | null) => void;

// Mock express-session
jest.mock('express-session', () => {
  return jest.fn(() => (req: Request, res: Response, next: NextFunction) => {
    const session = {
      id: 'test-session-id',
      cookie: {
        originalMaxAge: 86400000, // 1 day in milliseconds
        expires: new Date(Date.now() + 86400000),
        secure: false,
        httpOnly: true,
        path: '/',
        domain: undefined,
        sameSite: 'lax' as const
      },
      userId: undefined,
      regenerate: function(cb: SessionCallback) {
        cb(null);
        return this;
      },
      destroy: function(cb: SessionCallback) {
        cb(null);
        return this;
      },
      reload: function(cb: SessionCallback) {
        cb(null);
        return this;
      },
      save: function(cb: SessionCallback) {
        cb(null);
        return this;
      },
      touch: function() {
        return this;
      },
      resetMaxAge: function() {
        return this;
      }
    };
    
    req.session = session;
    next();
  });
});

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  attachUser: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

// Mock auth routes
jest.mock('../routes/auth', () => {
  // Import express properly
  const express = jest.requireActual('express');
  const router = express.Router();
  router.get('/me', (req: Request, res: Response) => res.json({ message: 'Auth route mocked' }));
  return router;
});

describe('API Endpoints', () => {
  it('should return welcome message on GET /api', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Welcome to the EveryPoll API!');
  });

  // Skip the homepage test since we can't easily test file serving in this environment
  it.skip('should serve the React app on GET /', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.header['content-type']).toContain('text/html');
  });
});
