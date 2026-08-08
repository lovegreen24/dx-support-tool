import type { Request, Response } from 'express';
import type { CaseProgressSheetClient } from '../google/caseProgressSheetClient.js';
import { buildCaseProgressList } from '../services/caseProgressAggregation.service.js';

/**
 * GET /api/case-progress のハンドラを生成する。
 * `CaseProgressSheetClient`の生成自体を関数(getSheetClient)として注入することで、
 * 環境変数未設定(GOOGLE_SHEETS_ID等)による例外の発生タイミングをリクエスト時まで遅延させる。
 * これにより、Google認証情報が無い環境でも他のエンドポイント(/api/health・/api/clients等)や
 * それらのテストにおけるapp起動自体は影響を受けない。
 */
export function createGetCaseProgress(getSheetClient: () => CaseProgressSheetClient) {
  return async function getCaseProgress(_req: Request, res: Response): Promise<void> {
    try {
      const client = getSheetClient();
      const rows = await client.listDataRows();
      const cases = buildCaseProgressList(rows);
      res.status(200).json(cases);
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      res.status(502).json({ error: '案件進捗の取得に失敗しました', detail: message });
    }
  };
}
