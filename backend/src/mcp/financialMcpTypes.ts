/**
 * 財務系MCP(cloud_proxy・既存8ツール)が返す生のレスポンス型。
 *
 * これらのMCPはClaude Codeのツール呼び出し経由でのみ到達可能(通常のHTTPクライアントから
 * 直接呼び出すことはできない)。そのため本バックエンドはMCPを都度呼び出すのではなく、
 * Claude Codeが実際にMCPを呼び出した結果(生JSON)をこのモジュールの型で受け取り、
 * `mcp/ingest.ts` の関数でローカルDB(`db/clientStore.ts`)に取り込む方式を取る。
 * (詳細な設計判断は `db/clientStore.ts` 冒頭コメントを参照)
 */

/** save_client_record のレスポンス */
export interface SaveClientRecordResult {
  id: string;
  name: string;
  industry: string;
  employeeCount: number;
  /** MM-DD形式(例: "03-31") */
  fiscalYearEnd: string;
  riskLevel: string;
  createdAt: string;
}

/** list_client_history が返す診断履歴1件分(診断が実施されたクライアントのみ含まれる) */
export interface ClientHistoryRecord {
  id: string;
  clientId: string;
  clientName: string;
  workingCapital: number;
  riskLevel: string;
  costReductionPotential: number;
  createdAt: string;
}

/** remind_missing_hearing_items が返す未回答項目1件分 */
export interface MissingHearingItem {
  category: string;
  questionId: string;
  label: string;
}

/** generate_proposal_draft のレスポンス */
export interface GenerateProposalDraftResult {
  id: string;
  clientId: string;
  diagnosisId: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
