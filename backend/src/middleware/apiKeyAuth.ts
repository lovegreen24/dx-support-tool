import type { NextFunction, Request, Response } from 'express';

const API_KEY_HEADER = 'x-api-key';

/**
 * `/api/clients`・`/api/case-progress`用の簡易API認証。
 * ダッシュボードのsessionStorage保護(フロントエンドのみ)はバックエンドAPIへの直接アクセスを
 * 防げないため、フロントエンドと同一のAPI_KEYをX-API-Keyヘッダーで要求する。
 */
export function createApiKeyAuth(getApiKey: () => string | undefined) {
  return function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
    const expected = getApiKey();
    if (!expected) {
      res.status(500).json({ error: 'サーバー側でAPI_KEYが未設定です' });
      return;
    }
    if (req.header(API_KEY_HEADER) !== expected) {
      res.status(401).json({ error: '認証に失敗しました' });
      return;
    }
    next();
  };
}
