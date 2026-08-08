/**
 * 6承認ポイントの固定順序(ラベル)。
 * E2E仕様書 DASH-021(docs/e2e-specs/進捗ダッシュボード-e2e.md)のラベル順、
 * およびフロントエンド型`ApprovalStep`(frontend/src/types/index.ts)と一致させること。
 * この配列を全ての承認ポイント関連ロジックにおける単一の真実源とする。
 */
export const APPROVAL_POINT_LABELS = [
  'クライアント登録',
  '決算書解析',
  'ヒアリング回収',
  '財務分析',
  'ベンチマーク比較',
  '提案書生成',
] as const;

export const APPROVAL_STEP_COUNT = APPROVAL_POINT_LABELS.length;

/** Googleスプレッドシート「案件進捗」シートの構成(A1:P1ヘッダー行投入済み・16列) */
export const SHEET_NAME = '案件進捗';
export const HEADER_ROW_COUNT = 1;
// case_id/client_id/client_name(3) + status×6 + approved_at×6 + updated_at(1) = 16
export const COLUMN_COUNT = 3 + APPROVAL_STEP_COUNT * 2 + 1;
