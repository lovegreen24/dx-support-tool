/**
 * `/api/case-progress` 内部結合テスト(モック禁止・実際のGoogle Sheetsに接続する)。
 *
 * 【方式選択の理由】案件管理MCP(M-010, `mcp-1786198177746-f68bcc76`)はcloud_proxyゲートウェイ
 * 経由のツールであり、docs/SCOPE_PROGRESS.md「既知の制約」に記載の通り、環境変数バインディングの
 * ゲートウェイ反映にタイムラグがあり同一セッション内で不安定になることが実測で判明している。
 * `/api/case-progress`自体も本番実装として同じ「案件進捗」スプレッドシートをMCPゲートウェイを
 * 経由せず直接HTTPで読む方式(`google/caseProgressSheetClient.ts`)を採用したため、このテストも
 * 同じ方式(実際のGoogle Sheets APIへ直接接続)で検証する。これはタスク指示の
 * 「M-010ゲートウェイが同一セッションで不安定な場合は、Google Sheets APIを直接叩く形での
 * テストでも構わない」という許容に沿った判断であり、モックは一切使用しない。
 *
 * 【実行方法】GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSONは環境変数から取得する
 * (.env系ファイルは作成しないため、実行時にシェルでexportして与える。値はpassword-managerの
 * `dx-support-tool-google-sheets-id` / `dx-support-tool-google-service-account-json`参照)。
 * `npm run test:integration:external`で実行する(実クレデンシャルが無い環境でも
 * `npm test`が失敗しないよう、ファイル名`*.external.test.ts`をデフォルトのvitest実行対象から
 * 除外している。詳細は`vitest.config.ts`/`vitest.external.config.ts`参照)。
 * テストで追加した行はafterAllで必ず削除し、シートに残留させない
 * (実際に残留ゼロを`listDataRows`で確認するアサーションも含む)。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { CaseProgressSheetClient, loadCaseProgressSheetConfig } from '../google/caseProgressSheetClient.js';
import { fetchAccessToken, parseServiceAccountJson } from '../google/serviceAccountAuth.js';

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error(
    '内部結合テストにはGOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSONの環境変数が必要です(モックでの代替は禁止)',
  );
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_NAME = '案件進捗';
/** 本番の/api/case-progressは読み取り専用だが、テストの行追加/削除には書き込みスコープが要る */
const SHEETS_WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

const config = loadCaseProgressSheetConfig({
  googleSheetsId: GOOGLE_SHEETS_ID,
  googleServiceAccountJson: GOOGLE_SERVICE_ACCOUNT_JSON,
});
const serviceAccount = parseServiceAccountJson(GOOGLE_SERVICE_ACCOUNT_JSON);

const TEST_CASE_ID = `BACKEND-INTEGRATION-TEST-${Date.now()}`;
const TEST_CLIENT_NAME = 'バックエンド内部結合テスト株式会社';
const STEP1_APPROVED_AT = '2026-08-01T09:00:00.000Z';
const UPDATED_AT = '2026-08-01T09:05:00.000Z';

/**
 * このテスト専用の行追加/削除ヘルパー(テストのセットアップ・後始末のみに使用する)。
 * 本番の`CaseProgressSheetClient`は読み取り専用(listDataRowsのみ)のため、
 * 書き込みが要るテスト側でのみ最小限のfetch呼び出しを行う。
 */
async function appendTestRow(): Promise<void> {
  const token = await fetchAccessToken(serviceAccount, { scope: SHEETS_WRITE_SCOPE });
  const row = [
    TEST_CASE_ID,
    'backend-integration-test-client',
    TEST_CLIENT_NAME,
    'completed',
    'active',
    'pending',
    'pending',
    'pending',
    'pending',
    STEP1_APPROVED_AT,
    '',
    '',
    '',
    '',
    '',
    UPDATED_AT,
  ];
  const range = encodeURIComponent(`${SHEET_NAME}!A1:P1`);
  const appendUrl =
    `${SHEETS_API_BASE}/${config.spreadsheetId}/values/${range}:append` +
    '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  });
  if (!response.ok) {
    throw new Error(`テスト行の追加に失敗しました(status=${response.status}): ${await response.text()}`);
  }
}

