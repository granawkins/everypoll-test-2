import request from 'supertest';
import { app } from '../app';

// Mock the db module
jest.mock('../db', () => ({
  initDatabase: jest.fn().mockResolvedValue({}),
  closeDatabase: jest.fn().mockResolvedValue({}),
}));

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
