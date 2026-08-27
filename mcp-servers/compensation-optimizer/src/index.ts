#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import {
  SIMULATE_EXECUTIVE_COMPENSATION_TOOL_NAME,
  handleSimulateExecutiveCompensation,
  simulateExecutiveCompensationInputSchema,
} from './tools/simulateExecutiveCompensation.js';

const server = new Server(
  { name: 'compensation-optimizer-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: SIMULATE_EXECUTIVE_COMPENSATION_TOOL_NAME,
      description:
        '役員報酬(月額)・旅費規程に基づく非課税支給(日当・宿泊費等)・年1回の役員賞与の組み合わせを現行/変更後の2パターンで比較し、' +
        '標準報酬月額・標準賞与額・健康保険料・厚生年金保険料・雇用保険料・所得税・住民税・年間手取り額と、' +
        '会社負担(事業主分社会保険料、および賞与が事前確定届出給与の要件を満たさない場合の法人税影響)の増減までを試算する(内部検討用の概算値)',
      inputSchema: simulateExecutiveCompensationInputSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === SIMULATE_EXECUTIVE_COMPENSATION_TOOL_NAME) {
    const result = handleSimulateExecutiveCompensation(request.params.arguments as never);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  throw new Error(`未知のツールです: ${request.params.name}`);
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`compensation-optimizer-mcp起動エラー: ${String(error)}\n`);
  process.exit(1);
});
