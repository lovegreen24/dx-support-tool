import { describe, expect, it } from 'vitest';
import { buildMetricsReport } from '../services/metrics.service.js';

describe('buildMetricsReport', () => {
  const memoryUsage: NodeJS.MemoryUsage = {
    rss: 100 * 1024 * 1024,
    heapTotal: 50 * 1024 * 1024,
    heapUsed: 30 * 1024 * 1024,
    external: 0,
    arrayBuffers: 0,
  };

  it('uptimeSecondsを整数に切り捨てる', () => {
    const report = buildMetricsReport(12.9, memoryUsage, 'v20.0.0');
    expect(report.uptimeSeconds).toBe(12);
  });

  it('メモリ使用量をMB単位に変換する', () => {
    const report = buildMetricsReport(0, memoryUsage, 'v20.0.0');
    expect(report.memory).toEqual({ rssMb: 100, heapTotalMb: 50, heapUsedMb: 30 });
  });

  it('nodeVersionをそのまま含む', () => {
    const report = buildMetricsReport(0, memoryUsage, 'v20.0.0');
    expect(report.nodeVersion).toBe('v20.0.0');
  });

  it('timestampがISO8601形式である', () => {
    const now = new Date('2026-08-08T12:00:00.000Z');
    const report = buildMetricsReport(0, memoryUsage, 'v20.0.0', now);
    expect(report.timestamp).toBe('2026-08-08T12:00:00.000Z');
  });
});
