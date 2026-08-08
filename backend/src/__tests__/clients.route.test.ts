import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { ClientStore } from '../db/clientStore.js';

describe('GET /api/clients', () => {
  let tempDir: string;
  let store: ClientStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'clients-route-test-'));
    store = new ClientStore(join(tempDir, 'clients.json'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('200を返す', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');
    expect(res.status).toBe(200);
  });

  it('クライアントが1件も無い場合は空配列を返す', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');
    expect(res.body).toEqual([]);
  });

  it('登録済みクライアントをClient型の配列として返す', async () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: '株式会社サンライズ商事',
      industry: '小売業',
      employeeCount: 24,
      fiscalYearEndMonthDay: '03-31',
    });
    store.updateHearingProgress('C-1', 0);
    store.markProposalGenerated('C-1', '2026-08-08T12:22:01.014Z');

    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        clientId: 'C-1',
        name: '株式会社サンライズ商事',
        industry: '小売業',
        employeeCount: 24,
        fiscalYearEnd: '3月',
        hearingCompletionRate: 100,
        proposalStatus: 'completed',
      },
    ]);
  });

  it('Content-Typeがjsonである', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('複数クライアントを登録順(createdAt昇順)で返す', async () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: '先に登録した会社',
      industry: '小売業',
      employeeCount: 24,
      fiscalYearEndMonthDay: '03-31',
    });
    store.upsertProfile({
      clientId: 'C-2',
      name: '後で登録した会社',
      industry: '製造業',
      employeeCount: 45,
      fiscalYearEndMonthDay: '09-30',
    });

    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');

    expect(res.body.map((c: { clientId: string }) => c.clientId)).toEqual(['C-1', 'C-2']);
  });
});
