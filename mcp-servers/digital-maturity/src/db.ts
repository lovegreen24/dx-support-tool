import { Pool } from 'pg';
import type { AssessmentRecord, AssessmentRecordInput, MaturityAnswers, PriorityImprovement } from './types.js';

interface AssessmentRow {
  id: string;
  client_id: string;
  assessed_at: string;
  sales_score: string;
  admin_score: string;
  hr_score: string;
  infra_score: string;
  overall_score: string;
  priority_improvements: PriorityImprovement[];
  raw_answers: MaturityAnswers;
}

/** digital_maturity_assessmentsテーブルへの永続化を担うリポジトリ(imperative shell) */
export class AssessmentRepository {
  private readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }

  /** 診断結果を1行INSERTし、DBが確定した値(id・assessed_at等)を含む行を返す */
  async insert(record: AssessmentRecordInput): Promise<AssessmentRecord> {
    const result = await this.pool.query<AssessmentRow>(
      `INSERT INTO public.digital_maturity_assessments
        (client_id, sales_score, admin_score, hr_score, infra_score, overall_score,
         priority_improvements, raw_answers)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
       RETURNING id, client_id, assessed_at, sales_score, admin_score, hr_score,
         infra_score, overall_score, priority_improvements, raw_answers`,
      [
        record.clientId,
        record.salesScore,
        record.adminScore,
        record.hrScore,
        record.infraScore,
        record.overallScore,
        JSON.stringify(record.priorityImprovements),
        JSON.stringify(record.rawAnswers),
      ],
    );

    return mapRow(result.rows[0]);
  }

  /** client_idで診断履歴を新しい順に取得する(接続確認・結合テストでの検証用) */
  async findByClientId(clientId: string): Promise<AssessmentRecord[]> {
    const result = await this.pool.query<AssessmentRow>(
      `SELECT id, client_id, assessed_at, sales_score, admin_score, hr_score,
         infra_score, overall_score, priority_improvements, raw_answers
       FROM public.digital_maturity_assessments
       WHERE client_id = $1
       ORDER BY assessed_at DESC`,
      [clientId],
    );

    return result.rows.map(mapRow);
  }

  /** テストデータの後始末用(client_id単位で削除) */
  async deleteByClientId(clientId: string): Promise<void> {
    await this.pool.query('DELETE FROM public.digital_maturity_assessments WHERE client_id = $1', [clientId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

function mapRow(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    assessedAt: row.assessed_at,
    salesScore: Number(row.sales_score),
    adminScore: Number(row.admin_score),
    hrScore: Number(row.hr_score),
    infraScore: Number(row.infra_score),
    overallScore: Number(row.overall_score),
    priorityImprovements: row.priority_improvements,
    rawAnswers: row.raw_answers,
  };
}
