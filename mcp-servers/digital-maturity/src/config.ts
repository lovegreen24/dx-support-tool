/**
 * 環境変数の集約モジュール。process.envへの直接アクセスはこのファイル経由のみとする
 * (CLAUDE.md「ハードコード禁止: process.envはconfig経由のみ」に準拠)。
 */

export interface DigitalMaturityConfig {
  /** Supabase(PostgreSQL)接続文字列(pgbouncer・ランタイム用) */
  databaseUrl: string;
  /**
   * Supabase service_roleキー。
   * digital_maturity_assessmentsテーブルへの書き込みはconfig.databaseUrl経由の
   * 直接Postgres接続(pg)で行うため本キー自体は接続には使わないが、
   * docs/SCOPE_PROGRESS.md「MCP/ツール管理表」で本MCPのrequiredEnvVarsとして
   * DATABASE_URLとの対で定義済みのため、起動時の必須環境変数として検証する。
   */
  supabaseServiceKey: string;
}

/**
 * 必須環境変数を読み込む。未設定の場合は即座にエラーを投げる
 * (CLAUDE.md「環境変数エラー → 全タスク停止、即報告」に準拠しフォールバックしない)。
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): DigitalMaturityConfig {
  const databaseUrl = env.DATABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_KEY;

  const missing: string[] = [];
  if (!databaseUrl) missing.push('DATABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY');

  if (missing.length > 0) {
    throw new Error(`必須環境変数が未設定です: ${missing.join(', ')}`);
  }

  return {
    databaseUrl: databaseUrl as string,
    supabaseServiceKey: supabaseServiceKey as string,
  };
}
