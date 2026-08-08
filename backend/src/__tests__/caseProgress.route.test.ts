import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import type { CaseProgressSheetClient } from '../google/caseProgressSheetClient.js';

/**
 * `/api/case-progress`のルート単体テスト。CaseProgressSheetClientはfetchImplの
 * 差し替えではなくファクトリごとスタブに置き換える(実HTTP・実Google Sheetsは呼ばない)。
 * 実際のGoogle Sheetsに対する検証は`caseProgress.integration.test.ts`(モック禁止)で行う。
 */
function stubSheetClientFactory(rows: string[][]): () => CaseProgressSheetClient {
  return () =>
    ({
      listDataRows: async () => rows,
    }) as unknown as CaseProgressSheetClient;
}

function failingSheetClientFactory(error: Error): () => CaseProgressSheetClient {
  return () =>
    ({
      listDataRows: async () => {
        throw error;
      },
    }) as unknown as CaseProgressSheetClient;
}

describe('GET /api/case-progress', () => {
  it('200を返す', async () => {
    const app = createApp({ caseProgressSheetClientFactory: stubSheetClientFactory([]) });
    const res = await request(app).get('/api/case-progress');
    expect(res.status).toBe(200);
  });

  it('データ行が無い場合は空配列を返す', async () => {
    const app = createApp({ caseProgressSheetClientFactory: stubSheetClientFactory([]) });
    const res = await request(app).get('/api/case-progress');
    expect(res.body).toEqual([]);
  });

  it('シート行をCaseProgress型の配列として返す', async () => {
    const row = [
      'CASE-1',
      'CLIENT-1',
      '株式会社サンライズ商事',
      'completed',
      'active',
      'pending',
      'pending',
      'pending',
      'pending',
      '2026-08-01T09:00:00.000Z',
      '',
      '',
      '',
      '',
      '',
      '2026-08-01T09:00:00.000Z',
    ];
    const app = createApp({ caseProgressSheetClientFactory: stubSheetClientFactory([row]) });
    const res = await request(app).get('/api/case-progress');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        caseId: 'CASE-1',
        clientName: '株式会社サンライズ商事',
        steps: [
          { label: 'クライアント登録', status: 'completed', approvedAt: '2026-08-01T09:00:00.000Z' },
          { label: '決算書解析', status: 'active' },
          { label: 'ヒアリング回収', status: 'pending' },
          { label: '財務分析', status: 'pending' },
          { label: 'ベンチマーク比較', status: 'pending' },
          { label: '提案書生成', status: 'pending' },
        ],
      },
    ]);
  });

  it('Content-Typeがjsonである', async () => {
    const app = createApp({ caseProgressSheetClientFactory: stubSheetClientFactory([]) });
    const res = await request(app).get('/api/case-progress');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('Sheetsクライアントがエラーを投げた場合は502を返す', async () => {
    const app = createApp({
      caseProgressSheetClientFactory: failingSheetClientFactory(new Error('Google Sheets APIエラー')),
    });
    const res = await request(app).get('/api/case-progress');

    expect(res.status).toBe(502);
    expect(res.body.error).toBe('案件進捗の取得に失敗しました');
    expect(res.body.detail).toBe('Google Sheets APIエラー');
  });

  it('ファクトリ自体が例外を投げる(config未設定)場合も502を返す', async () => {
    const app = createApp({
      caseProgressSheetClientFactory: () => {
        throw new Error('/api/case-progressに必要な環境変数が未設定です: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON');
      },
    });
    const res = await request(app).get('/api/case-progress');

    expect(res.status).toBe(502);
    expect(res.body.detail).toContain('GOOGLE_SHEETS_ID');
  });
});
