/**
 * assess_digital_maturity(M-012)の型定義。
 * データはSupabase(PostgreSQL)の`digital_maturity_assessments`テーブルを
 * 単一の真実源とする(docs/SCOPE_PROGRESS.md「データモデル定義」節を参照)。
 */

/** 診断領域の識別子(4領域固定) */
export type MaturityAreaId = 'sales' | 'admin' | 'hr' | 'infra';

/** ヒアリング回答の成熟度レベル(0=未導入 〜 4=高度活用/自動化) */
export type MaturityLevel = 0 | 1 | 2 | 3 | 4;

/** 診断項目カタログの1件(固定データ・純粋データ) */
export interface MaturityCatalogItem {
  itemId: string;
  areaId: MaturityAreaId;
  label: string;
  /** レベルが低い場合(閾値未満)に提示する改善アクション */
  improvementAction: string;
}

/** 領域単位の集計結果 */
export interface AreaScoreResult {
  areaId: MaturityAreaId;
  areaLabel: string;
  score: number;
  itemScores: ItemScoreResult[];
}

export interface ItemScoreResult {
  itemId: string;
  areaId: MaturityAreaId;
  label: string;
  level: MaturityLevel;
  score: number;
}

/** 改善優先度リストの1件 */
export interface PriorityImprovement {
  itemId: string;
  areaId: MaturityAreaId;
  areaLabel: string;
  itemLabel: string;
  level: MaturityLevel;
  score: number;
  action: string;
}

/** ヒアリング回答: 診断項目id → 成熟度レベル */
export type MaturityAnswers = Record<string, MaturityLevel>;

/** スコアリング(純粋関数)の計算結果 */
export interface MaturityAssessmentResult {
  areaScores: AreaScoreResult[];
  salesScore: number;
  adminScore: number;
  hrScore: number;
  infraScore: number;
  overallScore: number;
  priorityImprovements: PriorityImprovement[];
}

/** assess_digital_maturityツールの入力 */
export interface AssessDigitalMaturityInput {
  client_id: string;
  answers: MaturityAnswers;
}

/** assess_digital_maturityツールの出力(DB保存結果を含む) */
export interface AssessDigitalMaturityOutput {
  id: string;
  client_id: string;
  assessed_at: string;
  sales_score: number;
  admin_score: number;
  hr_score: number;
  infra_score: number;
  overall_score: number;
  priority_improvements: PriorityImprovement[];
  raw_answers: MaturityAnswers;
}

/** digital_maturity_assessmentsテーブルへの1行分の書き込みデータ */
export interface AssessmentRecordInput {
  clientId: string;
  salesScore: number;
  adminScore: number;
  hrScore: number;
  infraScore: number;
  overallScore: number;
  priorityImprovements: PriorityImprovement[];
  rawAnswers: MaturityAnswers;
}

/** digital_maturity_assessmentsテーブルの1行(DB書き込み後の実データ) */
export interface AssessmentRecord {
  id: string;
  clientId: string;
  assessedAt: string;
  salesScore: number;
  adminScore: number;
  hrScore: number;
  infraScore: number;
  overallScore: number;
  priorityImprovements: PriorityImprovement[];
  rawAnswers: MaturityAnswers;
}
