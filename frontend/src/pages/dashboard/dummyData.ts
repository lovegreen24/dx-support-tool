import type { ApprovalStep, CaseProgress, Client } from '../../types';

/**
 * ダミークライアント一覧
 * TODO: 案件管理MCP(Googleスプレッドシート連携)実装後、実データ取得に置き換える
 */
export const DUMMY_CLIENTS: Client[] = [
  {
    clientId: 'C-001',
    name: '株式会社サンライズ商事',
    industry: '小売業',
    employeeCount: 24,
    fiscalYearEnd: '3月',
    hearingCompletionRate: 100,
    proposalStatus: 'completed',
  },
  {
    clientId: 'C-002',
    name: 'マツダ精密工業株式会社',
    industry: '製造業',
    employeeCount: 45,
    fiscalYearEnd: '9月',
    hearingCompletionRate: 80,
    proposalStatus: 'in_progress',
  },
  {
    clientId: 'C-003',
    name: '有限会社グリーンフィールズ',
    industry: '農業',
    employeeCount: 12,
    fiscalYearEnd: '12月',
    hearingCompletionRate: 60,
    proposalStatus: 'in_progress',
  },
  {
    clientId: 'C-004',
    name: '株式会社ベイエリア物流',
    industry: '運輸業',
    employeeCount: 68,
    fiscalYearEnd: '3月',
    hearingCompletionRate: 30,
    proposalStatus: 'not_started',
  },
  {
    clientId: 'C-005',
    name: 'こもれび介護サービス株式会社',
    industry: '医療福祉',
    employeeCount: 33,
    fiscalYearEnd: '6月',
    hearingCompletionRate: 100,
    proposalStatus: 'in_progress',
  },
];

/** 案件管理MCP(Googleスプレッドシート)で管理する6承認ポイントの定義 */
const APPROVAL_POINT_LABELS = [
  'クライアント登録',
  '決算書解析',
  'ヒアリング回収',
  '財務分析',
  'ベンチマーク比較',
  '提案書生成',
] as const;

function buildSteps(completedCount: number, approvedAtBase: string[]): ApprovalStep[] {
  return APPROVAL_POINT_LABELS.map((label, index) => {
    if (index < completedCount) {
      return { label, status: 'completed', approvedAt: approvedAtBase[index] };
    }
    if (index === completedCount) {
      return { label, status: 'active' };
    }
    return { label, status: 'pending' };
  });
}

/**
 * ダミー案件進捗・承認履歴
 * TODO: 案件管理MCP(Googleスプレッドシート連携)実装後、実データ取得に置き換える
 */
export const DUMMY_CASE_PROGRESS: CaseProgress[] = [
  {
    caseId: 'P-001',
    clientName: '株式会社サンライズ商事',
    steps: buildSteps(6, ['2026/06/02', '2026/06/10', '2026/06/18', '2026/07/01', '2026/07/15', '2026/07/28']),
  },
  {
    caseId: 'P-002',
    clientName: 'マツダ精密工業株式会社',
    steps: buildSteps(3, ['2026/07/03', '2026/07/12', '2026/07/22']),
  },
  {
    caseId: 'P-003',
    clientName: '株式会社ベイエリア物流',
    steps: buildSteps(1, ['2026/08/01']),
  },
];
