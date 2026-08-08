import { COLUMN_COUNT, SHEET_NAME } from '../constants.js';
import { fetchAccessToken } from './auth.js';
import type { ServiceAccountCredentials } from '../types.js';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

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

interface ValuesResponse {
  values?: string[][];
}

/**
 * Google Sheets API(REST/fetchベース)クライアント。「案件進捗」シートの読み書きに特化する。
 * サービスアカウントJWT認証はこのクラスの外側(呼び出し元のトークン取得関数)に分離してある。
 */
export class CaseSheetClient {
  constructor(
    private readonly spreadsheetId: string,
    private readonly serviceAccount: ServiceAccountCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** ヘッダー行を除く全データ行を取得する(1行目=index0は元シートの2行目) */
  async listDataRows(): Promise<string[][]> {
    const token = await this.getToken();
    const range = encodeURIComponent(`${SHEET_NAME}!A2:P`);
    const response = await this.fetchImpl(`${SHEETS_API_BASE}/${this.spreadsheetId}/values/${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw await toSheetsApiError('データ行取得', response);
    }

    const data = (await response.json()) as ValuesResponse;
    return data.values ?? [];
  }

  /** 新規行を末尾に追加する(rowはA〜P列、COLUMN_COUNT要素) */
  async appendRow(row: string[]): Promise<void> {
    assertRowLength(row);
    const token = await this.getToken();
    const range = encodeURIComponent(`${SHEET_NAME}!A1:P1`);
    const appendUrl =
      `${SHEETS_API_BASE}/${this.spreadsheetId}/values/${range}:append` +
      '?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
    const response = await this.fetchImpl(
      appendUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [row] }),
      },
    );

    if (!response.ok) {
      throw await toSheetsApiError('行追加', response);
    }
  }

  /** 既存行を上書きする(sheetRowNumberはシート上の行番号・1始まり。ヘッダー行=1のため実データは2以上) */
  async updateRow(sheetRowNumber: number, row: string[]): Promise<void> {
    assertRowLength(row);
    const token = await this.getToken();
    const rangeLiteral = `${SHEET_NAME}!A${sheetRowNumber}:P${sheetRowNumber}`;
    const range = encodeURIComponent(rangeLiteral);
    const response = await this.fetchImpl(
      `${SHEETS_API_BASE}/${this.spreadsheetId}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ range: rangeLiteral, values: [row] }),
      },
    );

    if (!response.ok) {
      throw await toSheetsApiError('行更新', response);
    }
  }

  /** 指定した行番号(1始まり・シート上の行番号)を削除する。結合テストの後始末用途 */
  async deleteRow(sheetRowNumber: number, sheetId: number): Promise<void> {
    const token = await this.getToken();
    const response = await this.fetchImpl(`${SHEETS_API_BASE}/${this.spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowNumber - 1,
                endIndex: sheetRowNumber,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw await toSheetsApiError('行削除', response);
    }
  }

  /** 「案件進捗」シートのsheetId(数値)を取得する。deleteRow等のシート単位操作に使う */
  async getSheetId(): Promise<number> {
    const token = await this.getToken();
    const response = await this.fetchImpl(`${SHEETS_API_BASE}/${this.spreadsheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw await toSheetsApiError('シートメタデータ取得', response);
    }

    const data = (await response.json()) as SpreadsheetMetadata;
    const target = (data.sheets ?? []).find((sheet) => sheet.properties.title === SHEET_NAME);
    if (!target) {
      throw new Error(`シート「${SHEET_NAME}」が見つかりません`);
    }
    return target.properties.sheetId;
  }

  private async getToken(): Promise<string> {
    return fetchAccessToken(this.serviceAccount, this.fetchImpl);
  }
}

interface SpreadsheetMetadata {
  sheets?: { properties: { sheetId: number; title: string } }[];
}

function assertRowLength(row: string[]): void {
  if (row.length !== COLUMN_COUNT) {
    throw new Error(`行データの列数が不正です(期待=${COLUMN_COUNT}, 実際=${row.length})`);
  }
}

async function toSheetsApiError(action: string, response: Response): Promise<SheetsApiError> {
  const body = await response.text();
  return new SheetsApiError(`Google Sheets API ${action}エラー(status=${response.status})`, response.status, body);
}
