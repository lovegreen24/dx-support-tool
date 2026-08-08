import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    // *.external.test.ts(実Google Sheets等の外部APIに接続するテスト)はデフォルト実行対象から除外する。
    // 実クレデンシャルが無い環境(pre-push hook等)でも`npm test`が失敗しないようにするため。
    // 実行するには`npm run test:integration:external`(vitest.external.config.ts参照)を使う。
    exclude: [...configDefaults.exclude, 'src/__tests__/**/*.external.test.ts'],
  },
});
