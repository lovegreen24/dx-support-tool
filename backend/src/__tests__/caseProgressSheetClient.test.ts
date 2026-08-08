import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  CaseProgressSheetClient,
  SheetsApiError,
  loadCaseProgressSheetConfig,
} from '../google/caseProgressSheetClient.js';

describe('loadCaseProgressSheetConfig', () => {
  it('GOOGLE_SHEETS_ID/GOOGLE_SERVICE_ACCOUNT_JSONが両方揃っていれば設定を組み立てる', () => {
    const serviceAccountJson = JSON.stringify({ client_email: 'sa@example.com', private_key: 'PEM' });
    const config = loadCaseProgressSheetConfig({
      googleSheetsId: 'SHEET-ID',
      googleServiceAccountJson: serviceAccountJson,
    });

    expect(config).toEqual({
      spreadsheetId: 'SHEET-ID',
      serviceAccount: { clientEmail: 'sa@example.com', privateKey: 'PEM' },
    });
  });

  it('GOOGLE_SHEETS_IDが未設定ならエラーを投げる', () => {
    const googleServiceAccountJson = JSON.stringify({ client_email: 'a', private_key: 'b' });
    expect(() => loadCaseProgressSheetConfig({ googleServiceAccountJson })).toThrow(/GOOGLE_SHEETS_ID/);
  });

  it('GOOGLE_SERVICE_ACCOUNT_JSONが未設定ならエラーを投げる', () => {
    expect(() => loadCaseProgressSheetConfig({ googleSheetsId: 'SHEET-ID' })).toThrow(/GOOGLE_SERVICE_ACCOUNT_JSON/);
  });

  it('両方未設定なら両方の変数名を含むエラーを投げる', () => {
    expect(() => loadCaseProgressSheetConfig({})).toThrow(/GOOGLE_SHEETS_ID.*GOOGLE_SERVICE_ACCOUNT_JSON/);
  });
});

function generateTestPrivateKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return privateKey;
}

describe('CaseProgressSheetClient.listDataRows', () => {
  const config = {
    spreadsheetId: 'SHEET-ID',
    serviceAccount: { clientEmail: 'sa@example.com', privateKey: generateTestPrivateKey() },
  };

  it('トークン取得→values.get の順にfetchし、valuesをそのまま返す', async () => {
    const calledUrls: string[] = [];
    const fakeFetch = (async (url: string) => {
      calledUrls.push(url.toString());
      if (url.toString().includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
      }
      return new Response(JSON.stringify({ values: [['CASE-1', 'CLIENT-1', '株式会社テスト']] }), { status: 200 });
    }) as typeof fetch;

    const client = new CaseProgressSheetClient(config, fakeFetch);
    const rows = await client.listDataRows();

    expect(rows).toEqual([['CASE-1', 'CLIENT-1', '株式会社テスト']]);
    expect(calledUrls[0]).toContain('oauth2.googleapis.com/token');
    expect(calledUrls[1]).toContain('SHEET-ID/values/');
    expect(calledUrls[1]).toContain('%E6%A1%88%E4%BB%B6%E9%80%B2%E6%8D%97'); // 「案件進捗」のURLエンコード
  });

  it('valuesが無い(空シート)場合は空配列を返す', async () => {
    const fakeFetch = (async (url: string) => {
      if (url.toString().includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const client = new CaseProgressSheetClient(config, fakeFetch);
    expect(await client.listDataRows()).toEqual([]);
  });

  it('Sheets APIがエラーを返した場合はSheetsApiErrorを投げる', async () => {
    const fakeFetch = (async (url: string) => {
      if (url.toString().includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'token-123' }), { status: 200 });
      }
      return new Response('PERMISSION_DENIED', { status: 403 });
    }) as typeof fetch;

    const client = new CaseProgressSheetClient(config, fakeFetch);
    await expect(client.listDataRows()).rejects.toThrow(SheetsApiError);
  });
});
