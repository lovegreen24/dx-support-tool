import type { ClientStore } from '../db/clientStore.js';
import type {
  GenerateProposalDraftResult,
  MissingHearingItem,
  SaveClientRecordResult,
} from './financialMcpTypes.js';

/**
 * Claude Codeが財務系MCPを呼び出した生レスポンスをローカルDB(ClientStore)へ取り込むアダプタ群。
 * 各関数はMCPレスポンスの型をそのまま受け取る純粋な変換+書き込み処理であり、
 * MCP呼び出し自体は行わない(呼び出し元であるClaude Codeの責務)。
 */

/** save_client_record のレスポンスをクライアントプロフィールとして取り込む */
export function ingestClientProfile(store: ClientStore, result: SaveClientRecordResult): void {
  store.upsertProfile({
    clientId: result.id,
    name: result.name,
    industry: result.industry,
    employeeCount: result.employeeCount,
    fiscalYearEndMonthDay: result.fiscalYearEnd,
  });
}

/** remind_missing_hearing_items のレスポンス(未回答項目一覧)を取り込む */
export function ingestHearingProgress(
  store: ClientStore,
  clientId: string,
  missingItems: MissingHearingItem[]
): void {
  store.updateHearingProgress(clientId, missingItems.length);
}

/** generate_proposal_draft のレスポンスを取り込む(提案書生成完了の記録) */
export function ingestProposalGenerated(store: ClientStore, result: GenerateProposalDraftResult): void {
  store.markProposalGenerated(result.clientId, result.createdAt);
}
