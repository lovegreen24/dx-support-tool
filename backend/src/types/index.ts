export interface Client {
  clientId: string;
  name: string;
  industry: string;
  employeeCount: number;
  fiscalYearEnd: string;
  hearingCompletionRate: number;
  proposalStatus: 'not_started' | 'in_progress' | 'completed';
}

/** 案件管理MCP(Googleスプレッドシート)で管理する承認ポイント1件分のステータス */
export type ApprovalStepStatus = 'completed' | 'active' | 'pending';

/** 6承認ポイントのうち1ポイント分の確定履歴 */
export interface ApprovalStep {
  label: string;
  status: ApprovalStepStatus;
  approvedAt?: string;
}

/** 案件情報 + 6承認ポイントの確定履歴(案件管理MCP/Googleスプレッドシート由来) */
export interface CaseProgress {
  caseId: string;
  clientName: string;
  steps: ApprovalStep[];
}

/** フロントエンドAPIエンドポイントパス定義(Phase 9でAPI接続実装時に使用) */
export const API_PATHS = {
  CLIENTS: '/api/clients',
  CASE_PROGRESS: '/api/case-progress',
} as const;
