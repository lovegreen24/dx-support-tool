import express, { type Express } from 'express';
import healthRoutes from './routes/health.routes.js';
import { createClientsRouter } from './routes/clients.routes.js';
import { createCaseProgressRouter } from './routes/caseProgress.routes.js';
import { ClientStore } from './db/clientStore.js';
import { CaseProgressSheetClient, loadCaseProgressSheetConfig } from './google/caseProgressSheetClient.js';
import { config } from './config/index.js';

export interface AppDependencies {
  /** 未指定時は`config.clientStoreFilePath`を指すストアを生成する(本番デフォルト) */
  clientStore?: ClientStore;
  /**
   * `/api/case-progress`が使う`CaseProgressSheetClient`の生成関数。未指定時は
   * `config`(GOOGLE_SHEETS_ID/GOOGLE_SERVICE_ACCOUNT_JSON)から生成する(本番デフォルト)。
   * 関数として注入するのは、config未設定による例外をリクエスト時まで遅延させるため
   * (詳細は`controllers/caseProgress.controller.ts`冒頭コメント参照)。
   */
  caseProgressSheetClientFactory?: () => CaseProgressSheetClient;
}

/**
 * Expressアプリケーションを組み立てる。
 * server.tsから分離することで、テストではlisten()せずに直接importして検証できる。
 * 依存(ClientStore等)は注入式にし、テストでは一時ファイルを指すストアに差し替え可能にする。
 */
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();
  const clientStore = deps.clientStore ?? new ClientStore(config.clientStoreFilePath);
  const caseProgressSheetClientFactory =
    deps.caseProgressSheetClientFactory ?? (() => new CaseProgressSheetClient(loadCaseProgressSheetConfig(config)));

  app.use('/api/health', healthRoutes);
  app.use('/api/clients', createClientsRouter(clientStore));
  app.use('/api/case-progress', createCaseProgressRouter(caseProgressSheetClientFactory));

  return app;
}
