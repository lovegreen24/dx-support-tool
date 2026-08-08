import { MATURITY_CATALOG } from '../../src/catalog.js';
import { assessDigitalMaturity, buildPriorityImprovements, levelToScore, validateAnswers } from '../../src/scoring.js';
import type { MaturityAnswers, MaturityLevel } from '../../src/types.js';

/** カタログ全項目に同一レベルを割り当てた回答セットを作る */
function buildAnswers(level: MaturityLevel, overrides: Record<string, MaturityLevel> = {}): MaturityAnswers {
  const answers: MaturityAnswers = {};
  for (const item of MATURITY_CATALOG) {
    answers[item.itemId] = level;
  }
  return { ...answers, ...overrides };
}

describe('levelToScore', () => {
  it('レベル0〜4を0〜100点に変換する', () => {
    expect(levelToScore(0)).toBe(0);
    expect(levelToScore(1)).toBe(25);
    expect(levelToScore(2)).toBe(50);
    expect(levelToScore(3)).toBe(75);
    expect(levelToScore(4)).toBe(100);
  });
});

describe('validateAnswers', () => {
  it('カタログ全項目が揃っていれば例外を投げない', () => {
    expect(() => validateAnswers(buildAnswers(2))).not.toThrow();
  });

  it('未回答項目があるとエラーを投げる', () => {
    const answers = buildAnswers(2);
    delete answers[MATURITY_CATALOG[0].itemId];

    expect(() => validateAnswers(answers)).toThrow(/未回答の診断項目があります/);
  });

  it('カタログに存在しない項目IDが含まれるとエラーを投げる', () => {
    const answers = buildAnswers(2, { unknown_item: 3 as MaturityLevel });

    expect(() => validateAnswers(answers)).toThrow(/未定義の診断項目IDが含まれています/);
  });

  it('レベルが範囲外(5)だとエラーを投げる', () => {
    const answers = buildAnswers(2, { [MATURITY_CATALOG[0].itemId]: 5 as MaturityLevel });

    expect(() => validateAnswers(answers)).toThrow(/診断レベルは0〜4の整数で指定してください/);
  });

  it('レベルが範囲外(負数)だとエラーを投げる', () => {
    const answers = buildAnswers(2, { [MATURITY_CATALOG[0].itemId]: -1 as MaturityLevel });

    expect(() => validateAnswers(answers)).toThrow(/診断レベルは0〜4の整数で指定してください/);
  });

  it('レベルが整数でない(小数)場合はエラーを投げる', () => {
    const answers = buildAnswers(2, { [MATURITY_CATALOG[0].itemId]: 2.5 as MaturityLevel });

    expect(() => validateAnswers(answers)).toThrow(/診断レベルは0〜4の整数で指定してください/);
  });
});

describe('assessDigitalMaturity', () => {
  it('全項目レベル4(満点)の場合、各領域スコア・総合スコアが100になる', () => {
    const result = assessDigitalMaturity(buildAnswers(4));

    expect(result.salesScore).toBe(100);
    expect(result.adminScore).toBe(100);
    expect(result.hrScore).toBe(100);
    expect(result.infraScore).toBe(100);
    expect(result.overallScore).toBe(100);
  });

  it('全項目レベル0(未導入)の場合、各領域スコア・総合スコアが0になる', () => {
    const result = assessDigitalMaturity(buildAnswers(0));

    expect(result.salesScore).toBe(0);
    expect(result.adminScore).toBe(0);
    expect(result.hrScore).toBe(0);
    expect(result.infraScore).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  it('総合スコアは4領域スコアの単純平均になる(項目数が領域ごとに異なっても均等重み)', () => {
    // sales/admin/hrは3項目、infraは4項目 → 項目単純平均だと総合スコアが歪むが、
    // 領域単純平均であることを検証する
    const answers = buildAnswers(4, {});
    for (const item of MATURITY_CATALOG.filter((i) => i.areaId === 'infra')) {
      answers[item.itemId] = 0;
    }

    const result = assessDigitalMaturity(answers);

    expect(result.infraScore).toBe(0);
    expect(result.salesScore).toBe(100);
    // (100 + 100 + 100 + 0) / 4 = 75
    expect(result.overallScore).toBe(75);
  });

  it('領域スコアは領域内項目の平均になる', () => {
    const answers = buildAnswers(4);
    const salesItems = MATURITY_CATALOG.filter((i) => i.areaId === 'sales');
    answers[salesItems[0].itemId] = 0; // 他は4のまま

    const result = assessDigitalMaturity(answers);

    // sales領域3項目: 0,100,100 → 平均66.7
    expect(result.salesScore).toBeCloseTo(66.7, 1);
  });

  it('areaScoresに4領域全てが含まれ、各itemScoresが対応する', () => {
    const result = assessDigitalMaturity(buildAnswers(2));

    expect(result.areaScores).toHaveLength(4);
    const areaIds = result.areaScores.map((a) => a.areaId).sort();
    expect(areaIds).toEqual(['admin', 'hr', 'infra', 'sales']);

    const totalItems = result.areaScores.reduce((sum, area) => sum + area.itemScores.length, 0);
    expect(totalItems).toBe(MATURITY_CATALOG.length);
  });

  it('不正な回答が渡されるとエラーを投げてDB保存以前に処理を止める', () => {
    const answers = buildAnswers(2);
    delete answers[MATURITY_CATALOG[0].itemId];

    expect(() => assessDigitalMaturity(answers)).toThrow();
  });
});

describe('buildPriorityImprovements', () => {
  it('レベル3未満(0〜2)の項目のみを改善優先度リストに含める', () => {
    const result = assessDigitalMaturity(buildAnswers(3));

    expect(result.priorityImprovements).toEqual([]);
  });

  it('レベルが低い項目ほどリストの先頭に来る(昇順ソート)', () => {
    const answers = buildAnswers(4);
    const [itemA, itemB] = MATURITY_CATALOG;
    answers[itemA.itemId] = 2;
    answers[itemB.itemId] = 0;

    const result = assessDigitalMaturity(answers);

    expect(result.priorityImprovements[0].itemId).toBe(itemB.itemId);
    expect(result.priorityImprovements[0].level).toBe(0);
    expect(result.priorityImprovements[1].itemId).toBe(itemA.itemId);
    expect(result.priorityImprovements[1].level).toBe(2);
  });

  it('各改善項目にaction(改善アクション文言)が含まれる', () => {
    const result = assessDigitalMaturity(buildAnswers(0));

    expect(result.priorityImprovements).toHaveLength(MATURITY_CATALOG.length);
    for (const improvement of result.priorityImprovements) {
      expect(improvement.action.length).toBeGreaterThan(0);
      expect(improvement.areaLabel.length).toBeGreaterThan(0);
    }
  });

  it('buildPriorityImprovementsを直接呼び出しても同じ結果になる', () => {
    const result = assessDigitalMaturity(buildAnswers(1));
    const itemScores = result.areaScores.flatMap((area) => area.itemScores);

    expect(buildPriorityImprovements(itemScores)).toEqual(result.priorityImprovements);
  });
});
