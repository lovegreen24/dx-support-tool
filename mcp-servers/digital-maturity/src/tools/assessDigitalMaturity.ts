import { MATURITY_CATALOG } from '../catalog.js';
import { loadConfig } from '../config.js';
import { AssessmentRepository } from '../db.js';
import { assessDigitalMaturity } from '../scoring.js';
import type { AssessDigitalMaturityInput, AssessDigitalMaturityOutput, MaturityAnswers } from '../types.js';

export const ASSESS_DIGITAL_MATURITY_TOOL_NAME = 'assess_digital_maturity';

/** カタログの各診断項目を`answers`のプロパティとして動的に生成する(単一の真実源=catalog.ts) */
function buildAnswersSchemaProperties(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const item of MATURITY_CATALOG) {
    properties[item.itemId] = {
      type: 'integer',
      minimum: 0,
      maximum: 4,
      description: `${item.label}(0=未導入, 1=検討中, 2=一部導入, 3=導入済み活用中, 4=高度活用/自動化)`,
    };
  }
  return properties;
}

export const assessDigitalMaturityInputSchema = {
  type: 'object',
  properties: {
    client_id: {
      type: 'string',
      description: 'クライアントID(財務系MCP発行のIDを共通利用)',
    },
    answers: {
      type: 'object',
      description: '診断項目ID → 成熟度レベル(0〜4)のヒアリング回答。カタログ全項目への回答が必須',
      properties: buildAnswersSchemaProperties(),
      required: MATURITY_CATALOG.map((item) => item.itemId),
      additionalProperties: false,
    },
  },
  required: ['client_id', 'answers'],
  additionalProperties: false,
} as const;

/**
 * assess_digital_maturityツールのハンドラ(imperative shell)。
 * 純粋関数assessDigitalMaturityでスコアリングし、Supabaseへ結果を永続化する。
 */
export async function handleAssessDigitalMaturity(
  input: AssessDigitalMaturityInput,
): Promise<AssessDigitalMaturityOutput> {
  validateInput(input);

  const result = assessDigitalMaturity(input.answers);

  const config = loadConfig();
  const repository = new AssessmentRepository(config.databaseUrl);
  try {
    const saved = await repository.insert({
      clientId: input.client_id,
      salesScore: result.salesScore,
      adminScore: result.adminScore,
      hrScore: result.hrScore,
      infraScore: result.infraScore,
      overallScore: result.overallScore,
      priorityImprovements: result.priorityImprovements,
      rawAnswers: input.answers,
    });

    return toOutput(saved.id, saved.assessedAt, input.client_id, result, input.answers);
  } finally {
    await repository.close();
  }
}

function validateInput(input: AssessDigitalMaturityInput): void {
  if (!input.client_id || typeof input.client_id !== 'string') {
    throw new Error('client_idは必須の文字列です');
  }
  if (!input.answers || typeof input.answers !== 'object') {
    throw new Error('answersは必須のオブジェクトです');
  }
}

function toOutput(
  id: string,
  assessedAt: string,
  clientId: string,
  result: ReturnType<typeof assessDigitalMaturity>,
  answers: MaturityAnswers,
): AssessDigitalMaturityOutput {
  return {
    id,
    client_id: clientId,
    assessed_at: assessedAt,
    sales_score: result.salesScore,
    admin_score: result.adminScore,
    hr_score: result.hrScore,
    infra_score: result.infraScore,
    overall_score: result.overallScore,
    priority_improvements: result.priorityImprovements,
    raw_answers: answers,
  };
}
