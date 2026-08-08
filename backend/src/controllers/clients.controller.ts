import type { Request, Response } from 'express';
import type { ClientStore } from '../db/clientStore.js';
import { buildClientList } from '../services/clientAggregation.service.js';

/**
 * GET /api/clients のハンドラを生成する。
 * ClientStoreを注入式にすることで、テストでは一時ファイル/フィクスチャを指す
 * ストアを渡して検証できる(サーバー起動時は`app.ts`が本番用ストアを注入する)。
 */
export function createGetClients(store: ClientStore) {
  return function getClients(_req: Request, res: Response): void {
    const snapshots = store.listAll();
    const clients = buildClientList(snapshots);
    res.status(200).json(clients);
  };
}
