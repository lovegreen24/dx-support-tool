import { loadConfig } from '../config.js';
import { CaseSheetClient } from '../api/sheets.js';
import { rowToRecord } from '../rowMapper.js';
import type { ListCaseProgressInput, ListCaseProgressOutput } from '../types.js';

export const LIST_CASE_PROGRESS_TOOL_NAME = 'list_case_progress';

export const listCaseProgressInputSchema = {
  type: 'object',
  properties: {
    case_id: {
      type: 'string',
      description: '案件ID(任意)。指定するとその案件のみ返す',
    },
    client_id: {
      type: 'string',
      description: 'クライアントID(任意)。指定するとそのクライアントの案件のみ返す',
    },
  },
  additionalProperties: false,
} as const;

/**
 * list_case_progressツールのハンドラ(imperative shell)。
 * Googleスプレッドシート「案件進捗」シートの全行を取得し、純粋関数rowToRecordで正規化してから
 * 指定条件(case_id/client_id)で絞り込む。
 */
export async function handleListCaseProgress(input: ListCaseProgressInput): Promise<ListCaseProgressOutput> {
  const config = loadConfig();
  const client = new CaseSheetClient(config.spreadsheetId, config.serviceAccount);

  const rows = await client.listDataRows();
  const records = rows.filter((row) => row[0]).map(rowToRecord);

  const filtered = records.filter((record) => {
    if (input.case_id && record.case_id !== input.case_id) return false;
    if (input.client_id && record.client_id !== input.client_id) return false;
    return true;
  });

  return { total: filtered.length, cases: filtered };
}
