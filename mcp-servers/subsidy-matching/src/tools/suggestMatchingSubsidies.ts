import { NotionSubsidyClient } from '../api/notion.js';
import { loadConfig } from '../config.js';
import { matchSubsidies } from '../matching.js';
import type { SuggestMatchingSubsidiesInput, SuggestMatchingSubsidiesOutput } from '../types.js';

export const SUGGEST_MATCHING_SUBSIDIES_TOOL_NAME = 'suggest_matching_subsidies';

export const suggestMatchingSubsidiesInputSchema = {
  type: 'object',
  properties: {
    client_id: {
      type: 'string',
      description: 'クライアントID(財務系MCP発行のIDを共通利用)',
    },
    industry: {
      type: 'string',
      description: 'クライアントの業種(例: 製造業/小売業/飲食業/サービス業/建設業)',
    },
    employee_count: {
      type: 'number',
      description: 'クライアントの従業員数(任意。指定すると台帳側の人数条件で絞り込む)',
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: '課題・ニーズを表すキーワード(任意。補助金名・対象条件・備考との一致でスコア加点)',
    },
    include_closed: {
      type: 'boolean',
      description: '受付終了・締切超過の補助金も候補に含めるか(既定false)',
    },
    max_results: {
      type: 'number',
      description: '返却する最大件数(既定10)',
    },
  },
  required: ['client_id', 'industry'],
  additionalProperties: false,
} as const;

/**
 * suggest_matching_subsidiesツールのハンドラ(imperative shell)。
 * Notion補助金台帳を取得し、純粋関数matchSubsidiesで照合してから返す。
 */
export async function handleSuggestMatchingSubsidies(
  input: SuggestMatchingSubsidiesInput,
): Promise<SuggestMatchingSubsidiesOutput> {
  validateInput(input);

  const config = loadConfig();
  const client = new NotionSubsidyClient(config.notionToken, config.notionDatabaseId);
  const subsidies = await client.listSubsidies();

  const matches = matchSubsidies(
    subsidies,
    {
      clientId: input.client_id,
      industry: input.industry,
      employeeCount: input.employee_count,
      keywords: input.keywords,
      includeClosed: input.include_closed,
    },
    input.max_results ?? 10,
  );

  return {
    client_id: input.client_id,
    queried_at: new Date().toISOString(),
    total_candidates: subsidies.length,
    matches,
  };
}

function validateInput(input: SuggestMatchingSubsidiesInput): void {
  if (!input.client_id || typeof input.client_id !== 'string') {
    throw new Error('client_idは必須の文字列です');
  }
  if (!input.industry || typeof input.industry !== 'string') {
    throw new Error('industryは必須の文字列です');
  }
}
