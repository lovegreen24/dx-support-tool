import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes.js';
import metricsRoutes from './routes/metrics.routes.js';
import { createClientsRouter } from './routes/clients.routes.js';
import { createCaseProgressRouter } from './routes/caseProgress.routes.js';
import { ClientStore } from './db/clientStore.js';
import { CaseProgressSheetClient, loadCaseProgressSheetConfig } from './google/caseProgressSheetClient.js';
import { createApiKeyAuth } from './middleware/apiKeyAuth.js';
import { config } from './config/index.js';
import { logger } from './logger.js';

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
  /** `/api/clients`・`/api/case-progress`用のAPI_KEY。未指定時は`config.apiKey`を使う(本番デフォルト) */
  apiKey?: string;
}

/** ルート内で未捕捉の例外が発生した場合の最終防波堤(各コントローラは既に自前でtry-catchしているため通常は到達しない) */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const message = err instanceof Error ? err.message : '不明なエラー';
  logger.error('unhandled error', { message });
  res.status(500).json({ error: 'サーバー内部でエラーが発生しました' });
}

/**
 * Expressアプリケーションを組み立てる。
 * server.tsから分離することで、テストではlisten()せずに直接importして検証できる。
 * 依存(ClientStore等)は注入式にし、テストでは一時ファイルを指すストアに差し替え可能にする。
 */
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: config.frontendOrigin ? config.frontendOrigin.split(',') : true }));
  const clientStore = deps.clientStore ?? new ClientStore(config.clientStoreFilePath);
  const caseProgressSheetClientFactory =
    deps.caseProgressSheetClientFactory ?? (() => new CaseProgressSheetClient(loadCaseProgressSheetConfig(config)));
  const apiKey = deps.apiKey ?? config.apiKey;
  const apiKeyAuth = createApiKeyAuth(() => apiKey);

  app.use('/api/health', healthRoutes);
  app.use('/api/metrics', metricsRoutes);
  app.use('/api/clients', apiKeyAuth, createClientsRouter(clientStore));
  app.use('/api/case-progress', apiKeyAuth, createCaseProgressRouter(caseProgressSheetClientFactory));

  app.use(errorHandler);

  return app;
}
