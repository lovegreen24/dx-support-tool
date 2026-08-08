/**
 * 内部結合テスト: 実際のSupabase(PostgreSQL)に接続し、DBモックを使わずに検証する。
 * 実行にはDATABASE_URL・SUPABASE_SERVICE_KEY環境変数(シェルからexport、.envファイルは作らない)が必要。
 */
import { AssessmentRepository } from '../../../src/db.js';
import { handleAssessDigitalMaturity } from '../../../src/tools/assessDigitalMaturity.js';
import { MATURITY_CATALOG } from '../../../src/catalog.js';
import type { MaturityAnswers } from '../../../src/types.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `内部結合テストの実行には${name}環境変数が必要です(password-managerから取得しシェルでexportすること)`,
    );
  }
  return value;
}

function buildAnswers(level: 0 | 1 | 2 | 3 | 4): MaturityAnswers {
  const answers: MaturityAnswers = {};
  for (const item of MATURITY_CATALOG) {
    answers[item.itemId] = level;
  }
  return answers;
}

function uniqueClientId(prefix: string): string {
  return `test-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('digital_maturity_assessments 内部結合テスト', () => {
  const databaseUrl = requireEnv('DATABASE_URL');
  requireEnv('SUPABASE_SERVICE_KEY'); // handleAssessDigitalMaturity内部のloadConfig()が要求する
  let repository: AssessmentRepository;
  const createdClientIds: string[] = [];

  beforeAll(() => {
    repository = new AssessmentRepository(databaseUrl);
  });

  afterEach(async () => {
    for (const clientId of createdClientIds.splice(0)) {
      await repository.deleteByClientId(clientId);
    }
  });

  afterAll(async () => {
    await repository.close();
  });

  describe('AssessmentRepository', () => {
    it('診断結果をINSERTし、DBが確定したid・assessed_atを含めて返す', async () => {
      const clientId = uniqueClientId('repo-insert');
      createdClientIds.push(clientId);

      const saved = await repository.insert({
        clientId,
        salesScore: 75,
        adminScore: 50,
        hrScore: 25,
        infraScore: 100,
        overallScore: 62.5,
        priorityImprovements: [
          {
            itemId: 'sfa_crm',
            areaId: 'sales',
            areaLabel: '営業(SFA/CRM・EC活用)',
            itemLabel: 'SFA/CRMの導入・活用状況',
            level: 1,
            score: 25,
            action: 'SFA/CRMツールの導入を検討する',
          },
        ],
        rawAnswers: buildAnswers(2),
      });

      expect(saved.id).toBeTruthy();
      expect(saved.assessedAt).toBeTruthy();
      expect(saved.clientId).toBe(clientId);
      expect(saved.salesScore).toBe(75);
      expect(saved.overallScore).toBe(62.5);
      expect(saved.priorityImprovements).toHaveLength(1);
      expect(saved.priorityImprovements[0].itemId).toBe('sfa_crm');
    });

    it('findByClientIdでINSERTした行を実DBから取得できる', async () => {
      const clientId = uniqueClientId('repo-find');
      createdClientIds.push(clientId);

      await repository.insert({
        clientId,
        salesScore: 0,
        adminScore: 0,
        hrScore: 0,
        infraScore: 0,
        overallScore: 0,
        priorityImprovements: [],
        rawAnswers: buildAnswers(0),
      });

      const rows = await repository.findByClientId(clientId);

      expect(rows).toHaveLength(1);
      expect(rows[0].clientId).toBe(clientId);
      expect(rows[0].overallScore).toBe(0);
    });

    it('存在しないclient_idはfindByClientIdで空配列を返す', async () => {
      const rows = await repository.findByClientId(uniqueClientId('never-exists'));

      expect(rows).toEqual([]);
    });

    it('deleteByClientIdで実DBから削除できる', async () => {
      const clientId = uniqueClientId('repo-delete');

      await repository.insert({
        clientId,
        salesScore: 100,
        adminScore: 100,
        hrScore: 100,
        infraScore: 100,
        overallScore: 100,
        priorityImprovements: [],
        rawAnswers: buildAnswers(4),
      });

      await repository.deleteByClientId(clientId);
      const rows = await repository.findByClientId(clientId);

      expect(rows).toEqual([]);
    });

    it('同一client_idで複数回診断した履歴を新しい順に取得できる', async () => {
      const clientId = uniqueClientId('repo-history');
      createdClientIds.push(clientId);

      await repository.insert({
        clientId,
        salesScore: 0,
        adminScore: 0,
        hrScore: 0,
        infraScore: 0,
        overallScore: 0,
        priorityImprovements: [],
        rawAnswers: buildAnswers(0),
      });
      await new Promise((resolve) => setTimeout(resolve, 10));
      await repository.insert({
        clientId,
        salesScore: 100,
        adminScore: 100,
        hrScore: 100,
        infraScore: 100,
        overallScore: 100,
        priorityImprovements: [],
        rawAnswers: buildAnswers(4),
      });

      const rows = await repository.findByClientId(clientId);

      expect(rows).toHaveLength(2);
      expect(rows[0].overallScore).toBe(100); // 新しい順(2回目が先頭)
      expect(rows[1].overallScore).toBe(0);
    });
  });

  describe('handleAssessDigitalMaturity(ツールハンドラ全体)', () => {
    it('スコアリング結果を実DBに保存し、保存済みidを含む出力を返す', async () => {
      const clientId = uniqueClientId('handler-e2e');
      createdClientIds.push(clientId);

      const output = await handleAssessDigitalMaturity({
        client_id: clientId,
        answers: buildAnswers(3),
      });

      expect(output.id).toBeTruthy();
      expect(output.client_id).toBe(clientId);
      expect(output.overall_score).toBe(75);
      expect(output.sales_score).toBe(75);

      const rows = await repository.findByClientId(clientId);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(output.id);
      expect(rows[0].rawAnswers).toEqual(buildAnswers(3));
    });

    it('未回答項目があるツール呼び出しはDB書き込み前にエラーになる(不正データがDBに残らない)', async () => {
      const clientId = uniqueClientId('handler-invalid');
      const incompleteAnswers = buildAnswers(2);
      delete incompleteAnswers[MATURITY_CATALOG[0].itemId];

      await expect(
        handleAssessDigitalMaturity({ client_id: clientId, answers: incompleteAnswers }),
      ).rejects.toThrow(/未回答の診断項目があります/);

      const rows = await repository.findByClientId(clientId);
      expect(rows).toEqual([]);
    });
  });
});
