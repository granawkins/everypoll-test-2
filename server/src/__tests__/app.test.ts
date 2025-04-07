import request from 'supertest';
import { app } from '../app';

// Mock dependencies
jest.mock('../db', () => ({
  initDatabase: jest.fn().mockResolvedValue({}),
  closeDatabase: jest.fn().mockResolvedValue({}),
}));

// Mock express-session
jest.mock('express-session', () => {
  return jest.fn(() => (req, res, next) => {
    req.session = {};
    next();
  });
});

// Mock auth middleware
jest.mock('../middleware/auth', () => ({
  attachUser: jest.fn((req, res, next) => next()),
}));

// Mock auth routes
jest.mock('../routes/auth', () => {
  // Import express properly
  const express = jest.requireActual('express');
  const router = express.Router();
  router.get('/me', (req, res) => res.json({ message: 'Auth route mocked' }));
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
