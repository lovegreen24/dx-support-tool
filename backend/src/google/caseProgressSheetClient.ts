import { fetchAccessToken, parseServiceAccountJson, type ServiceAccountCredentials } from './serviceAccountAuth.js';

/**
 * 「案件進捗」シート(案件管理MCP/M-010が読み書きする同一Googleスプレッドシート)を
 * 直接HTTPで読む読み取り専用クライアント。
 *
 * 【設計判断】cloud_proxy MCP(M-010)は環境変数バインディングのゲートウェイ反映にタイムラグがあり、
 * 同一セッション内で不安定なことが実測で判明している(docs/SCOPE_PROGRESS.md「既知の制約」参照)。
 * `/api/case-progress`はバックエンドプロセス単体で常時応答する必要があるエンドポイントであり、
 * MCP呼び出し(Claude Code経由でしか到達できない)に依存すると本番運用でも同じ不安定性を
 * 引き継いでしまう。M-010はGoogle Sheets API(REST)・サービスアカウントJWT認証のみで実装されており
 * (`mcp-servers/case-management/src/api/sheets.ts`)、この経路は同じ資格情報があれば
 * バックエンドから直接HTTPで再現できるため、本クラスは読み取りのみのサブセットを
 * Node向けに実装し、MCPゲートウェイを経由しない方式を採用する。
 */

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
/** 案件管理MCPのconstants.tsと同一のシート名・データ範囲(A2:P = ヘッダー行を除く全16列) */
const SHEET_NAME = '案件進捗';
const DATA_RANGE = `${SHEET_NAME}!A2:P`;

export class SheetsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'SheetsApiError';
  }
}

export interface CaseProgressSheetConfig {
  spreadsheetId: string;
  serviceAccount: ServiceAccountCredentials;
}

export interface CaseProgressSheetEnv {
  googleSheetsId?: string;
  googleServiceAccountJson?: string;
}

/**
 * config(GOOGLE_SHEETS_ID / GOOGLE_SERVICE_ACCOUNT_JSON)からクライアント設定を組み立てる。
 * 未設定の場合は即座に例外を投げる(CLAUDE.md「環境変数エラー→全タスク停止、即報告」に準拠)。
 */
export function loadCaseProgressSheetConfig(env: CaseProgressSheetEnv): CaseProgressSheetConfig {
  const missing: string[] = [];
  if (!env.googleSheetsId) missing.push('GOOGLE_SHEETS_ID');
  if (!env.googleServiceAccountJson) missing.push('GOOGLE_SERVICE_ACCOUNT_JSON');
  if (missing.length > 0) {
    throw new Error(`/api/case-progressに必要な環境変数が未設定です: ${missing.join(', ')}`);
  }

  return {
    spreadsheetId: env.googleSheetsId as string,
    serviceAccount: parseServiceAccountJson(env.googleServiceAccountJson as string),
  };
}

export class CaseProgressSheetClient {
  constructor(
    private readonly config: CaseProgressSheetConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** ヘッダー行を除く「案件進捗」シートの全データ行(A〜P列の文字列配列)を取得する */
  async listDataRows(): Promise<string[][]> {
    const token = await fetchAccessToken(this.config.serviceAccount, { fetchImpl: this.fetchImpl });
    const range = encodeURIComponent(DATA_RANGE);
    const response = await this.fetchImpl(`${SHEETS_API_BASE}/${this.config.spreadsheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new SheetsApiError(`Google Sheets APIデータ行取得エラー(status=${response.status})`, response.status, body);
    }

    const data = (await response.json()) as { values?: string[][] };
    return data.values ?? [];
  }
}
