import { loadConfig } from '../../src/config.js';

describe('loadConfig', () => {
  it('DATABASE_URLとSUPABASE_SERVICE_KEYが揃っていれば設定を返す', () => {
    const config = loadConfig({
      DATABASE_URL: 'postgresql://example',
      SUPABASE_SERVICE_KEY: 'service-key',
    } as NodeJS.ProcessEnv);

    expect(config).toEqual({
      databaseUrl: 'postgresql://example',
      supabaseServiceKey: 'service-key',
    });
  });

  it('DATABASE_URLが未設定だとエラーを投げる', () => {
    expect(() =>
      loadConfig({ SUPABASE_SERVICE_KEY: 'service-key' } as NodeJS.ProcessEnv),
    ).toThrow(/DATABASE_URL/);
  });

  it('SUPABASE_SERVICE_KEYが未設定だとエラーを投げる', () => {
    expect(() =>
      loadConfig({ DATABASE_URL: 'postgresql://example' } as NodeJS.ProcessEnv),
    ).toThrow(/SUPABASE_SERVICE_KEY/);
  });

  it('両方とも未設定だと両方の変数名を含むエラーを投げる', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL.*SUPABASE_SERVICE_KEY/);
  });
});
