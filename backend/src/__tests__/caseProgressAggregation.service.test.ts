import { describe, expect, it } from 'vitest';
import {
  APPROVAL_POINT_LABELS,
  buildCaseProgressList,
  rowToCaseProgress,
} from '../services/caseProgressAggregation.service.js';

/**
 * 「案件進捗」シートの1行(A〜P列・16セル)を模したフィクスチャを作るヘルパー。
 * 列順: case_id, client_id, client_name, step1〜6_status, step1〜6_approved_at, updated_at
 */
function buildRow(overrides: {
  caseId?: string;
  clientId?: string;
  clientName?: string;
  statuses?: string[];
  approvedAts?: string[];
  updatedAt?: string;
}): string[] {
  const statuses = overrides.statuses ?? ['pending', 'pending', 'pending', 'pending', 'pending', 'pending'];
  const approvedAts = overrides.approvedAts ?? ['', '', '', '', '', ''];
  return [
    overrides.caseId ?? 'CASE-1',
    overrides.clientId ?? 'CLIENT-1',
    overrides.clientName ?? '株式会社テスト',
    ...statuses,
    ...approvedAts,
    overrides.updatedAt ?? '2026-08-08T00:00:00.000Z',
  ];
}

describe('APPROVAL_POINT_LABELS', () => {
  it('6承認ポイントを固定順序で保持する(DASH-021のラベル順と一致)', () => {
    expect(APPROVAL_POINT_LABELS).toEqual([
      'クライアント登録',
      '決算書解析',
      'ヒアリング回収',
      '財務分析',
      'ベンチマーク比較',
      '提案書生成',
    ]);
  });
});

describe('rowToCaseProgress', () => {
  it('全ステップpendingの行をCaseProgressへ変換する', () => {
    const row = buildRow({ caseId: 'CASE-1', clientName: '株式会社テスト' });

    const result = rowToCaseProgress(row);

    expect(result.caseId).toBe('CASE-1');
    expect(result.clientName).toBe('株式会社テスト');
    expect(result.steps).toHaveLength(6);
    expect(result.steps[0]).toEqual({ label: 'クライアント登録', status: 'pending' });
    expect(result.steps.every((step) => step.approvedAt === undefined)).toBe(true);
  });

  it('completedステップには承認日(approvedAt)が付与される', () => {
    const row = buildRow({
      statuses: ['completed', 'active', 'pending', 'pending', 'pending', 'pending'],
      approvedAts: ['2026-08-01T09:00:00.000Z', '', '', '', '', ''],
    });

    const result = rowToCaseProgress(row);

    expect(result.steps[0]).toEqual({
      label: 'クライアント登録',
      status: 'completed',
      approvedAt: '2026-08-01T09:00:00.000Z',
    });
    expect(result.steps[1]).toEqual({ label: '決算書解析', status: 'active' });
    expect(result.steps[1].approvedAt).toBeUndefined();
  });

  it('ラベルは常にAPPROVAL_POINT_LABELSの順序で並ぶ', () => {
    const row = buildRow({});
    const result = rowToCaseProgress(row);
    expect(result.steps.map((step) => step.label)).toEqual([...APPROVAL_POINT_LABELS]);
  });

  it('不正・未知のステータス文字列はpendingへ正規化される', () => {
    const row = buildRow({ statuses: ['completed', '', 'unknown-status', 'pending', 'pending', 'pending'] });

    const result = rowToCaseProgress(row);

    expect(result.steps[0].status).toBe('completed');
    expect(result.steps[1].status).toBe('pending');
    expect(result.steps[2].status).toBe('pending');
  });

  it('case_id/client_nameが欠落している場合は空文字にフォールバックする', () => {
    const result = rowToCaseProgress([]);
    expect(result.caseId).toBe('');
    expect(result.clientName).toBe('');
    expect(result.steps).toHaveLength(6);
  });
});

describe('buildCaseProgressList', () => {
  it('複数行をシート順のままCaseProgress配列に変換する', () => {
    const rows = [
      buildRow({ caseId: 'CASE-1', clientName: '先に登録した案件' }),
      buildRow({ caseId: 'CASE-2', clientName: '後で登録した案件' }),
    ];

    const result = buildCaseProgressList(rows);

    expect(result.map((c) => c.caseId)).toEqual(['CASE-1', 'CASE-2']);
  });

  it('case_id(A列)が空の行は除外する', () => {
    const rows = [buildRow({ caseId: 'CASE-1' }), buildRow({ caseId: '' }), []];

    const result = buildCaseProgressList(rows);

    expect(result).toHaveLength(1);
    expect(result[0].caseId).toBe('CASE-1');
  });

  it('データ行が1件も無い場合は空配列を返す', () => {
    expect(buildCaseProgressList([])).toEqual([]);
  });
});
