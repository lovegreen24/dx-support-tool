import type { Request, Response } from 'express';
import { buildHealthReport } from '../services/health.service.js';

/**
 * GET /api/health
 * サーバーが正常に稼働していることを確認するための簡易エンドポイント。
 */
export function getHealth(_req: Request, res: Response): void {
  const report = buildHealthReport(process.uptime());
  res.status(200).json(report);
}
