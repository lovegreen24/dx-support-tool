import type { ClientSnapshot } from '../db/clientStore.js';
import type { Client } from '../types/index.js';
import { computeHearingCompletionRate } from './hearingChecklist.js';

/**
 * ClientSnapshot(ローカルDB上の内部表現)をフロントエンド契約の`Client`型に変換する純粋関数群。
 * I/O(ファイル読み込み・MCP呼び出し)は一切行わないため、決め打ちのfixtureだけでテスト可能。
 */

/** "03-31"(MM-DD) → "3月" */
export function formatFiscalYearEnd(monthDay: string): string {
  const [monthStr] = monthDay.split('-');
  const month = Number(monthStr);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`formatFiscalYearEnd: 不正な決算期形式です: "${monthDay}"`);
  }
  return `${month}月`;
}

/**
 * 提案書ステータスを判定する。
 * - completed: generate_proposal_draft成功が記録済み(proposalGeneratedAtあり)
 * - not_started: ヒアリングに一切着手していない(完了率0%)
 * - in_progress: 上記以外(ヒアリング着手済みだが提案書生成は未記録、またはヒアリング完了率100%だが
 *   generate_proposal_draft実行の記録がまだない)
 */
export function deriveProposalStatus(snapshot: ClientSnapshot): Client['proposalStatus'] {
  if (snapshot.proposalGeneratedAt !== null) {
    return 'completed';
  }
  const rate = computeHearingCompletionRate(snapshot.hearingMissingCount);
  return rate === 0 ? 'not_started' : 'in_progress';
}

export function toClient(snapshot: ClientSnapshot): Client {
  return {
    clientId: snapshot.clientId,
    name: snapshot.name,
    industry: snapshot.industry,
    employeeCount: snapshot.employeeCount,
    fiscalYearEnd: formatFiscalYearEnd(snapshot.fiscalYearEndMonthDay),
    hearingCompletionRate: computeHearingCompletionRate(snapshot.hearingMissingCount),
    proposalStatus: deriveProposalStatus(snapshot),
  };
}

/** ローカルDBのクライアントスナップショット一覧を`/api/clients`のレスポンス形式に変換する */
export function buildClientList(snapshots: ClientSnapshot[]): Client[] {
  return snapshots.map(toClient);
}
