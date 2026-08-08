/**
 * 補助金マッチングMCP(M-011)の型定義。
 * データはNotion補助金台帳データベースを単一の真実源とし、
 * 本MCP側では永続化を持たない(集約・照合のみ)。
 */

/** Notion補助金台帳の1レコードを正規化した形 */
export interface SubsidyRecord {
  pageId: string;
  subsidyName: string;
  targetIndustries: string[];
  targetConditions: string;
  organization: string;
  subsidyAmount: string;
  applicationDeadline: string | null;
  status: SubsidyStatus;
  detailUrl: string | null;
  notes: string;
}

export type SubsidyStatus = '募集中' | '締切間近' | '受付終了' | '確認中' | string;

/** クライアント側の照合条件 */
export interface MatchCriteria {
  clientId: string;
  industry: string;
  employeeCount?: number;
  keywords?: string[];
  includeClosed?: boolean;
}

/** 1件の照合結果 */
export interface MatchResult {
  pageId: string;
  subsidyName: string;
  organization: string;
  targetIndustries: string[];
  targetConditions: string;
  subsidyAmount: string;
  applicationDeadline: string | null;
  status: SubsidyStatus;
  detailUrl: string | null;
  notes: string;
  matchScore: number;
  matchReasons: string[];
}

export interface SuggestMatchingSubsidiesInput {
  client_id: string;
  industry: string;
  employee_count?: number;
  keywords?: string[];
  include_closed?: boolean;
  max_results?: number;
}

export interface SuggestMatchingSubsidiesOutput {
  client_id: string;
  queried_at: string;
  total_candidates: number;
  matches: MatchResult[];
}
