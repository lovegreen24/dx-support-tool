import { jest } from '@jest/globals';
import type { AssessmentRecord } from '../../src/types.js';

/**
 * list_digital_maturity_historyツールハンドラのunitテスト。
 * AssessmentRepository(DB)・loadConfigをモックし、DB接続なしで
 * 「入力検証 → DB取得 → snake_case出力への整形 → リソース解放」の配線を検証する。
 */
const findByClientIdMock = jest.fn<(clientId: string) => Promise<AssessmentRecord[]>>();
const closeMock = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('../../src/db.js', () => ({
  AssessmentRepository: jest.fn().mockImplementation(() => ({
    findByClientId: findByClientIdMock,
    close: closeMock,
  })),
}));

jest.unstable_mockModule('../../src/config.js', () => ({
  loadConfig: jest.fn(() => ({
    databaseUrl: 'postgresql://mock-db',
    supabaseServiceKey: 'mock-service-key',
  })),
}));

const { AssessmentRepository } = await import('../../src/db.js');
const { loadConfig } = await import('../../src/config.js');
const { handleListDigitalMaturityHistory } = await import('../../src/tools/listDigitalMaturityHistory.js');

function buildRecord(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: 'assessment-1',
    clientId: 'client-1',
    assessedAt: '2026-05-01T00:00:00.000Z',
    salesScore: 75,
    adminScore: 50,
    hrScore: 25,
    infraScore: 100,
    overallScore: 62.5,
    priorityImprovements: [
      { itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA/CRM', level: 1, score: 25, action: '導入を検討する' },
    ],
    rawAnswers: { sfa_crm: 1 },
    ...overrides,
  };
}

describe('handleListDigitalMaturityHistory', () => {
  beforeEach(() => {
    findByClientIdMock.mockReset();
    closeMock.mockReset();
    (AssessmentRepository as unknown as jest.Mock).mockClear();
    (loadConfig as unknown as jest.Mock).mockClear();
  });

  it('client_idが空文字だとエラーを投げ、DBには一切接続しない', async () => {
    await expect(handleListDigitalMaturityHistory({ client_id: '' })).rejects.toThrow(
      /client_idは必須の文字列です/,
    );

    expect(AssessmentRepository).not.toHaveBeenCalled();
    expect(findByClientIdMock).not.toHaveBeenCalled();
  });

  it('repository.findByClientIdへclient_idをそのまま渡す', async () => {
    findByClientIdMock.mockResolvedValue([]);

    await handleListDigitalMaturityHistory({ client_id: 'client-42' });

    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(AssessmentRepository).toHaveBeenCalledWith('postgresql://mock-db');
    expect(findByClientIdMock).toHaveBeenCalledWith('client-42');
  });

  it('正常系: DBのcamelCase行をAPI仕様(snake_case)の出力形式へ1件ずつ変換する', async () => {
    findByClientIdMock.mockResolvedValue([buildRecord()]);

    const history = await handleListDigitalMaturityHistory({ client_id: 'client-1' });

    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      id: 'assessment-1',
      client_id: 'client-1',
      assessed_at: '2026-05-01T00:00:00.000Z',
      sales_score: 75,
      admin_score: 50,
      hr_score: 25,
      infra_score: 100,
      overall_score: 62.5,
      priority_improvements: [
        { itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA/CRM', level: 1, score: 25, action: '導入を検討する' },
      ],
      raw_answers: { sfa_crm: 1 },
    });
  });

  it('複数件の履歴はrepositoryが返した順序(新しい順)のまま出力する', async () => {
    findByClientIdMock.mockResolvedValue([
      buildRecord({ id: 'assessment-2', assessedAt: '2026-05-02T00:00:00.000Z', overallScore: 100 }),
      buildRecord({ id: 'assessment-1', assessedAt: '2026-05-01T00:00:00.000Z', overallScore: 0 }),
    ]);

    const history = await handleListDigitalMaturityHistory({ client_id: 'client-1' });

    expect(history.map((h) => h.id)).toEqual(['assessment-2', 'assessment-1']);
    expect(history[0].overall_score).toBe(100);
    expect(history[1].overall_score).toBe(0);
  });

  it('診断履歴が無いclient_idは空配列を返す', async () => {
    findByClientIdMock.mockResolvedValue([]);

    const history = await handleListDigitalMaturityHistory({ client_id: 'client-none' });

    expect(history).toEqual([]);
  });

  it('repository.closeが呼ばれる(リソース解放)', async () => {
    findByClientIdMock.mockResolvedValue([]);

    await handleListDigitalMaturityHistory({ client_id: 'client-1' });

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('repository.findByClientIdが失敗してもcloseは呼ばれ(finally)、エラーはそのまま伝播する', async () => {
    findByClientIdMock.mockRejectedValue(new Error('db connection lost'));

    await expect(handleListDigitalMaturityHistory({ client_id: 'client-1' })).rejects.toThrow(
      /db connection lost/,
    );

    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
