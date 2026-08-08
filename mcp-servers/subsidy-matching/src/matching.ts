import type { MatchCriteria, MatchResult, SubsidyRecord } from './types.js';

const ALL_INDUSTRIES_LABEL = '全業種';
const CLOSED_STATUS = '受付終了';
const NEAR_DEADLINE_STATUS = '締切間近';
const OPEN_STATUS = '募集中';

/** 「50名以下」「30人未満」等の従業員数条件を抽出する正規表現 */
const EMPLOYEE_LIMIT_PATTERN = /(\d+)\s*(?:名|人)\s*(以下|未満)/;

/**
 * 補助金台帳(全件)をクライアント条件と照合し、スコア降順でマッチ結果を返す。
 * 外部I/O(Notion API)を含まない純粋関数。
 */
export function matchSubsidies(
  subsidies: SubsidyRecord[],
  criteria: MatchCriteria,
  maxResults = 10,
): MatchResult[] {
  const results = subsidies
    .filter((subsidy) => isEligible(subsidy, criteria))
    .map((subsidy) => scoreSubsidy(subsidy, criteria))
    .sort(compareByScoreThenDeadline);

  return results.slice(0, maxResults);
}

/** 除外条件(対象外)を判定する。falseなら候補から除外する */
function isEligible(subsidy: SubsidyRecord, criteria: MatchCriteria): boolean {
  if (!matchesIndustry(subsidy.targetIndustries, criteria.industry)) return false;
  if (!criteria.includeClosed && subsidy.status === CLOSED_STATUS) return false;
  if (!criteria.includeClosed && isPastDeadline(subsidy.applicationDeadline)) return false;
  if (exceedsEmployeeLimit(subsidy.targetConditions, criteria.employeeCount)) return false;
  return true;
}

function matchesIndustry(targetIndustries: string[], clientIndustry: string): boolean {
  return targetIndustries.includes(ALL_INDUSTRIES_LABEL) || targetIndustries.includes(clientIndustry);
}

function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  if (Number.isNaN(deadlineDate.getTime())) return false;
  return deadlineDate.getTime() < Date.now();
}

function exceedsEmployeeLimit(targetConditions: string, employeeCount?: number): boolean {
  if (employeeCount === undefined) return false;
  const limit = parseEmployeeLimit(targetConditions);
  if (limit === null) return false;
  return employeeCount > limit.max;
}

function parseEmployeeLimit(targetConditions: string): { max: number } | null {
  const match = targetConditions.match(EMPLOYEE_LIMIT_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  const isExclusiveUpperBound = match[2] === '未満';
  return { max: isExclusiveUpperBound ? value - 1 : value };
}

function scoreSubsidy(subsidy: SubsidyRecord, criteria: MatchCriteria): MatchResult {
  const reasons: string[] = [];
  let score = 0;

  const industryScore = scoreIndustry(subsidy.targetIndustries, criteria.industry, reasons);
  score += industryScore;

  if (criteria.employeeCount !== undefined && parseEmployeeLimit(subsidy.targetConditions)) {
    score += 2;
    reasons.push(`従業員数条件(${criteria.employeeCount}名)を満たす`);
  }

  score += scoreKeywords(subsidy, criteria.keywords ?? [], reasons);
  score += scoreStatus(subsidy.status, reasons);

  return {
    pageId: subsidy.pageId,
    subsidyName: subsidy.subsidyName,
    organization: subsidy.organization,
    targetIndustries: subsidy.targetIndustries,
    targetConditions: subsidy.targetConditions,
    subsidyAmount: subsidy.subsidyAmount,
    applicationDeadline: subsidy.applicationDeadline,
    status: subsidy.status,
    detailUrl: subsidy.detailUrl,
    notes: subsidy.notes,
    matchScore: score,
    matchReasons: reasons,
  };
}

function scoreIndustry(targetIndustries: string[], clientIndustry: string, reasons: string[]): number {
  if (targetIndustries.includes(clientIndustry)) {
    reasons.push(`対象業種「${clientIndustry}」に合致`);
    return 3;
  }
  if (targetIndustries.includes(ALL_INDUSTRIES_LABEL)) {
    reasons.push('全業種対象');
    return 1;
  }
  return 0;
}

function scoreKeywords(subsidy: SubsidyRecord, keywords: string[], reasons: string[]): number {
  const haystack = `${subsidy.subsidyName} ${subsidy.targetConditions} ${subsidy.notes}`;
  let score = 0;
  for (const keyword of keywords) {
    if (keyword && haystack.includes(keyword)) {
      score += 1;
      reasons.push(`キーワード「${keyword}」に合致`);
    }
  }
  return score;
}

function scoreStatus(status: string, reasons: string[]): number {
  if (status === OPEN_STATUS) {
    reasons.push('募集中');
    return 1;
  }
  if (status === NEAR_DEADLINE_STATUS) {
    reasons.push('締切間近のため優先度高');
    return 0.5;
  }
  return 0;
}

function compareByScoreThenDeadline(a: MatchResult, b: MatchResult): number {
  if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
  return deadlineSortValue(a.applicationDeadline) - deadlineSortValue(b.applicationDeadline);
}

function deadlineSortValue(deadline: string | null): number {
  if (!deadline) return Number.POSITIVE_INFINITY;
  const time = new Date(deadline).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}
