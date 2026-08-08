import { describe, expect, it } from 'vitest';
import { buildHealthReport } from '../services/health.service.js';

describe('buildHealthReport', () => {
  it('status: okを返す', () => {
    const report = buildHealthReport(12.9, new Date('2026-08-08T00:00:00.000Z'));
    expect(report.status).toBe('ok');
  });

  it('uptimeSecondsを整数に切り捨てる', () => {
    const report = buildHealthReport(12.9, new Date('2026-08-08T00:00:00.000Z'));
    expect(report.uptimeSeconds).toBe(12);
  });

  it('timestampをISO8601形式で返す', () => {
    const fixedDate = new Date('2026-08-08T09:30:00.000Z');
    const report = buildHealthReport(0, fixedDate);
    expect(report.timestamp).toBe('2026-08-08T09:30:00.000Z');
  });

  it('uptimeSecondsが0の場合も正しく返す', () => {
    const report = buildHealthReport(0, new Date('2026-08-08T00:00:00.000Z'));
    expect(report.uptimeSeconds).toBe(0);
  });

  it('nowを省略した場合は現在時刻を用いる', () => {
    const before = Date.now();
    const report = buildHealthReport(1);
    const after = Date.now();
    const reportTime = new Date(report.timestamp).getTime();
    expect(reportTime).toBeGreaterThanOrEqual(before);
    expect(reportTime).toBeLessThanOrEqual(after);
  });
});
