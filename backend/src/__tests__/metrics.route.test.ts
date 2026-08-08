import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /api/metrics', () => {
  const app = createApp();

  it('200を返す(認証不要)', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.status).toBe(200);
  });

  it('Content-Typeがjsonである', async () => {
    const res = await request(app).get('/api/metrics');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('uptimeSeconds・memory・nodeVersion・timestampを含む', async () => {
    const res = await request(app).get('/api/metrics');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(typeof res.body.memory.rssMb).toBe('number');
    expect(typeof res.body.nodeVersion).toBe('string');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
