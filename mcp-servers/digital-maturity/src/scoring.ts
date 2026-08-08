import { AREA_IDS, AREA_LABELS, MATURITY_CATALOG } from './catalog.js';
import type {
  AreaScoreResult,
  ItemScoreResult,
  MaturityAnswers,
  MaturityAssessmentResult,
  MaturityAreaId,
  MaturityLevel,
  PriorityImprovement,
} from './types.js';

/** 1レベルあたりの点数(0〜4レベル → 0〜100点) */
const LEVEL_TO_SCORE = 25;
const MIN_LEVEL = 0;
const MAX_LEVEL = 4;

/** この閾値未満のレベル(0・1・2)は改善優先度リストの対象とする */
const PRIORITY_LEVEL_THRESHOLD = 3;

/**
 * ヒアリング回答を検証する(純粋関数)。
 * カタログ全項目への回答が揃っており、各値が0〜4の整数であることを要求する。
 * 不正時はフォールバックせず即座にエラーを投げる(CLAUDE.md「エラーは隠さない」に準拠)。
 */
export function validateAnswers(answers: MaturityAnswers): void {
  const missing = MATURITY_CATALOG.filter((item) => answers[item.itemId] === undefined).map(
    (item) => item.itemId,
  );
  if (missing.length > 0) {
    throw new Error(`未回答の診断項目があります: ${missing.join(', ')}`);
  }

  const catalogIds = new Set(MATURITY_CATALOG.map((item) => item.itemId));
  const unknown = Object.keys(answers).filter((itemId) => !catalogIds.has(itemId));
  if (unknown.length > 0) {
    throw new Error(`未定義の診断項目IDが含まれています: ${unknown.join(', ')}`);
  }

  const invalid = Object.entries(answers).filter(
    ([, level]) => !Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL,
  );
  if (invalid.length > 0) {
    const detail = invalid.map(([itemId, level]) => `${itemId}=${level}`).join(', ');
    throw new Error(`診断レベルは0〜4の整数で指定してください: ${detail}`);
  }
}

/** 1項目のレベルを100点満点のスコアへ変換する(純粋関数) */
export function levelToScore(level: MaturityLevel): number {
  return level * LEVEL_TO_SCORE;
}

/** 小数第1位で丸める(純粋関数) */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeItemScores(answers: MaturityAnswers): ItemScoreResult[] {
  return MATURITY_CATALOG.map((item) => ({
    itemId: item.itemId,
    areaId: item.areaId,
    label: item.label,
    level: answers[item.itemId],
    score: levelToScore(answers[item.itemId]),
  }));
}

function computeAreaScores(itemScores: ItemScoreResult[]): AreaScoreResult[] {
  return AREA_IDS.map((areaId) => {
    const items = itemScores.filter((item) => item.areaId === areaId);
    const average = items.reduce((sum, item) => sum + item.score, 0) / items.length;
    return {
      areaId,
      areaLabel: AREA_LABELS[areaId],
      score: round1(average),
      itemScores: items,
    };
  });
}

function computeOverallScore(areaScores: AreaScoreResult[]): number {
  const average = areaScores.reduce((sum, area) => sum + area.score, 0) / areaScores.length;
  return round1(average);
}

/**
 * レベルが閾値未満の項目を改善優先度リストとして抽出する(純粋関数)。
 * レベル昇順(低いほど優先度が高い)、同レベルはカタログ記載順で安定ソートする。
 */
export function buildPriorityImprovements(itemScores: ItemScoreResult[]): PriorityImprovement[] {
  return itemScores
    .filter((item) => item.level < PRIORITY_LEVEL_THRESHOLD)
    .map((item) => {
      const catalogItem = MATURITY_CATALOG.find((entry) => entry.itemId === item.itemId);
      return {
        itemId: item.itemId,
        areaId: item.areaId,
        areaLabel: AREA_LABELS[item.areaId],
        itemLabel: item.label,
        level: item.level,
        score: item.score,
        action: catalogItem?.improvementAction ?? '',
      };
    })
    .sort((a, b) => a.level - b.level);
}

function findAreaScore(areaScores: AreaScoreResult[], areaId: MaturityAreaId): number {
  return areaScores.find((area) => area.areaId === areaId)?.score ?? 0;
}

/**
 * DX成熟度診断のスコアリング本体(純粋関数)。
 * 外部I/O(DB書き込み)を含まない。呼び出し前にvalidateAnswersでの検証を必須とする。
 */
export function assessDigitalMaturity(answers: MaturityAnswers): MaturityAssessmentResult {
  validateAnswers(answers);

  const itemScores = computeItemScores(answers);
  const areaScores = computeAreaScores(itemScores);
  const overallScore = computeOverallScore(areaScores);
  const priorityImprovements = buildPriorityImprovements(itemScores);

  return {
    areaScores,
    salesScore: findAreaScore(areaScores, 'sales'),
    adminScore: findAreaScore(areaScores, 'admin'),
    hrScore: findAreaScore(areaScores, 'hr'),
    infraScore: findAreaScore(areaScores, 'infra'),
    overallScore,
    priorityImprovements,
  };
}
