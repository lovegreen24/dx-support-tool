import type { ApprovalStep, ApprovalStepStatus, CaseProgress } from '../types/index.js';

/**
 * 「案件進捗」シート(案件管理MCP/M-010が読み書きするGoogleスプレッドシート)の生データ行を
 * フロントエンド契約の`CaseProgress`型に変換する純粋関数群。I/O(HTTP呼び出し)は一切行わないため、
 * 決め打ちの行データだけでテスト可能(functional core)。
 *
 * シート列構成(A〜P・16列。ヘッダー行はA2:Pの範囲取得で除外済み):
 *   0:case_id, 1:client_id, 2:client_name,
 *   3〜8:step_1_status〜step_6_status, 9〜14:step_1_approved_at〜step_6_approved_at, 15:updated_at
 */

/**
 * 6承認ポイントの固定順序(ラベル)。
 * `mcp-servers/case-management/src/constants.ts`のAPPROVAL_POINT_LABELS、
 * E2E仕様書DASH-021、フロントエンド型`ApprovalStep`(frontend/src/types/index.ts)と一致させること。
 */
export const APPROVAL_POINT_LABELS = [
  'クライアント登録',
  '決算書解析',
  'ヒアリング回収',
  '財務分析',
  'ベンチマーク比較',
  '提案書生成',
] as const;

const STEP_COUNT = APPROVAL_POINT_LABELS.length;
const STATUS_START_INDEX = 3;
const APPROVED_AT_START_INDEX = STATUS_START_INDEX + STEP_COUNT;

function normalizeStatus(value: string | undefined): ApprovalStepStatus {
  if (value === 'completed' || value === 'active' || value === 'pending') {
    return value;
  }
  return 'pending';
}

/** 「案件進捗」シート1行(A〜P列・16セル)をCaseProgressへ変換する */
export function rowToCaseProgress(row: string[]): CaseProgress {
  const steps: ApprovalStep[] = APPROVAL_POINT_LABELS.map((label, index) => {
    const approvedAt = row[APPROVED_AT_START_INDEX + index];
    const step: ApprovalStep = {
      label,
      status: normalizeStatus(row[STATUS_START_INDEX + index]),
    };
    if (approvedAt) {
      step.approvedAt = approvedAt;
    }
    return step;
  });

  return {
    caseId: row[0] ?? '',
    clientName: row[2] ?? '',
    steps,
  };
}

/**
 * シート全データ行からCaseProgress一覧を組み立てる。
 * case_id(A列)が空の行(末尾の未使用行など)は除外する。
 */
export function buildCaseProgressList(rows: string[][]): CaseProgress[] {
  return rows.filter((row) => row[0]).map(rowToCaseProgress);
}
