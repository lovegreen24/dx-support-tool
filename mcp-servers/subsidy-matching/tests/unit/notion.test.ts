import { jest } from '@jest/globals';
import { NotionApiError, NotionSubsidyClient, parseSubsidyRecord } from '../../src/api/notion.js';

function buildNotionPage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'page-abc',
    properties: {
      補助金名: { title: [{ plain_text: 'IT導入補助金' }] },
      対象業種: { multi_select: [{ name: '製造業' }, { name: '小売業' }] },
      対象条件: { rich_text: [{ plain_text: '従業員50名以下' }] },
      実施機関: { rich_text: [{ plain_text: '中小企業庁' }] },
      補助額: { rich_text: [{ plain_text: '50万円〜450万円' }] },
      申請締切: { date: { start: '2099-12-31' } },
      ステータス: { select: { name: '募集中' } },
      詳細URL: { url: 'https://example.com/it-hojo' },
      備考: { rich_text: [{ plain_text: 'クラウド活用を推進' }] },
      ...overrides,
    },
  };
}

describe('parseSubsidyRecord', () => {
  it('Notionページの各プロパティ型を正しく正規化する', () => {
    const record = parseSubsidyRecord(buildNotionPage());

    expect(record).toEqual({
      pageId: 'page-abc',
      subsidyName: 'IT導入補助金',
      targetIndustries: ['製造業', '小売業'],
      targetConditions: '従業員50名以下',
      organization: '中小企業庁',
      subsidyAmount: '50万円〜450万円',
      applicationDeadline: '2099-12-31',
      status: '募集中',
      detailUrl: 'https://example.com/it-hojo',
      notes: 'クラウド活用を推進',
    });
  });

  it('空プロパティ(未入力)は空文字/空配列/nullとして扱う', () => {
    const page = buildNotionPage({
      対象業種: { multi_select: [] },
      申請締切: { date: null },
      詳細URL: { url: null },
      ステータス: { select: null },
    });

    const record = parseSubsidyRecord(page);

    expect(record.targetIndustries).toEqual([]);
    expect(record.applicationDeadline).toBeNull();
    expect(record.detailUrl).toBeNull();
    expect(record.status).toBe('');
  });
});

describe('NotionSubsidyClient', () => {
  it('1ページ分の結果のみの場合はそのままレコードを返す', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [buildNotionPage()],
        has_more: false,
        next_cursor: null,
      }),
    });

    const client = new NotionSubsidyClient('token', 'db-id', mockFetch as unknown as typeof fetch);
    const records = await client.listSubsidies();

    expect(records).toHaveLength(1);
    expect(records[0].subsidyName).toBe('IT導入補助金');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/databases/db-id/query');
    expect((init as RequestInit).method).toBe('POST');
    expect((init as { headers: Record<string, string> }).headers.Authorization).toBe('Bearer token');
  });

  it('has_moreがtrueの場合はnext_cursorを使って追加ページを取得する', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [buildNotionPage({ 補助金名: { title: [{ plain_text: '1件目' }] } })],
          has_more: true,
          next_cursor: 'cursor-1',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [buildNotionPage({ 補助金名: { title: [{ plain_text: '2件目' }] } })],
          has_more: false,
          next_cursor: null,
        }),
      });

    const client = new NotionSubsidyClient('token', 'db-id', mockFetch as unknown as typeof fetch);
    const records = await client.listSubsidies();

    expect(records.map((r) => r.subsidyName)).toEqual(['1件目', '2件目']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse((mockFetch.mock.calls[1][1] as { body: string }).body);
    expect(secondCallBody.start_cursor).toBe('cursor-1');
  });

  it('レコードが0件の場合は空配列を返す', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [], has_more: false, next_cursor: null }),
    });

    const client = new NotionSubsidyClient('token', 'db-id', mockFetch as unknown as typeof fetch);
    const records = await client.listSubsidies();

    expect(records).toEqual([]);
  });

  it('Notion APIがエラーを返した場合はNotionApiErrorを投げる', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"unauthorized"}',
    });

    const client = new NotionSubsidyClient('bad-token', 'db-id', mockFetch as unknown as typeof fetch);

    await expect(client.listSubsidies()).rejects.toThrow(NotionApiError);
  });
});
