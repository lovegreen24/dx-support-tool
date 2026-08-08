#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  SUGGEST_MATCHING_SUBSIDIES_TOOL_NAME,
  suggestMatchingSubsidiesInputSchema,
  handleSuggestMatchingSubsidies,
} from './tools/suggestMatchingSubsidies.js';
import type { SuggestMatchingSubsidiesInput } from './types.js';

const server = new Server(
  { name: 'subsidy-matching-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: SUGGEST_MATCHING_SUBSIDIES_TOOL_NAME,
      description:
        'Notion補助金台帳とクライアント情報(業種・従業員数・キーワード)を照合し、マッチ度の高い順に補助金候補を返す',
      inputSchema: suggestMatchingSubsidiesInputSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== SUGGEST_MATCHING_SUBSIDIES_TOOL_NAME) {
    throw new Error(`未知のツールです: ${request.params.name}`);
  }

  const result = await handleSuggestMatchingSubsidies(
    request.params.arguments as unknown as SuggestMatchingSubsidiesInput,
  );

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`subsidy-matching-mcp起動エラー: ${String(error)}\n`);
  process.exit(1);
});
