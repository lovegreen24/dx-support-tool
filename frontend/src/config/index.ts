// 環境変数の集約(import.meta.envはここでのみ参照)

export const config = {
  dashboardPassword: import.meta.env.VITE_DASHBOARD_PASSWORD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4620',
  /** バックエンドAPI(/api/clients・/api/case-progress)認証用。backendのAPI_KEYと同一値 */
  apiKey: import.meta.env.VITE_API_KEY,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type Config = typeof config;
