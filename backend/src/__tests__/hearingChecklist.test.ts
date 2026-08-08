import { describe, expect, it } from 'vitest';
import {
  HEARING_CHECKLIST_TOTAL_COUNT,
  computeHearingCompletionRate,
} from '../services/hearingChecklist.js';

describe('HEARING_CHECKLIST_TOTAL_COUNT', () => {
  it('remind_missing_hearing_itemsの実測項目数(29)と一致する', () => {
    expect(HEARING_CHECKLIST_TOTAL_COUNT).toBe(29);
  });
});

describe('computeHearingCompletionRate', () => {
  it('missingCountがnullの場合は0を返す', () => {
    expect(computeHearingCompletionRate(null)).toBe(0);
  });

  it('missingCountがundefinedの場合は0を返す', () => {
    expect(computeHearingCompletionRate(undefined)).toBe(0);
  });

  it('missingCountが全項目数と同じ(未回答)場合は0を返す', () => {
    expect(computeHearingCompletionRate(HEARING_CHECKLIST_TOTAL_COUNT)).toBe(0);
  });

  it('missingCountが0(全回答済み)の場合は100を返す', () => {
    expect(computeHearingCompletionRate(0)).toBe(100);
  });

  it('一部回答済みの場合は四捨五入した整数%を返す(実測: 29項目中20件未回答 → 31%)', () => {
    // 実際のMCP呼び出し(内部結合テストで使用したclient B相当)で観測した missingCount=20
    expect(computeHearingCompletionRate(20)).toBe(31);
  });

  it('missingCountが全項目数を超える異常値でも0未満にはならない(クランプ)', () => {
    expect(computeHearingCompletionRate(HEARING_CHECKLIST_TOTAL_COUNT + 100)).toBe(0);
  });
});
