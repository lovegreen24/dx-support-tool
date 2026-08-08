export interface MetricsReport {
  uptimeSeconds: number;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
  };
  nodeVersion: string;
  timestamp: string;
}

function toMb(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100;
}

/**
 * 運用監視用の簡易メトリクスレポートを生成する純粋関数。
 * I/O(process.uptime/process.memoryUsage/現在時刻)は呼び出し側から注入し、テスト容易性を確保する。
 */
export function buildMetricsReport(
  uptimeSeconds: number,
  memoryUsage: NodeJS.MemoryUsage,
  nodeVersion: string,
  now: Date = new Date()
): MetricsReport {
  return {
    uptimeSeconds: Math.floor(uptimeSeconds),
    memory: {
      rssMb: toMb(memoryUsage.rss),
      heapUsedMb: toMb(memoryUsage.heapUsed),
      heapTotalMb: toMb(memoryUsage.heapTotal),
    },
    nodeVersion,
    timestamp: now.toISOString(),
  };
}
