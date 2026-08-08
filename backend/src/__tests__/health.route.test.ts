import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /api/health', () => {
  const app = createApp();

  it('200を返す', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('Content-Typeがjsonである', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('body.statusが"ok"である', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.status).toBe('ok');
  });

  it('body.uptimeSecondsが0以上の数値である', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('body.timestampがISO8601形式の文字列である', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.timestamp).toBe('string');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('未定義のパスは404を返す', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});
