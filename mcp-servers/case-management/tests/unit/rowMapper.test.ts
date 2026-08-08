import { APPROVAL_POINT_LABELS } from '../../src/constants.js';
import { applyStepUpdate, buildInitialRecord, recordToRow, rowToRecord } from '../../src/rowMapper.js';
import type { CaseProgressRecord } from '../../src/types.js';

describe('rowToRecord / recordToRow', () => {
  it('16列の行を6ステップ分のCaseProgressRecordへ変換する', () => {
    const row = [
      'CASE-1',
      'C-001',
      '株式会社サンプル',
      'completed',
      'active',
      'pending',
      'pending',
      'pending',
      'pending',
      '2026-01-01T00:00:00.000Z',
      '',
      '',
      '',
      '',
      '',
      '2026-01-01T00:00:00.000Z',
    ];

    const record = rowToRecord(row);

    expect(record.case_id).toBe('CASE-1');
    expect(record.client_id).toBe('C-001');
    expect(record.client_name).toBe('株式会社サンプル');
    expect(record.steps).toHaveLength(6);
    expect(record.steps[0]).toEqual({
      label: APPROVAL_POINT_LABELS[0],
      status: 'completed',
      approved_at: '2026-01-01T00:00:00.000Z',
    });
    expect(record.steps[1]).toEqual({ label: APPROVAL_POINT_LABELS[1], status: 'active', approved_at: null });
    expect(record.steps[5]).toEqual({ label: APPROVAL_POINT_LABELS[5], status: 'pending', approved_at: null });
    expect(record.updated_at).toBe('2026-01-01T00:00:00.000Z');
  });

  it('不正なステータス文字列はpendingとして扱う', () => {
    const row = ['CASE-1', 'C-001', '名前', 'unknown', '', '', '', '', '', '', '', '', '', '', '', ''];
    const record = rowToRecord(row);
    expect(record.steps[0].status).toBe('pending');
  });

  it('recordToRowはrowToRecordの逆変換になる(往復一致)', () => {
    const record: CaseProgressRecord = buildInitialRecord('CASE-2', 'C-002', 'テスト商事', '2026-02-01T00:00:00.000Z');
    const row = recordToRow(record);
    expect(row).toHaveLength(16);
    expect(rowToRecord(row)).toEqual(record);
  });
});

describe('buildInitialRecord', () => {
  it('全6ステップをpending・approved_at=nullで初期化する', () => {
    const record = buildInitialRecord('CASE-3', 'C-003', '合同会社テスト', '2026-03-01T00:00:00.000Z');

    expect(record.steps).toHaveLength(6);
    expect(record.steps.every((step) => step.status === 'pending')).toBe(true);
    expect(record.steps.every((step) => step.approved_at === null)).toBe(true);
    expect(record.steps.map((step) => step.label)).toEqual([...APPROVAL_POINT_LABELS]);
    expect(record.updated_at).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('applyStepUpdate', () => {
  it('指定ステップをcompletedにすると、次のpendingステップがactiveへ繰り上がる', () => {
    const initial = buildInitialRecord('CASE-4', 'C-004', 'サンプル株式会社', '2026-01-01T00:00:00.000Z');

    const updated = applyStepUpdate(initial, 1, 'completed', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    expect(updated.steps[0]).toEqual({
      label: APPROVAL_POINT_LABELS[0],
      status: 'completed',
      approved_at: '2026-01-02T00:00:00.000Z',
    });
    expect(updated.steps[1].status).toBe('active');
    expect(updated.steps[2].status).toBe('pending');
    expect(updated.updated_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('最終ステップ(6)をcompletedにしても繰り上げ対象が無いためエラーにならない', () => {
    const initial = buildInitialRecord('CASE-5', 'C-005', 'サンプル株式会社', '2026-01-01T00:00:00.000Z');
    const withFive = applyStepUpdate(initial, 5, 'completed', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    const updated = applyStepUpdate(withFive, 6, 'completed', '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z');

    expect(updated.steps[5]).toEqual({
      label: APPROVAL_POINT_LABELS[5],
      status: 'completed',
      approved_at: '2026-01-03T00:00:00.000Z',
    });
  });

  it('活動中(active)のステップをpendingに戻すことができ、approved_atは変更しない', () => {
    const initial = buildInitialRecord('CASE-6', 'C-006', 'サンプル株式会社', '2026-01-01T00:00:00.000Z');
    const completed = applyStepUpdate(initial, 1, 'completed', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    const reverted = applyStepUpdate(completed, 1, 'active', null, '2026-01-03T00:00:00.000Z');

    expect(reverted.steps[0].status).toBe('active');
    expect(reverted.steps[0].approved_at).toBe('2026-01-02T00:00:00.000Z');
  });

  it('既にactiveな次ステップがある場合は上書きしない(completed以外の状態を尊重)', () => {
    const initial = buildInitialRecord('CASE-7', 'C-007', 'サンプル株式会社', '2026-01-01T00:00:00.000Z');
    const step2Completed = applyStepUpdate(
      initial,
      2,
      'completed',
      '2026-01-02T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    );

    // step2をcompletedにした結果、step3がactiveになる(step1はpendingのまま)
    expect(step2Completed.steps[0].status).toBe('pending');
    expect(step2Completed.steps[2].status).toBe('active');
  });
});
