import { matchSubsidies } from '../../src/matching.js';
import type { SubsidyRecord } from '../../src/types.js';

function buildSubsidy(overrides: Partial<SubsidyRecord> = {}): SubsidyRecord {
  return {
    pageId: 'page-1',
    subsidyName: 'IT導入補助金',
    targetIndustries: ['製造業'],
    targetConditions: '',
    organization: '中小企業庁',
    subsidyAmount: '50万円〜450万円',
    applicationDeadline: '2099-12-31',
    status: '募集中',
    detailUrl: 'https://example.com/it-hojo',
    notes: '',
    ...overrides,
  };
}

describe('matchSubsidies', () => {
  it('業種が一致する補助金のみを候補に含める', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a', targetIndustries: ['製造業'] }),
      buildSubsidy({ pageId: 'b', targetIndustries: ['小売業'] }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    expect(results.map((r) => r.pageId)).toEqual(['a']);
  });

  it('全業種対象の補助金はどの業種のクライアントにもマッチする', () => {
    const subsidies = [buildSubsidy({ pageId: 'a', targetIndustries: ['全業種'] })];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: 'サービス業' });

    expect(results).toHaveLength(1);
    expect(results[0].matchReasons).toContain('全業種対象');
  });

  it('業種完全一致は全業種一致よりスコアが高い', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'exact', targetIndustries: ['製造業'] }),
      buildSubsidy({ pageId: 'all', targetIndustries: ['全業種'] }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    const exact = results.find((r) => r.pageId === 'exact')!;
    const all = results.find((r) => r.pageId === 'all')!;
    expect(exact.matchScore).toBeGreaterThan(all.matchScore);
  });

  it('従業員数が台帳の上限(以下)を超える場合は候補から除外する', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a', targetConditions: '従業員50名以下の事業者が対象' }),
    ];

    const results = matchSubsidies(subsidies, {
      clientId: 'c1',
      industry: '製造業',
      employeeCount: 60,
    });

    expect(results).toHaveLength(0);
  });

  it('従業員数が台帳の上限(未満)ちょうどの場合は除外する', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a', targetConditions: '従業員30名未満の事業者が対象' }),
    ];

    const results = matchSubsidies(subsidies, {
      clientId: 'c1',
      industry: '製造業',
      employeeCount: 30,
    });

    expect(results).toHaveLength(0);
  });

  it('従業員数条件を満たす場合はスコアに加点し理由を含める', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a', targetConditions: '従業員50名以下の事業者が対象' }),
    ];

    const results = matchSubsidies(subsidies, {
      clientId: 'c1',
      industry: '製造業',
      employeeCount: 20,
    });

    expect(results).toHaveLength(1);
    expect(results[0].matchReasons.some((r) => r.includes('従業員数条件'))).toBe(true);
  });

  it('キーワードが補助金名・対象条件・備考に一致するとスコア加点する', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a', notes: 'DX推進・クラウド活用に関する補助' }),
      buildSubsidy({ pageId: 'b', notes: '設備投資に関する補助' }),
    ];

    const results = matchSubsidies(subsidies, {
      clientId: 'c1',
      industry: '製造業',
      keywords: ['DX'],
    });

    const scoreWithKeyword = results.find((r) => r.pageId === 'a')!.matchScore;
    const scoreWithoutKeyword = results.find((r) => r.pageId === 'b')!.matchScore;
    expect(scoreWithKeyword).toBeGreaterThan(scoreWithoutKeyword);
  });

  it('デフォルトでは受付終了の補助金を除外する', () => {
    const subsidies = [buildSubsidy({ pageId: 'a', status: '受付終了' })];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    expect(results).toHaveLength(0);
  });

  it('include_closed相当のフラグを立てると受付終了も候補に含める', () => {
    const subsidies = [buildSubsidy({ pageId: 'a', status: '受付終了' })];

    const results = matchSubsidies(subsidies, {
      clientId: 'c1',
      industry: '製造業',
      includeClosed: true,
    });

    expect(results).toHaveLength(1);
  });

  it('デフォルトでは申請締切を過ぎた補助金を除外する', () => {
    const subsidies = [buildSubsidy({ pageId: 'a', applicationDeadline: '2000-01-01' })];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    expect(results).toHaveLength(0);
  });

  it('ステータスに応じてスコアが変わる(募集中 > 締切間近 > 確認中)', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'open', status: '募集中' }),
      buildSubsidy({ pageId: 'near', status: '締切間近' }),
      buildSubsidy({ pageId: 'checking', status: '確認中' }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    const scoreOf = (id: string) => results.find((r) => r.pageId === id)!.matchScore;
    expect(scoreOf('open')).toBeGreaterThan(scoreOf('near'));
    expect(scoreOf('near')).toBeGreaterThan(scoreOf('checking'));
  });

  it('マッチ度スコアの降順でソートされる', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'low', targetIndustries: ['全業種'], status: '確認中' }),
      buildSubsidy({ pageId: 'high', targetIndustries: ['製造業'], status: '募集中' }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    expect(results.map((r) => r.pageId)).toEqual(['high', 'low']);
  });

  it('同スコアの場合は締切が早い順にソートされる', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'later', applicationDeadline: '2099-06-01' }),
      buildSubsidy({ pageId: 'sooner', applicationDeadline: '2099-01-01' }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' });

    expect(results.map((r) => r.pageId)).toEqual(['sooner', 'later']);
  });

  it('max_resultsで返却件数を制限する', () => {
    const subsidies = [
      buildSubsidy({ pageId: 'a' }),
      buildSubsidy({ pageId: 'b' }),
      buildSubsidy({ pageId: 'c' }),
    ];

    const results = matchSubsidies(subsidies, { clientId: 'c1', industry: '製造業' }, 2);

    expect(results).toHaveLength(2);
  });

  it('候補が0件の場合は空配列を返す', () => {
    const results = matchSubsidies([], { clientId: 'c1', industry: '製造業' });

    expect(results).toEqual([]);
  });
});
