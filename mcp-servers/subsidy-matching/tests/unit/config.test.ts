import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('NOTION_TOKENとNOTION_DATABASE_IDが設定されていれば読み込める', () => {
    const config = loadConfig({
      NOTION_TOKEN: 'secret_xxx',
      NOTION_DATABASE_ID: 'db-id',
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({ notionToken: 'secret_xxx', notionDatabaseId: 'db-id' });
  });

  it('NOTION_TOKENが未設定の場合はエラーを投げる', () => {
    expect(() => loadConfig({ NOTION_DATABASE_ID: 'db-id' } as NodeJS.ProcessEnv)).toThrow(
      /NOTION_TOKEN/,
    );
  });

  it('NOTION_DATABASE_IDが未設定の場合はエラーを投げる', () => {
    expect(() => loadConfig({ NOTION_TOKEN: 'secret_xxx' } as NodeJS.ProcessEnv)).toThrow(
      /NOTION_DATABASE_ID/,
    );
  });

  it('両方未設定の場合は両方の変数名をエラーメッセージに含める', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/NOTION_TOKEN.*NOTION_DATABASE_ID/);
  });
});
