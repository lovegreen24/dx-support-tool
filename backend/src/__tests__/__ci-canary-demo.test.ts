import { describe, it, expect } from 'vitest';

describe('CI実証用(意図的に失敗させる、マージしない)', () => {
  it('わざと失敗させてCIが赤くなることを確認する', () => {
    expect(1).toBe(2);
  });
});
