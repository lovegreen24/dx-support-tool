import { jest } from '@jest/globals';
import type { QueryResult } from 'pg';

/**
 * AssessmentRepositoryのunitテスト。
 * 実DB接続は行わず、pgのPoolをモックしてSQL呼び出し・パラメータ・行マッピングを検証する。
 * 実DB前提の検証(実際に保存できるか等)は tests/integration/internal で行う。
 */
const queryMock = jest.fn<(...args: unknown[]) => Promise<QueryResult<Record<string, unknown>>>>();
const endMock = jest.fn<() => Promise<void>>();

jest.unstable_mockModule('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: queryMock,
    end: endMock,
  })),
}));

const { Pool } = await import('pg');
const { AssessmentRepository } = await import('../../src/db.js');

function buildQueryResult(rows: unknown[]): QueryResult<Record<string, unknown>> {
  return { rows, rowCount: rows.length, command: '', oid: 0, fields: [] } as unknown as QueryResult<
    Record<string, unknown>
  >;
}

describe('AssessmentRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    endMock.mockReset();
    (Pool as unknown as jest.Mock).mockClear();
  });

  it('コンストラクタでconnectionStringを渡してPoolを生成する', () => {
    new AssessmentRepository('postgresql://example');

    expect(Pool).toHaveBeenCalledTimes(1);
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://example',
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  });

  describe('insert', () => {
    it('digital_maturity_assessmentsへ全カラムをバインドしてINSERTし、DB確定値を含む行を返す', async () => {
      queryMock.mockResolvedValue(
        buildQueryResult([
          {
            id: 'assessment-1',
            client_id: 'client-1',
            assessed_at: '2026-05-01T00:00:00.000Z',
            sales_score: '75',
            admin_score: '50',
            hr_score: '25',
            infra_score: '100',
            overall_score: '62.5',
            priority_improvements: [
              { itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA', level: 1, score: 25, action: 'do it' },
            ],
            raw_answers: { sfa_crm: 1 },
          },
        ]),
      );

      const repository = new AssessmentRepository('postgresql://example');
      const result = await repository.insert({
        clientId: 'client-1',
        salesScore: 75,
        adminScore: 50,
        hrScore: 25,
        infraScore: 100,
        overallScore: 62.5,
        priorityImprovements: [
          { itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA', level: 1, score: 25, action: 'do it' },
        ],
        rawAnswers: { sfa_crm: 1 },
      });

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/INSERT INTO public\.digital_maturity_assessments/);
      expect(sql).toMatch(/RETURNING id, client_id, assessed_at/);
      expect(params).toEqual([
        'client-1',
        75,
        50,
        25,
        100,
        62.5,
        JSON.stringify([{ itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA', level: 1, score: 25, action: 'do it' }]),
        JSON.stringify({ sfa_crm: 1 }),
      ]);

      // DB行(snake_case・スコアは文字列)がキャメルケース・数値へマッピングされる
      expect(result).toEqual({
        id: 'assessment-1',
        clientId: 'client-1',
        assessedAt: '2026-05-01T00:00:00.000Z',
        salesScore: 75,
        adminScore: 50,
        hrScore: 25,
        infraScore: 100,
        overallScore: 62.5,
        priorityImprovements: [
          { itemId: 'sfa_crm', areaId: 'sales', areaLabel: '営業', itemLabel: 'SFA', level: 1, score: 25, action: 'do it' },
        ],
        rawAnswers: { sfa_crm: 1 },
      });
    });
  });

  describe('findByClientId', () => {
    it('client_id条件・新しい順ソートでSELECTし、複数行をマッピングして返す', async () => {
      queryMock.mockResolvedValue(
        buildQueryResult([
          {
            id: 'assessment-2',
            client_id: 'client-1',
            assessed_at: '2026-05-02T00:00:00.000Z',
            sales_score: '100',
            admin_score: '100',
            hr_score: '100',
            infra_score: '100',
            overall_score: '100',
            priority_improvements: [],
            raw_answers: {},
          },
          {
            id: 'assessment-1',
            client_id: 'client-1',
            assessed_at: '2026-05-01T00:00:00.000Z',
            sales_score: '0',
            admin_score: '0',
            hr_score: '0',
            infra_score: '0',
            overall_score: '0',
            priority_improvements: [],
            raw_answers: {},
          },
        ]),
      );

      const repository = new AssessmentRepository('postgresql://example');
      const result = await repository.findByClientId('client-1');

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/FROM public\.digital_maturity_assessments/);
      expect(sql).toMatch(/WHERE client_id = \$1/);
      expect(sql).toMatch(/ORDER BY assessed_at DESC/);
      expect(params).toEqual(['client-1']);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('assessment-2');
      expect(result[0].overallScore).toBe(100);
      expect(result[1].id).toBe('assessment-1');
      expect(result[1].overallScore).toBe(0);
    });

    it('該当行が無い場合は空配列を返す', async () => {
      queryMock.mockResolvedValue(buildQueryResult([]));

      const repository = new AssessmentRepository('postgresql://example');
      const result = await repository.findByClientId('never-exists');

      expect(result).toEqual([]);
    });
  });

  describe('deleteByClientId', () => {
    it('client_id指定でDELETEを実行する', async () => {
      queryMock.mockResolvedValue(buildQueryResult([]));

      const repository = new AssessmentRepository('postgresql://example');
      await repository.deleteByClientId('client-1');

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0] as [string, unknown[]];
      expect(sql).toMatch(/DELETE FROM public\.digital_maturity_assessments WHERE client_id = \$1/);
      expect(params).toEqual(['client-1']);
    });
  });

  describe('close', () => {
    it('pool.endを呼び出す', async () => {
      const repository = new AssessmentRepository('postgresql://example');
      await repository.close();

      expect(endMock).toHaveBeenCalledTimes(1);
    });
  });
});
