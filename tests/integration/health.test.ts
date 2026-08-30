import request from 'supertest';
import { app } from '../../src/app';

describe('Health Check Endpoint', () => {
  it('GET /health should return 200 OK with success payload', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'ProfileX API is running',
    });
  });

  it('GET /unknown-route should return 404', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });
});