async function getSheetId(token: string): Promise<number> {
  const response = await fetch(`${SHEETS_API_BASE}/${config.spreadsheetId}?fields=sheets.properties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as { sheets: { properties: { sheetId: number; title: string } }[] };
  const target = data.sheets.find((sheet) => sheet.properties.title === SHEET_NAME);
  if (!target) throw new Error(`シート「${SHEET_NAME}」が見つかりません`);
  return target.properties.sheetId;
}

async function deleteTestRow(): Promise<void> {
  const token = await fetchAccessToken(serviceAccount, { scope: SHEETS_WRITE_SCOPE });
  const readClient = new CaseProgressSheetClient(config);
  const rows = await readClient.listDataRows();
  const rowIndex = rows.findIndex((row) => row[0] === TEST_CASE_ID);
  if (rowIndex === -1) return;

  const sheetId = await getSheetId(token);
  const response = await fetch(`${SHEETS_API_BASE}/${config.spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            // ヘッダー行(1) + データ行index(0始まり) + 1 = シート上の行番号(1始まり)
            range: { sheetId, dimension: 'ROWS', startIndex: 1 + rowIndex, endIndex: 1 + rowIndex + 1 },
          },
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`テスト行の削除に失敗しました(status=${response.status}): ${await response.text()}`);
  }
}

const TEST_API_KEY = 'case-progress-external-test-api-key';

describe('GET /api/case-progress(内部結合テスト・実Google Sheets接続)', () => {
  beforeAll(async () => {
    await appendTestRow();
  }, 30000);

  afterAll(async () => {
    await deleteTestRow();
    // 後始末の実証: 削除後にシートへ問い合わせ、テスト行が残留していないことを確認する
    const readClient = new CaseProgressSheetClient(config);
    const rows = await readClient.listDataRows();
    expect(rows.some((row) => row[0] === TEST_CASE_ID)).toBe(false);
  }, 30000);

  it('実際のGoogle Sheetsから取得した案件が/api/case-progressのレスポンスに含まれる', async () => {
    const app = createApp({
      caseProgressSheetClientFactory: () => new CaseProgressSheetClient(config),
      apiKey: TEST_API_KEY,
    });

    const res = await request(app).get('/api/case-progress').set('x-api-key', TEST_API_KEY);

    expect(res.status).toBe(200);
    const target = (res.body as Array<{ caseId: string }>).find((c) => c.caseId === TEST_CASE_ID);
    expect(target).toBeDefined();
    expect(target).toEqual({
      caseId: TEST_CASE_ID,
      clientName: TEST_CLIENT_NAME,
      steps: [
        { label: 'クライアント登録', status: 'completed', approvedAt: STEP1_APPROVED_AT },
        { label: '決算書解析', status: 'active' },
        { label: 'ヒアリング回収', status: 'pending' },
        { label: '財務分析', status: 'pending' },
        { label: 'ベンチマーク比較', status: 'pending' },
        { label: '提案書生成', status: 'pending' },
      ],
    });
  }, 30000);

  it('CaseProgressSheetClient.listDataRowsで実データ行として直接読み取れる(生の列値を検証)', async () => {
    const readClient = new CaseProgressSheetClient(config);
    const rows = await readClient.listDataRows();
    const persisted = rows.find((row) => row[0] === TEST_CASE_ID);

    expect(persisted).toBeDefined();
    expect(persisted?.[2]).toBe(TEST_CLIENT_NAME);
    expect(persisted?.[3]).toBe('completed');
    expect(persisted?.[4]).toBe('active');
  }, 30000);
});
