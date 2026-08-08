#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  ASSESS_DIGITAL_MATURITY_TOOL_NAME,
  assessDigitalMaturityInputSchema,
  handleAssessDigitalMaturity,
} from './tools/assessDigitalMaturity.js';
import type { AssessDigitalMaturityInput } from './types.js';

const server = new Server(
  { name: 'digital-maturity-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: ASSESS_DIGITAL_MATURITY_TOOL_NAME,
      description:
        '営業(SFA/CRM・EC活用)/総務経理(クラウド会計・電子帳簿保存法)/労務(年末調整/社保電子化・勤怠管理)/' +
        '社内基盤(チャット/Web会議/RPA/電子契約)の4領域のDX成熟度をヒアリング回答からスコアリングし、' +
        '各領域スコア・総合スコア・改善優先度リストを算出してSupabaseに保存する',
      inputSchema: assessDigitalMaturityInputSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== ASSESS_DIGITAL_MATURITY_TOOL_NAME) {
    throw new Error(`未知のツールです: ${request.params.name}`);
  }

  const result = await handleAssessDigitalMaturity(
    request.params.arguments as unknown as AssessDigitalMaturityInput,
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
  process.stderr.write(`digital-maturity-mcp起動エラー: ${String(error)}\n`);
  process.exit(1);
});
