// 環境変数の集約(process.envはここでのみ参照)
import { resolve } from 'node:path';

const DEFAULT_PORT = 4620;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 8000;
const DEFAULT_CLIENT_STORE_FILE_PATH = resolve(process.cwd(), 'data', 'clients.json');

function parsePort(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_PORT;
}

export const config = {
  port: parsePort(process.env.PORT),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  shutdownTimeoutMs: DEFAULT_SHUTDOWN_TIMEOUT_MS,
  /** クライアント一覧ローカルDB(自社DB)のファイルパス。CLIENT_STORE_FILE_PATHで上書き可 */
  clientStoreFilePath: process.env.CLIENT_STORE_FILE_PATH ?? DEFAULT_CLIENT_STORE_FILE_PATH,
  /**
   * 案件管理MCP(M-010)と同一のGoogleスプレッドシートID/サービスアカウントJSON。
   * `/api/case-progress`は当該MCPのcloud_proxyゲートウェイを経由せず、同じスプレッドシートを
   * 直接HTTPで読む(理由はdocs/SCOPE_PROGRESS.md「既知の制約」参照)。未設定時はリクエスト時に
   * `google/caseProgressSheetClient.ts`側でエラーとする(起動時には検証しない)。
   */
  googleSheetsId: process.env.GOOGLE_SHEETS_ID,
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  /**
   * フロントエンド(進捗ダッシュボード)からのCORSを許可するオリジン。
   * カンマ区切りで複数指定可。未設定時はローカル開発を優先し全オリジンを許可する
   * (認証はダッシュボード側のsessionStorageで完結しCookieを使わないため、
   * オリジン制限はCSRF対策ではなく想定外クライアントからのアクセス抑制が目的)。
   */
  frontendOrigin: process.env.FRONTEND_ORIGIN,
} as const;

export type Config = typeof config;
