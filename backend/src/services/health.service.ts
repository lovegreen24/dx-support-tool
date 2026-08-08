export type HealthStatus = 'ok';

export interface HealthReport {
  status: HealthStatus;
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * サーバーの稼働状態レポートを生成する純粋関数。
 * I/O(process.uptime/現在時刻)は呼び出し側から注入し、テスト容易性を確保する。
 */
export function buildHealthReport(
  uptimeSeconds: number,
  now: Date = new Date()
): HealthReport {
  return {
    status: 'ok',
    uptimeSeconds: Math.floor(uptimeSeconds),
    timestamp: now.toISOString(),
  };
}
