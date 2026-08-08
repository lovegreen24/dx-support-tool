import { loadConfig } from '../../src/config.js';

const VALID_SERVICE_ACCOUNT_JSON = JSON.stringify({
  client_email: 'case-management-mcp@example.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
});

describe('loadConfig', () => {
  it('GOOGLE_SHEETS_IDとGOOGLE_SERVICE_ACCOUNT_JSONが設定されていれば読み込める', () => {
    const config = loadConfig({
      GOOGLE_SHEETS_ID: 'sheet-id',
      GOOGLE_SERVICE_ACCOUNT_JSON: VALID_SERVICE_ACCOUNT_JSON,
    } as NodeJS.ProcessEnv);

    expect(config.spreadsheetId).toBe('sheet-id');
    expect(config.serviceAccount).toEqual({
      client_email: 'case-management-mcp@example.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n',
    });
  });

  it('GOOGLE_SHEETS_IDが未設定の場合はエラーを投げる', () => {
    expect(() =>
      loadConfig({ GOOGLE_SERVICE_ACCOUNT_JSON: VALID_SERVICE_ACCOUNT_JSON } as NodeJS.ProcessEnv),
    ).toThrow(/GOOGLE_SHEETS_ID/);
  });

  it('GOOGLE_SERVICE_ACCOUNT_JSONが未設定の場合はエラーを投げる', () => {
    expect(() => loadConfig({ GOOGLE_SHEETS_ID: 'sheet-id' } as NodeJS.ProcessEnv)).toThrow(
      /GOOGLE_SERVICE_ACCOUNT_JSON/,
    );
  });

  it('両方未設定の場合は両方の変数名をエラーメッセージに含める', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(
      /GOOGLE_SHEETS_ID.*GOOGLE_SERVICE_ACCOUNT_JSON/,
    );
  });

  it('GOOGLE_SERVICE_ACCOUNT_JSONが不正なJSONの場合はエラーを投げる', () => {
    expect(() =>
      loadConfig({ GOOGLE_SHEETS_ID: 'sheet-id', GOOGLE_SERVICE_ACCOUNT_JSON: '{not json' } as NodeJS.ProcessEnv),
    ).toThrow(/解析に失敗/);
  });

  it('GOOGLE_SERVICE_ACCOUNT_JSONにclient_email/private_keyが無い場合はエラーを投げる', () => {
    expect(() =>
      loadConfig({
        GOOGLE_SHEETS_ID: 'sheet-id',
        GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ foo: 'bar' }),
      } as NodeJS.ProcessEnv),
    ).toThrow(/client_email\/private_key/);
  });
});
