import { jest } from '@jest/globals';
import { CaseSheetClient, SheetsApiError } from '../../src/api/sheets.js';
import type { ServiceAccountCredentials } from '../../src/types.js';

/**
 * JWT署名(RSASSA-PKCS1-v1_5)経路を実際に通すため、テスト用のRSA鍵ペアを都度生成する。
 * 署名内容そのものの検証はauth.test.ts側で実施済みのため、ここではCaseSheetClientの
 * リクエスト内容(URL/メソッド/ボディ)の検証に専念する。
 */
async function buildCredentialsWithRealKey(): Promise<ServiceAccountCredentials> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['sign', 'verify'],
  );
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
  return {
    client_email: 'sa@example.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----\n`,
  };
}

function mockFetchRoutingToken(sheetsResponse: unknown, sheetsOk = true, sheetsStatus = 200) {
  return jest.fn(async (url: string) => {
    if (url === 'https://oauth2.googleapis.com/token') {
      return { ok: true, json: async () => ({ access_token: 'test-access-token' }) } as Response;
    }
    return {
      ok: sheetsOk,
      status: sheetsStatus,
      json: async () => sheetsResponse,
      text: async () => JSON.stringify(sheetsResponse),
    } as Response;
  });
}

describe('CaseSheetClient', () => {
  it('listDataRowsはA2:P範囲を取得しvaluesを返す', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({ values: [['CASE-1', 'C-001', '名前']] });
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    const rows = await client.listDataRows();

    expect(rows).toEqual([['CASE-1', 'C-001', '名前']]);
    const sheetsCall = mockFetch.mock.calls.find(([url]) => (url as string).includes('/values/'));
    expect(sheetsCall?.[0]).toContain(encodeURIComponent('案件進捗!A2:P'));
  });

  it('valuesが無いレスポンスの場合は空配列を返す', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({});
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    expect(await client.listDataRows()).toEqual([]);
  });

  it('appendRowは16列でない行を渡すとエラーを投げる(API呼び出し前に弾く)', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({});
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    await expect(client.appendRow(['too', 'few'])).rejects.toThrow(/列数が不正/);
  });

  it('appendRowはvalues:appendエンドポイントへPOSTする', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({});
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);
    const row = Array.from({ length: 16 }, (_, i) => `col${i}`);

    await client.appendRow(row);

    const sheetsCall = mockFetch.mock.calls.find(([url]) => (url as string).includes(':append'));
    expect(sheetsCall).toBeDefined();
    const [url, init] = sheetsCall as [string, RequestInit];
    expect(url).toContain('valueInputOption=RAW');
    expect(JSON.parse(init.body as string)).toEqual({ values: [row] });
  });

  it('updateRowは指定行のみをPUTで更新する', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({});
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);
    const row = Array.from({ length: 16 }, (_, i) => `col${i}`);

    await client.updateRow(3, row);

    const sheetsCall = mockFetch.mock.calls.find(([, init]) => (init as RequestInit)?.method === 'PUT');
    expect(sheetsCall).toBeDefined();
    const [url, init] = sheetsCall as [string, RequestInit];
    expect(url).toContain(encodeURIComponent('案件進捗!A3:P3'));
    expect(JSON.parse(init.body as string).values).toEqual([row]);
  });

  it('Sheets APIがエラーを返した場合はSheetsApiErrorを投げる', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({ error: 'denied' }, false, 403);
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    await expect(client.listDataRows()).rejects.toThrow(SheetsApiError);
  });

  it('getSheetIdは「案件進捗」シートのsheetIdを返す', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({
      sheets: [
        { properties: { sheetId: 111, title: '別シート' } },
        { properties: { sheetId: 222, title: '案件進捗' } },
      ],
    });
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    expect(await client.getSheetId()).toBe(222);
  });

  it('getSheetIdは「案件進捗」シートが見つからない場合はエラーを投げる', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({ sheets: [{ properties: { sheetId: 111, title: '別シート' } }] });
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    await expect(client.getSheetId()).rejects.toThrow(/見つかりません/);
  });

  it('deleteRowはbatchUpdateでdeleteDimensionリクエストを送る', async () => {
    const credentials = await buildCredentialsWithRealKey();
    const mockFetch = mockFetchRoutingToken({});
    const client = new CaseSheetClient('sheet-id', credentials, mockFetch as unknown as typeof fetch);

    await client.deleteRow(5, 0);

    const sheetsCall = mockFetch.mock.calls.find(([url]) => (url as string).includes(':batchUpdate'));
    expect(sheetsCall).toBeDefined();
    const [, init] = sheetsCall as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.requests[0].deleteDimension.range).toEqual({
      sheetId: 0,
      dimension: 'ROWS',
      startIndex: 4,
      endIndex: 5,
    });
  });
});
