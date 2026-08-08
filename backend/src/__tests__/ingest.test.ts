import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientStore } from '../db/clientStore.js';
import { ingestClientProfile, ingestHearingProgress, ingestProposalGenerated } from '../mcp/ingest.js';

describe('ingest', () => {
  let tempDir: string;
  let store: ClientStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'ingest-test-'));
    store = new ClientStore(join(tempDir, 'clients.json'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('ingestClientProfileはsave_client_recordの応答をプロフィールとして取り込む', () => {
    ingestClientProfile(store, {
      id: 'C-1',
      name: '株式会社サンプル',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEnd: '03-31',
      riskLevel: 'unassessed',
      createdAt: '2026-08-08T12:20:04.533Z',
    });

    const snapshot = store.listAll()[0];
    expect(snapshot).toMatchObject({
      clientId: 'C-1',
      name: '株式会社サンプル',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEndMonthDay: '03-31',
    });
  });

  it('ingestHearingProgressはremind_missing_hearing_itemsの件数を取り込む', () => {
    ingestClientProfile(store, {
      id: 'C-1',
      name: '株式会社サンプル',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEnd: '03-31',
      riskLevel: 'unassessed',
      createdAt: '2026-08-08T12:20:04.533Z',
    });

    ingestHearingProgress(store, 'C-1', [
      { category: 'B', questionId: 'bank_balance', label: '現在の銀行残高' },
      { category: 'C', questionId: 'inventory_amount_and_turnover_days', label: '在庫金額・回転日数' },
    ]);

    expect(store.listAll()[0].hearingMissingCount).toBe(2);
  });

  it('ingestProposalGeneratedはgenerate_proposal_draftの成功を記録する', () => {
    ingestClientProfile(store, {
      id: 'C-1',
      name: '株式会社サンプル',
      industry: '小売業',
      employeeCount: 20,
      fiscalYearEnd: '03-31',
      riskLevel: 'unassessed',
      createdAt: '2026-08-08T12:20:04.533Z',
    });

    ingestProposalGenerated(store, {
      id: 'draft-1',
      clientId: 'C-1',
      diagnosisId: 'diagnosis-1',
      content: '# 提言書ドラフト',
      status: 'draft',
      createdAt: '2026-08-08T12:22:01.014Z',
      updatedAt: '2026-08-08T12:22:01.014Z',
    });

    expect(store.listAll()[0].proposalGeneratedAt).toBe('2026-08-08T12:22:01.014Z');
  });
});
