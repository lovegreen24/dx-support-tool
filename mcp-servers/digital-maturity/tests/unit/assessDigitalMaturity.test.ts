import { jest } from '@jest/globals';
import { MATURITY_CATALOG } from '../../src/catalog.js';
import type { AssessmentRecord, AssessmentRecordInput, MaturityAnswers, MaturityLevel } from '../../src/types.js';

/**
 * assess_digital_maturityツールハンドラのunitテスト。
 * AssessmentRepository(DB)・loadConfigをモックし、DB接続なしで
 * 「入力検証 → スコアリング → DB保存 → 出力整形」の配線と仕様(docs参照)を検証する。
 * スコア計算式そのものの網羅的な検証はsrc/scoring.tsの純粋関数として
 * tests/unit/scoring.test.tsで既にカバーしているため、ここでは
 * ハンドラ固有の責務(入力検証によるDB書き込み防止・DB確定値の反映・リソース解放)に絞る。
 */
const insertMock = jest.fn<(record: AssessmentRecordInput) => Promise<AssessmentRecord>>();
const closeMock = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('../../src/db.js', () => ({
  AssessmentRepository: jest.fn().mockImplementation(() => ({
    insert: insertMock,
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
const { handleAssessDigitalMaturity } = await import('../../src/tools/assessDigitalMaturity.js');

function buildAnswers(level: MaturityLevel, overrides: Record<string, MaturityLevel> = {}): MaturityAnswers {
  const answers: MaturityAnswers = {};
  for (const item of MATURITY_CATALOG) {
    answers[item.itemId] = level;
  }
  return { ...answers, ...overrides };
}

function buildSavedRecord(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: 'db-assigned-id',
    clientId: 'client-1',
    assessedAt: '2026-05-01T00:00:00.000Z',
    salesScore: 50,
    adminScore: 50,
    hrScore: 50,
    infraScore: 50,
    overallScore: 50,
    priorityImprovements: [],
    rawAnswers: buildAnswers(2),
    ...overrides,
  };
}

describe('handleAssessDigitalMaturity', () => {
  beforeEach(() => {
    insertMock.mockReset();
    closeMock.mockReset();
    (AssessmentRepository as unknown as jest.Mock).mockClear();
    (loadConfig as unknown as jest.Mock).mockClear();
  });

  it('client_idが空文字だとエラーを投げ、DBには一切接続しない', async () => {
    await expect(
      handleAssessDigitalMaturity({ client_id: '', answers: buildAnswers(2) }),
    ).rejects.toThrow(/client_idは必須の文字列です/);

    expect(AssessmentRepository).not.toHaveBeenCalled();
  });

  it('answersが未指定だとエラーを投げ、DBには一切接続しない', async () => {
    await expect(
      handleAssessDigitalMaturity({ client_id: 'client-1', answers: undefined as unknown as MaturityAnswers }),
    ).rejects.toThrow(/answersは必須のオブジェクトです/);

    expect(AssessmentRepository).not.toHaveBeenCalled();
  });

  it('未回答の診断項目があるとスコアリング段階でエラーになり、DBには一切接続しない', async () => {
    const incompleteAnswers = buildAnswers(2);
    delete incompleteAnswers[MATURITY_CATALOG[0].itemId];

    await expect(
      handleAssessDigitalMaturity({ client_id: 'client-1', answers: incompleteAnswers }),
    ).rejects.toThrow(/未回答の診断項目があります/);

    expect(AssessmentRepository).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('正常系: スコアリング結果をrepository.insertへ渡し、DB確定値(id/assessed_at)を出力に反映する', async () => {
    const answers = buildAnswers(2);
    insertMock.mockResolvedValue(
      buildSavedRecord({ id: 'assessment-xyz', assessedAt: '2026-05-03T09:00:00.000Z', rawAnswers: answers }),
    );

    const output = await handleAssessDigitalMaturity({ client_id: 'client-1', answers });

    // AssessmentRepositoryはconfig.databaseUrlで生成される
    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(AssessmentRepository).toHaveBeenCalledWith('postgresql://mock-db');

    // 全項目レベル2 → 各領域50点・総合50点(levelToScore=25点刻み)
    expect(insertMock).toHaveBeenCalledTimes(1);
    const insertedRecord = insertMock.mock.calls[0][0];
    expect(insertedRecord.clientId).toBe('client-1');
    expect(insertedRecord.salesScore).toBe(50);
    expect(insertedRecord.adminScore).toBe(50);
    expect(insertedRecord.hrScore).toBe(50);
    expect(insertedRecord.infraScore).toBe(50);
    expect(insertedRecord.overallScore).toBe(50);
    expect(insertedRecord.rawAnswers).toEqual(answers);
    // レベル2はPRIORITY_LEVEL_THRESHOLD(3)未満なので全項目が改善優先度リスト対象
    expect(insertedRecord.priorityImprovements).toHaveLength(MATURITY_CATALOG.length);

    // 出力にはDBが確定したid・assessed_atがそのまま使われる(クライアント側生成値ではない)
    expect(output.id).toBe('assessment-xyz');
    expect(output.assessed_at).toBe('2026-05-03T09:00:00.000Z');
    expect(output.client_id).toBe('client-1');
    expect(output.overall_score).toBe(50);
    expect(output.raw_answers).toEqual(answers);
  });

  it('全項目レベル4(満点)なら改善優先度リストは空になる', async () => {
    const answers = buildAnswers(4);
    insertMock.mockResolvedValue(buildSavedRecord({ overallScore: 100, rawAnswers: answers }));

    await handleAssessDigitalMaturity({ client_id: 'client-1', answers });

    const insertedRecord = insertMock.mock.calls[0][0];
    expect(insertedRecord.overallScore).toBe(100);
    expect(insertedRecord.priorityImprovements).toEqual([]);
  });

  it('正常系ではrepository.closeが呼ばれる(リソース解放)', async () => {
    insertMock.mockResolvedValue(buildSavedRecord());

    await handleAssessDigitalMaturity({ client_id: 'client-1', answers: buildAnswers(2) });

    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('repository.insertが失敗してもcloseは呼ばれ(finally)、エラーはそのまま伝播する', async () => {
    insertMock.mockRejectedValue(new Error('db connection lost'));

    await expect(
      handleAssessDigitalMaturity({ client_id: 'client-1', answers: buildAnswers(2) }),
    ).rejects.toThrow(/db connection lost/);

    expect(closeMock).toHaveBeenCalledTimes(1);
  });
});
