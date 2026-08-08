import type { Request, Response } from 'express';
import { buildMetricsReport } from '../services/metrics.service.js';

/**
 * GET /api/metrics
 * 外部監視ツール(Cloud Monitoring等)からのポーリング用。業務データを含まないため/api/healthと同様に認証不要。
 */
export function getMetrics(_req: Request, res: Response): void {
  const report = buildMetricsReport(process.uptime(), process.memoryUsage(), process.version);
  res.status(200).json(report);
}
