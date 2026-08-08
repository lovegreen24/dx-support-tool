import { defineConfig } from 'vitest/config';

/**
 * 実際の外部API(Google Sheets等)に接続するテスト(`*.external.test.ts`)専用の実行設定。
 * `npm run test:integration:external`で使う。実行にはGOOGLE_SHEETS_ID /
 * GOOGLE_SERVICE_ACCOUNT_JSON等の環境変数を実行時にシェルでexportする必要がある
 * (.env系ファイルは作成しない)。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.external.test.ts'],
  },
});
