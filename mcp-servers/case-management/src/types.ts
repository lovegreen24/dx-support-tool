/**
 * 案件管理MCP(M-010)の型定義。
 * Googleスプレッドシート「案件進捗」シートを単一の真実源とし、本MCP側では別途永続化を持たない。
 */

export type ApprovalStepStatus = 'completed' | 'active' | 'pending';

export interface ApprovalStepRecord {
  label: string;
  status: ApprovalStepStatus;
  approved_at: string | null;
}

/** 「案件進捗」シート1行分を正規化した形 */
export interface CaseProgressRecord {
  case_id: string;
  client_id: string;
  client_name: string;
  steps: ApprovalStepRecord[];
  updated_at: string;
}

export interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
}

export interface CaseManagementConfig {
  spreadsheetId: string;
  serviceAccount: ServiceAccountCredentials;
}

/** record_case_approvalツールの入力 */
export interface RecordCaseApprovalInput {
  case_id: string;
  client_id: string;
  client_name?: string;
  step: number;
  status?: ApprovalStepStatus;
  approved_at?: string;
}

export interface RecordCaseApprovalOutput {
  created: boolean;
  case: CaseProgressRecord;
}

/** list_case_progressツールの入力 */
export interface ListCaseProgressInput {
  case_id?: string;
  client_id?: string;
}

export interface ListCaseProgressOutput {
  total: number;
  cases: CaseProgressRecord[];
}
