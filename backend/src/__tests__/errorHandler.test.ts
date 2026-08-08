import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { errorHandler } from '../app.js';

function createMockResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  it('Errorインスタンスを渡すと500とエラーメッセージのJSONを返す', () => {
    const res = createMockResponse();
    const next = vi.fn();

    errorHandler(new Error('想定外の例外'), {} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'サーバー内部でエラーが発生しました' });
  });

  it('Error以外の値を渡しても500を返す(型不問でクラッシュしない)', () => {
    const res = createMockResponse();
    const next = vi.fn();

    errorHandler('文字列エラー', {} as Request, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
