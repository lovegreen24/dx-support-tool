import { jest } from '@jest/globals';
import type { SubsidyRecord } from '../../src/types.js';

const listSubsidiesMock = jest.fn<() => Promise<SubsidyRecord[]>>();

jest.unstable_mockModule('../../src/api/notion.js', () => ({
  NotionSubsidyClient: jest.fn().mockImplementation(() => ({
    listSubsidies: listSubsidiesMock,
  })),
}));

jest.unstable_mockModule('../../src/config.js', () => ({
  loadConfig: jest.fn(() => ({ notionToken: 'token', notionDatabaseId: 'db-id' })),
}));

const { handleSuggestMatchingSubsidies } = await import('../../src/tools/suggestMatchingSubsidies.js');

describe('handleSuggestMatchingSubsidies', () => {
  beforeEach(() => {
    listSubsidiesMock.mockReset();
  });

  it('client_id未指定の場合はエラーを投げる(Notion APIは呼ばない)', async () => {
    await expect(
      handleSuggestMatchingSubsidies({ client_id: '', industry: '製造業' }),
    ).rejects.toThrow(/client_id/);

    expect(listSubsidiesMock).not.toHaveBeenCalled();
  });

  it('industry未指定の場合はエラーを投げる(Notion APIは呼ばない)', async () => {
    await expect(
      handleSuggestMatchingSubsidies({ client_id: 'c1', industry: '' }),
    ).rejects.toThrow(/industry/);

    expect(listSubsidiesMock).not.toHaveBeenCalled();
  });

  it('Notion台帳を取得しマッチング結果を整形して返す', async () => {
    listSubsidiesMock.mockResolvedValue([
      {
        pageId: 'p1',
        subsidyName: 'IT導入補助金',
        targetIndustries: ['製造業'],
        targetConditions: '',
        organization: '中小企業庁',
        subsidyAmount: '450万円',
        applicationDeadline: '2099-12-31',
        status: '募集中',
        detailUrl: 'https://example.com',
        notes: '',
      },
    ]);

    const result = await handleSuggestMatchingSubsidies({ client_id: 'c1', industry: '製造業' });

    expect(listSubsidiesMock).toHaveBeenCalledTimes(1);
    expect(result.client_id).toBe('c1');
    expect(result.total_candidates).toBe(1);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].subsidyName).toBe('IT導入補助金');
    expect(typeof result.queried_at).toBe('string');
  });

  it('該当する補助金が無い場合は空配列を返す', async () => {
    listSubsidiesMock.mockResolvedValue([]);

    const result = await handleSuggestMatchingSubsidies({ client_id: 'c1', industry: '製造業' });

    expect(result.matches).toEqual([]);
    expect(result.total_candidates).toBe(0);
  });
});
