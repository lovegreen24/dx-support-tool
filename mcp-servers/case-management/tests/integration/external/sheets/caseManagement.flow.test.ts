import { CaseSheetClient } from '../../../../src/api/sheets.js';
import { handleListCaseProgress } from '../../../../src/tools/listCaseProgress.js';
import { handleRecordCaseApproval } from '../../../../src/tools/recordCaseApproval.js';
import type { ServiceAccountCredentials } from '../../../../src/types.js';

/**
 * 外部結合テスト: 実際のGoogle Sheets API(「案件進捗」シート)に接続して検証する。
 * モック禁止。GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSONは環境変数から取得する
 * (.env系ファイルは作成しないため、実行時にシェルでexportして与える)。
 * テストで書き込んだ行はafterAllで必ず削除し、シートに残留させない。
 */

const GOOGLE_SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

if (!GOOGLE_SHEETS_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) {
  throw new Error(
    '外部結合テストにはGOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSONの環境変数が必要です(モックでの代替は禁止)',
  );
}

process.env.GOOGLE_SHEETS_ID = GOOGLE_SHEETS_ID;
process.env.GOOGLE_SERVICE_ACCOUNT_JSON = GOOGLE_SERVICE_ACCOUNT_JSON;

const serviceAccount: ServiceAccountCredentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
const TEST_CASE_ID = `INTEGRATION-TEST-${Date.now()}`;

describe('Google Sheets(案件進捗)外部結合テスト', () => {
  afterAll(async () => {
    // 後始末: テストで作成した行を必ず削除する
    const client = new CaseSheetClient(GOOGLE_SHEETS_ID as string, serviceAccount);
    const rows = await client.listDataRows();
    const rowIndex = rows.findIndex((row) => row[0] === TEST_CASE_ID);
    if (rowIndex !== -1) {
      const sheetId = await client.getSheetId();
      // ヘッダー行(1) + データ行index + 1 = シート上の行番号
      await client.deleteRow(1 + rowIndex + 1, sheetId);
    }
  }, 30000);

  it('未登録のcase_idで新規行を作成し、実シートに反映される(実API)', async () => {
    const result = await handleRecordCaseApproval({
      case_id: TEST_CASE_ID,
      client_id: 'integration-test-client',
      client_name: '外部結合テスト株式会社',
      step: 1,
    });

    expect(result.created).toBe(true);
    expect(result.case.steps[0].status).toBe('completed');
    expect(result.case.steps[1].status).toBe('active');

    const client = new CaseSheetClient(GOOGLE_SHEETS_ID as string, serviceAccount);
    const rows = await client.listDataRows();
    const persisted = rows.find((row) => row[0] === TEST_CASE_ID);
    expect(persisted).toBeDefined();
    expect(persisted?.[2]).toBe('外部結合テスト株式会社');
    expect(persisted?.[3]).toBe('completed');
  }, 30000);

  it('list_case_progressで作成した案件をcase_id指定で取得できる(実API)', async () => {
    const result = await handleListCaseProgress({ case_id: TEST_CASE_ID });

    expect(result.total).toBe(1);
    expect(result.cases[0].case_id).toBe(TEST_CASE_ID);
    expect(result.cases[0].client_name).toBe('外部結合テスト株式会社');
  }, 30000);

  it('既存case_idへの再呼び出しは新規行を作らず既存行を更新する(実API)', async () => {
    const beforeRows = await new CaseSheetClient(GOOGLE_SHEETS_ID as string, serviceAccount).listDataRows();
    const beforeCount = beforeRows.filter((row) => row[0] === TEST_CASE_ID).length;
    expect(beforeCount).toBe(1);

    const result = await handleRecordCaseApproval({
      case_id: TEST_CASE_ID,
      client_id: 'integration-test-client',
      step: 2,
    });

    expect(result.created).toBe(false);
    expect(result.case.steps[1].status).toBe('completed');
    expect(result.case.steps[2].status).toBe('active');

    const afterRows = await new CaseSheetClient(GOOGLE_SHEETS_ID as string, serviceAccount).listDataRows();
    const afterMatching = afterRows.filter((row) => row[0] === TEST_CASE_ID);
    expect(afterMatching).toHaveLength(1);
    expect(afterMatching[0][4]).toBe('completed');
  }, 30000);

  it('存在しないサービスアカウントメールアドレスではGoogle側がトークン発行を拒否する(実API)', async () => {
    const invalidClient = new CaseSheetClient(GOOGLE_SHEETS_ID as string, {
      client_email: 'nonexistent-integration-test@example.iam.gserviceaccount.com',
      private_key: serviceAccount.private_key,
    });

    await expect(invalidClient.listDataRows()).rejects.toThrow();
  }, 30000);
});
