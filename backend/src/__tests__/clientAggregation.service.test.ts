import { describe, expect, it } from 'vitest';
import type { ClientSnapshot } from '../db/clientStore.js';
import {
  buildClientList,
  deriveProposalStatus,
  formatFiscalYearEnd,
  toClient,
} from '../services/clientAggregation.service.js';

function makeSnapshot(overrides: Partial<ClientSnapshot> = {}): ClientSnapshot {
  return {
    clientId: 'C-TEST-001',
    name: 'テスト株式会社',
    industry: '小売業',
    employeeCount: 10,
    fiscalYearEndMonthDay: '03-31',
    hearingMissingCount: null,
    proposalGeneratedAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('formatFiscalYearEnd', () => {
  it('"03-31" を "3月" に変換する', () => {
    expect(formatFiscalYearEnd('03-31')).toBe('3月');
  });

  it('"12-31" を "12月" に変換する(2桁月)', () => {
    expect(formatFiscalYearEnd('12-31')).toBe('12月');
  });

  it('"09-30" を "9月" に変換する(先頭ゼロを除去)', () => {
    expect(formatFiscalYearEnd('09-30')).toBe('9月');
  });

  it('不正な形式の場合はエラーを投げる(フォールバックで隠蔽しない)', () => {
    expect(() => formatFiscalYearEnd('invalid')).toThrow();
  });

  it('月が範囲外(13月)の場合はエラーを投げる', () => {
    expect(() => formatFiscalYearEnd('13-01')).toThrow();
  });
});

describe('deriveProposalStatus', () => {
  it('proposalGeneratedAtがある場合はcompletedを返す', () => {
    const snapshot = makeSnapshot({ proposalGeneratedAt: '2026-08-08T12:22:01.014Z', hearingMissingCount: 0 });
    expect(deriveProposalStatus(snapshot)).toBe('completed');
  });

  it('ヒアリング未着手(missingCount=null)の場合はnot_startedを返す', () => {
    const snapshot = makeSnapshot({ hearingMissingCount: null });
    expect(deriveProposalStatus(snapshot)).toBe('not_started');
  });

  it('ヒアリング着手済みだが提案書未生成の場合はin_progressを返す', () => {
    const snapshot = makeSnapshot({ hearingMissingCount: 20 });
    expect(deriveProposalStatus(snapshot)).toBe('in_progress');
  });

  it('ヒアリング完了率100%でも提案書生成の記録が無ければin_progressを返す(completedと誤判定しない)', () => {
    const snapshot = makeSnapshot({ hearingMissingCount: 0, proposalGeneratedAt: null });
    expect(deriveProposalStatus(snapshot)).toBe('in_progress');
  });
});

describe('toClient', () => {
  it('ClientSnapshotをフロントエンド契約のClient型へ変換する', () => {
    const snapshot = makeSnapshot({
      clientId: '8a02688a-06fc-4867-ad0f-187b4255939a',
      name: '株式会社テスト商事',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEndMonthDay: '03-31',
      hearingMissingCount: 0,
      proposalGeneratedAt: '2026-08-08T12:22:01.014Z',
    });

    expect(toClient(snapshot)).toEqual({
      clientId: '8a02688a-06fc-4867-ad0f-187b4255939a',
      name: '株式会社テスト商事',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEnd: '3月',
      hearingCompletionRate: 100,
      proposalStatus: 'completed',
    });
  });
});

describe('buildClientList', () => {
  it('空配列を渡すと空配列を返す', () => {
    expect(buildClientList([])).toEqual([]);
  });

  it('複数スナップショットをそれぞれClient型へ変換する', () => {
    const snapshots = [
      makeSnapshot({ clientId: 'C-1', name: 'A社', hearingMissingCount: 29 }),
      makeSnapshot({ clientId: 'C-2', name: 'B社', hearingMissingCount: 0, proposalGeneratedAt: '2026-08-08T00:00:00.000Z' }),
    ];

    const result = buildClientList(snapshots);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ clientId: 'C-1', name: 'A社', proposalStatus: 'not_started', hearingCompletionRate: 0 });
    expect(result[1]).toMatchObject({ clientId: 'C-2', name: 'B社', proposalStatus: 'completed', hearingCompletionRate: 100 });
  });
});
