import { loadConfig } from '../config.js';
import { AssessmentRepository } from '../db.js';
import type { AssessDigitalMaturityOutput, AssessmentRecord } from '../types.js';

export const LIST_DIGITAL_MATURITY_HISTORY_TOOL_NAME = 'list_digital_maturity_history';

export const listDigitalMaturityHistoryInputSchema = {
  type: 'object',
  properties: {
    client_id: {
      type: 'string',
      description: 'クライアントID(財務系MCP発行のIDを共通利用)',
    },
  },
  required: ['client_id'],
  additionalProperties: false,
} as const;

export interface ListDigitalMaturityHistoryInput {
  client_id: string;
}

/**
 * list_digital_maturity_historyツールのハンドラ(imperative shell)。
 * client_id単位でDX成熟度診断履歴(新しい順)をSupabaseから取得する。
 * assess_digital_maturityは書き込み専用のため、過去の診断結果を参照する手段が
 * 存在しなかった(@クライアント管理エージェントの説明文と実装のギャップとして
 * 受入試験で発見・報告された)ことへの対応として追加。
 */
export async function handleListDigitalMaturityHistory(
  input: ListDigitalMaturityHistoryInput,
): Promise<AssessDigitalMaturityOutput[]> {
  if (!input.client_id || typeof input.client_id !== 'string') {
    throw new Error('client_idは必須の文字列です');
  }

  const config = loadConfig();
  const repository = new AssessmentRepository(config.databaseUrl);
  try {
    const records = await repository.findByClientId(input.client_id);
    return records.map(toOutput);
  } finally {
    await repository.close();
  }
}

function toOutput(record: AssessmentRecord): AssessDigitalMaturityOutput {
  return {
    id: record.id,
    client_id: record.clientId,
    assessed_at: record.assessedAt,
    sales_score: record.salesScore,
    admin_score: record.adminScore,
    hr_score: record.hrScore,
    infra_score: record.infraScore,
    overall_score: record.overallScore,
    priority_improvements: record.priorityImprovements,
    raw_answers: record.rawAnswers,
  };
}
