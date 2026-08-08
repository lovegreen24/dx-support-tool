/**
 * `/api/clients` 内部結合テスト(モック禁止)。
 *
 * 【出所】以下のフィクスチャは、2026-08-08にAgent 8(バックエンド実装)が実際に財務系MCP
 * (cloud_proxy)を呼び出して得た生レスポンスをそのまま保存したものであり、手で捏造した値は
 * 一切含まれない。実施したMCP呼び出しの順序:
 *
 *   1. save_client_record → クライアントA(株式会社テスト商事)を新規登録
 *   2. save_client_record → クライアントB(テスト工業株式会社)を新規登録
 *   3. register_hearing_answer をクライアントAに29回呼び出し、全項目に回答
 *   4. remind_missing_hearing_items(クライアントA) → [](未回答0件を確認)
 *   5. register_hearing_answer をクライアントBに9回呼び出し(カテゴリA全4問+カテゴリB一部5問)
 *   6. remind_missing_hearing_items(クライアントB) → 20件の未回答項目
 *   7. analyze_working_capital(クライアントA) → 運転資金診断を登録(提案書生成の前提を満たす)
 *   8. generate_proposal_draft(クライアントA) → 提言書ドラフト生成に成功
 *   9. generate_proposal_draft(クライアントB) → `404: 診断結果がまだありません`で失敗
 *      (ヒアリング未完了・診断未実施のクライアントは提案書生成できないことを実証)
 *  10. list_client_history() → 診断実施済みのクライアントAのみが返り、業種・従業員数・決算期は
 *      含まれないことを確認した(このMCP単体では`/api/clients`の要求フィールドを満たせないと
 *      判明したため、save_client_record / remind_missing_hearing_items / generate_proposal_draft
 *      の応答をローカルDBに取り込む設計を採用した。詳細は `../db/clientStore.ts` 冒頭コメント参照)
 *
 * このテストは、上記の実際のMCP応答(フィクスチャ)を `mcp/ingest.ts` でローカルDBに取り込み、
 * 実際のExpressアプリ(`app.ts`)に対してHTTPリクエストを送って`/api/clients`の応答を検証する。
 * データはすべて実在のMCP呼び出し結果であり、モックしたMCPレスポンスは使用していない。
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { ClientStore } from '../db/clientStore.js';
import { ingestClientProfile, ingestHearingProgress, ingestProposalGenerated } from '../mcp/ingest.js';
import type {
  GenerateProposalDraftResult,
  MissingHearingItem,
  SaveClientRecordResult,
} from '../mcp/financialMcpTypes.js';

import saveClientRecordClientA from './fixtures/save-client-record-clientA.json' with { type: 'json' };
import saveClientRecordClientB from './fixtures/save-client-record-clientB.json' with { type: 'json' };
import remindMissingClientACompleted from './fixtures/remind-missing-hearing-items-clientA-completed.json' with { type: 'json' };
import remindMissingClientBPartial from './fixtures/remind-missing-hearing-items-clientB-partial.json' with { type: 'json' };
import generateProposalDraftClientA from './fixtures/generate-proposal-draft-clientA.json' with { type: 'json' };

describe('GET /api/clients (内部結合テスト・実MCP応答フィクスチャ使用)', () => {
  let tempDir: string;
  let store: ClientStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'clients-integration-test-'));
    store = new ClientStore(join(tempDir, 'clients.json'));

    // 実際のMCP呼び出し順序を再現して取り込む
    ingestClientProfile(store, saveClientRecordClientA as SaveClientRecordResult);
    ingestClientProfile(store, saveClientRecordClientB as SaveClientRecordResult);
    ingestHearingProgress(store, saveClientRecordClientA.id, remindMissingClientACompleted as MissingHearingItem[]);
    ingestHearingProgress(store, saveClientRecordClientB.id, remindMissingClientBPartial as MissingHearingItem[]);
    ingestProposalGenerated(store, generateProposalDraftClientA as GenerateProposalDraftResult);
    // クライアントBはgenerate_proposal_draftが実際に404で失敗したため、取り込みは行わない
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('実MCP応答から集計したクライアント一覧を返す', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        clientId: '8a02688a-06fc-4867-ad0f-187b4255939a',
        name: '株式会社テスト商事',
        industry: '小売業',
        employeeCount: 20,
        fiscalYearEnd: '3月',
        hearingCompletionRate: 100,
        proposalStatus: 'completed',
      },
      {
        clientId: '898b9e52-e6b0-416d-9fc4-2a56e9e9ea6b',
        name: 'テスト工業株式会社',
        industry: '製造業',
        employeeCount: 45,
        fiscalYearEnd: '9月',
        hearingCompletionRate: 31,
        proposalStatus: 'in_progress',
      },
    ]);
  });

  it('全項目回答済み+提案書生成成功のクライアントはcompletedになる', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');

    const clientA = res.body.find(
      (c: { clientId: string }) => c.clientId === '8a02688a-06fc-4867-ad0f-187b4255939a'
    );
    expect(clientA.hearingCompletionRate).toBe(100);
    expect(clientA.proposalStatus).toBe('completed');
  });

  it('ヒアリング一部回答(9/29件)かつ提案書未生成のクライアントはin_progressになる', async () => {
    const app = createApp({ clientStore: store });
    const res = await request(app).get('/api/clients');

    const clientB = res.body.find(
      (c: { clientId: string }) => c.clientId === '898b9e52-e6b0-416d-9fc4-2a56e9e9ea6b'
    );
    // 実測: 29項目中20件が未回答(=9件回答済み) → 9/29 ≈ 31%
    expect(clientB.hearingCompletionRate).toBe(31);
    expect(clientB.proposalStatus).toBe('in_progress');
  });
});
