/**
 * 環境変数の集約モジュール。process.envへの直接アクセスはこのファイル経由のみとする
 * (CLAUDE.md「ハードコード禁止: process.envはconfig経由のみ」に準拠)。
 */
import type { CaseManagementConfig, ServiceAccountCredentials } from './types.js';

/**
 * 必須環境変数を読み込む。未設定・不正な場合は即座にエラーを投げる
 * (CLAUDE.md「環境変数エラー → 全タスク停止、即報告」に準拠しフォールバックしない)。
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): CaseManagementConfig {
  const spreadsheetId = env.GOOGLE_SHEETS_ID;
  const serviceAccountJson = env.GOOGLE_SERVICE_ACCOUNT_JSON;

  const missing: string[] = [];
  if (!spreadsheetId) missing.push('GOOGLE_SHEETS_ID');
  if (!serviceAccountJson) missing.push('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (missing.length > 0) {
    throw new Error(`必須環境変数が未設定です: ${missing.join(', ')}`);
  }

  return {
    spreadsheetId: spreadsheetId as string,
    serviceAccount: parseServiceAccountJson(serviceAccountJson as string),
  };
}

function parseServiceAccountJson(raw: string): ServiceAccountCredentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSONの解析に失敗しました(不正なJSON)');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.client_email !== 'string' || typeof obj.private_key !== 'string') {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSONにclient_email/private_keyが含まれていません');
  }

  return { client_email: obj.client_email, private_key: obj.private_key };
}
