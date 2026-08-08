import { HEADER_ROW_COUNT, APPROVAL_STEP_COUNT } from '../constants.js';
import { loadConfig } from '../config.js';
import { CaseSheetClient } from '../api/sheets.js';
import { applyStepUpdate, buildInitialRecord, recordToRow, rowToRecord } from '../rowMapper.js';
import type { ApprovalStepStatus, RecordCaseApprovalInput, RecordCaseApprovalOutput } from '../types.js';

export const RECORD_CASE_APPROVAL_TOOL_NAME = 'record_case_approval';

export const recordCaseApprovalInputSchema = {
  type: 'object',
  properties: {
    case_id: {
      type: 'string',
      description: '案件ID。既存案件なら該当行を更新し、未登録なら新規行を作成する',
    },
    client_id: {
      type: 'string',
      description: 'クライアントID(財務系MCP発行のIDを共通利用)',
    },
    client_name: {
      type: 'string',
      description: 'クライアント名(表示用)。新規案件作成時は必須。既存案件更新時に指定すると表示名を上書きする',
    },
    step: {
      type: 'number',
      description: '承認ポイント番号(1=クライアント登録 〜 6=提案書生成)',
    },
    status: {
      type: 'string',
      enum: ['completed', 'active', 'pending'],
      description: 'ステップのステータス(既定completed)。completedにすると次ステップがpendingならactiveへ自動繰り上げする',
    },
    approved_at: {
      type: 'string',
      description: '承認日時(ISO8601)。省略時、status=completedなら現在時刻を使用する',
    },
  },
  required: ['case_id', 'client_id', 'step'],
  additionalProperties: false,
} as const;

/**
 * record_case_approvalツールのハンドラ(imperative shell)。
 * Googleスプレッドシート「案件進捗」シートから対象案件の行を検索し、無ければ作成、
 * 有れば純粋関数applyStepUpdateで新しいレコードを組み立ててから書き戻す。
 */
export async function handleRecordCaseApproval(input: RecordCaseApprovalInput): Promise<RecordCaseApprovalOutput> {
  validateInput(input);

  const config = loadConfig();
  const client = new CaseSheetClient(config.spreadsheetId, config.serviceAccount);
  const nowIso = new Date().toISOString();
  const status: ApprovalStepStatus = input.status ?? 'completed';
  const approvedAt = status === 'completed' ? (input.approved_at ?? nowIso) : null;

  const rows = await client.listDataRows();
  const matchedIndex = rows.findIndex((row) => row[0] === input.case_id);

  if (matchedIndex === -1) {
    if (!input.client_name) {
      throw new Error('client_nameは新規案件作成時に必須です');
    }
    const initial = buildInitialRecord(input.case_id, input.client_id, input.client_name, nowIso);
    const updated = applyStepUpdate(initial, input.step, status, approvedAt, nowIso);
    await client.appendRow(recordToRow(updated));
    return { created: true, case: updated };
  }

  const existing = rowToRecord(rows[matchedIndex]);
  const merged = { ...existing, client_name: input.client_name ?? existing.client_name };
  const updated = applyStepUpdate(merged, input.step, status, approvedAt, nowIso);
  const sheetRowNumber = HEADER_ROW_COUNT + matchedIndex + 1;
  await client.updateRow(sheetRowNumber, recordToRow(updated));
  return { created: false, case: updated };
}

function validateInput(input: RecordCaseApprovalInput): void {
  if (!input.case_id || typeof input.case_id !== 'string') {
    throw new Error('case_idは必須の文字列です');
  }
  if (!input.client_id || typeof input.client_id !== 'string') {
    throw new Error('client_idは必須の文字列です');
  }
  if (!Number.isInteger(input.step) || input.step < 1 || input.step > APPROVAL_STEP_COUNT) {
    throw new Error(`stepは1〜${APPROVAL_STEP_COUNT}の整数である必要があります`);
  }
  if (input.status && !['completed', 'active', 'pending'].includes(input.status)) {
    throw new Error('statusはcompleted/active/pendingのいずれかである必要があります');
  }
}
