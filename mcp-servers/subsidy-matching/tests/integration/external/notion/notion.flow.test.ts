import { NotionApiError, NotionSubsidyClient } from '../../../../src/api/notion.js';
import { handleSuggestMatchingSubsidies } from '../../../../src/tools/suggestMatchingSubsidies.js';

/**
 * 外部結合テスト: 実際のNotion API(補助金台帳データベース)に接続して検証する。
 * モック禁止。NOTION_TOKEN / NOTION_DATABASE_ID は環境変数から取得する
 * (.env系ファイルは作成しないため、実行時にシェルでexportして与える)。
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN || !NOTION_DATABASE_ID) {
  throw new Error(
    '外部結合テストにはNOTION_TOKEN / NOTION_DATABASE_IDの環境変数が必要です(モックでの代替は禁止)',
  );
}

describe('Notion API外部結合テスト', () => {
  it('実際の補助金台帳データベースに接続してレコード一覧を取得できる(実API)', async () => {
    const client = new NotionSubsidyClient(NOTION_TOKEN, NOTION_DATABASE_ID);

    const records = await client.listSubsidies();

    expect(Array.isArray(records)).toBe(true);
    for (const record of records) {
      expect(typeof record.pageId).toBe('string');
      expect(typeof record.subsidyName).toBe('string');
      expect(Array.isArray(record.targetIndustries)).toBe(true);
    }
  }, 30000);

  it('無効なトークンで接続すると401エラーになる(実API)', async () => {
    const client = new NotionSubsidyClient('ntn_invalid_token_for_integration_test', NOTION_DATABASE_ID);

    await expect(client.listSubsidies()).rejects.toThrow(NotionApiError);
    await expect(client.listSubsidies()).rejects.toMatchObject({ status: 401 });
  }, 30000);

  it('存在しないデータベースIDで接続するとエラーになる(実API)', async () => {
    const client = new NotionSubsidyClient(NOTION_TOKEN, '00000000-0000-0000-0000-000000000000');

    await expect(client.listSubsidies()).rejects.toThrow(NotionApiError);
  }, 30000);

  it('suggest_matching_subsidiesハンドラが実DBに接続しE2Eで結果を返す(実API)', async () => {
    process.env.NOTION_TOKEN = NOTION_TOKEN;
    process.env.NOTION_DATABASE_ID = NOTION_DATABASE_ID;

    const result = await handleSuggestMatchingSubsidies({
      client_id: 'integration-test-client',
      industry: '製造業',
      employee_count: 30,
      keywords: ['DX'],
    });

    expect(result.client_id).toBe('integration-test-client');
    expect(typeof result.total_candidates).toBe('number');
    expect(Array.isArray(result.matches)).toBe(true);
    expect(typeof result.queried_at).toBe('string');
  }, 30000);
});
