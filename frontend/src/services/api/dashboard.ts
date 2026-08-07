import type { Client, CaseProgress } from '../../types';

/**
 * 進捗ダッシュボード用APIスケルトン
 * TODO: Phase 9でAPI接続実装(案件管理MCP/Googleスプレッドシート連携)
 */

// @API_INTEGRATION
export async function fetchClients(): Promise<Client[]> {
  throw new Error('API not implemented');
}

// @API_INTEGRATION
export async function fetchCaseProgress(): Promise<CaseProgress[]> {
  throw new Error('API not implemented');
}
