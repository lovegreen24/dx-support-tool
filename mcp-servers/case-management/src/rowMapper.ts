import { APPROVAL_POINT_LABELS, APPROVAL_STEP_COUNT } from './constants.js';
import type { ApprovalStepStatus, CaseProgressRecord } from './types.js';

/**
 * 「案件進捗」シートの1行(文字列配列・A〜P列)とCaseProgressRecordの相互変換。
 * 外部I/Oを含まない純粋関数のみを置く(functional core)。
 */

const STATUS_START_INDEX = 3;
const APPROVED_AT_START_INDEX = 3 + APPROVAL_STEP_COUNT;
const UPDATED_AT_INDEX = 3 + APPROVAL_STEP_COUNT * 2;

export function rowToRecord(row: string[]): CaseProgressRecord {
  const steps = APPROVAL_POINT_LABELS.map((label, index) => ({
    label,
    status: normalizeStatus(row[STATUS_START_INDEX + index]),
    approved_at: row[APPROVED_AT_START_INDEX + index] || null,
  }));

  return {
    case_id: row[0] ?? '',
    client_id: row[1] ?? '',
    client_name: row[2] ?? '',
    steps,
    updated_at: row[UPDATED_AT_INDEX] ?? '',
  };
}

export function recordToRow(record: CaseProgressRecord): string[] {
  const statusCells = record.steps.map((step) => step.status);
  const approvedAtCells = record.steps.map((step) => step.approved_at ?? '');
  return [record.case_id, record.client_id, record.client_name, ...statusCells, ...approvedAtCells, record.updated_at];
}

/** 新規案件の初期レコードを作る。全ステップ`pending`で開始する */
export function buildInitialRecord(
  caseId: string,
  clientId: string,
  clientName: string,
  nowIso: string,
): CaseProgressRecord {
  return {
    case_id: caseId,
    client_id: clientId,
    client_name: clientName,
    steps: APPROVAL_POINT_LABELS.map((label) => ({
      label,
      status: 'pending' as ApprovalStepStatus,
      approved_at: null,
    })),
    updated_at: nowIso,
  };
}

/**
 * 指定ステップ(1始まり)のステータスを更新する。ステータスが`completed`になった場合、
 * 次ステップが`pending`のままなら`active`へ繰り上げる(承認フローの自然な進行を表現)。
 */
export function applyStepUpdate(
  record: CaseProgressRecord,
  step: number,
  status: ApprovalStepStatus,
  approvedAt: string | null,
  nowIso: string,
): CaseProgressRecord {
  const stepIndex = step - 1;
  const steps = record.steps.map((current, index) => {
    if (index !== stepIndex) return current;
    return { ...current, status, approved_at: status === 'completed' ? approvedAt : current.approved_at };
  });

  if (status === 'completed' && stepIndex + 1 < steps.length && steps[stepIndex + 1].status === 'pending') {
    steps[stepIndex + 1] = { ...steps[stepIndex + 1], status: 'active' };
  }

  return { ...record, steps, updated_at: nowIso };
}

function normalizeStatus(value: string | undefined): ApprovalStepStatus {
  if (value === 'completed' || value === 'active' || value === 'pending') return value;
  return 'pending';
}
