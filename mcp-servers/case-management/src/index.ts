#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  RECORD_CASE_APPROVAL_TOOL_NAME,
  recordCaseApprovalInputSchema,
  handleRecordCaseApproval,
} from './tools/recordCaseApproval.js';
import {
  LIST_CASE_PROGRESS_TOOL_NAME,
  listCaseProgressInputSchema,
  handleListCaseProgress,
} from './tools/listCaseProgress.js';
import type { ListCaseProgressInput, RecordCaseApprovalInput } from './types.js';

const server = new Server(
  { name: 'case-management-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: RECORD_CASE_APPROVAL_TOOL_NAME,
      description:
        '案件の6承認ポイント(クライアント登録・決算書解析・ヒアリング回収・財務分析・ベンチマーク比較・提案書生成)のうち' +
        '1つのステータスを記録する。未登録の案件IDなら新規行を作成する',
      inputSchema: recordCaseApprovalInputSchema,
    },
    {
      name: LIST_CASE_PROGRESS_TOOL_NAME,
      description: '案件進捗シートから案件一覧(6承認ポイントの状況を含む)を取得する。case_id/client_idで絞り込み可能',
      inputSchema: listCaseProgressInputSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await dispatch(request.params.name, request.params.arguments);
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function dispatch(name: string, args: unknown): Promise<unknown> {
  if (name === RECORD_CASE_APPROVAL_TOOL_NAME) {
    return handleRecordCaseApproval(args as unknown as RecordCaseApprovalInput);
  }
  if (name === LIST_CASE_PROGRESS_TOOL_NAME) {
    return handleListCaseProgress((args ?? {}) as ListCaseProgressInput);
  }
  throw new Error(`未知のツールです: ${name}`);
}

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`case-management-mcp起動エラー: ${String(error)}\n`);
  process.exit(1);
});
