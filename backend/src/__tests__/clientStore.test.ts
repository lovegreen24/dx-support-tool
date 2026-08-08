import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClientStore } from '../db/clientStore.js';

describe('ClientStore', () => {
  let tempDir: string;
  let filePath: string;
  let store: ClientStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'client-store-test-'));
    filePath = join(tempDir, 'clients.json');
    store = new ClientStore(filePath);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('ファイルが存在しない状態でlistAllを呼ぶと空配列を返す', () => {
    expect(store.listAll()).toEqual([]);
  });

  it('upsertProfileで新規登録したクライアントがlistAllに現れる', () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: 'テスト株式会社',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });

    const all = store.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      clientId: 'C-1',
      name: 'テスト株式会社',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
      hearingMissingCount: null,
      proposalGeneratedAt: null,
    });
  });

  it('upsertProfileを同じclientIdで2回呼ぶと基本情報が上書きされ、件数は増えない', () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: '旧名称',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });
    store.upsertProfile({
      clientId: 'C-1',
      name: '新名称',
      industry: '製造業',
      employeeCount: 15,
      fiscalYearEndMonthDay: '09-30',
    });

    const all = store.listAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: '新名称', industry: '製造業', employeeCount: 15 });
  });

  it('updateHearingProgressで未回答件数を同期できる', () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: 'テスト株式会社',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });
    store.updateHearingProgress('C-1', 5);

    expect(store.listAll()[0].hearingMissingCount).toBe(5);
  });

  it('未登録のclientIdに対するupdateHearingProgressはエラーを投げる(フォールバックで隠蔽しない)', () => {
    expect(() => store.updateHearingProgress('unknown', 5)).toThrow();
  });

  it('markProposalGeneratedで提案書生成日時を記録できる', () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: 'テスト株式会社',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });
    store.markProposalGenerated('C-1', '2026-08-08T12:22:01.014Z');

    expect(store.listAll()[0].proposalGeneratedAt).toBe('2026-08-08T12:22:01.014Z');
  });

  it('未登録のclientIdに対するmarkProposalGeneratedはエラーを投げる', () => {
    expect(() => store.markProposalGenerated('unknown', '2026-08-08T00:00:00.000Z')).toThrow();
  });

  it('永続化される: 別インスタンスからも同じファイルを読める', () => {
    store.upsertProfile({
      clientId: 'C-1',
      name: 'テスト株式会社',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });

    const secondStore = new ClientStore(filePath);
    expect(secondStore.listAll()).toHaveLength(1);
  });

  it('listAllはcreatedAtの昇順で返す', () => {
    store.upsertProfile({
      clientId: 'C-2',
      name: '2番目に登録',
      industry: '製造業',
      employeeCount: 5,
      fiscalYearEndMonthDay: '12-31',
    });
    store.upsertProfile({
      clientId: 'C-1',
      name: '1番目のはずが後で更新される',
      industry: '小売業',
      employeeCount: 10,
      fiscalYearEndMonthDay: '03-31',
    });
    // C-2を後から更新しても登録順(createdAt)は変わらない
    store.updateHearingProgress('C-2', 10);

    const all = store.listAll();
    expect(all.map((s) => s.clientId)).toEqual(['C-2', 'C-1']);
  });
});
