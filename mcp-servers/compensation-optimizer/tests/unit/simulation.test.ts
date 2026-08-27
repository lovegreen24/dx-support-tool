import { computeCompensationBreakdown, simulateExecutiveCompensation } from '../../src/simulation.js';

describe('computeCompensationBreakdown', () => {
  it('年間の受取総額は役員報酬と旅費規程支給の合計になる', () => {
    const result = computeCompensationBreakdown(
      { monthlyCompensation: 500000, travelAllowanceMonthly: 300000 },
      '東京',
      false,
    );
    expect(result.annualTaxableSalary).toBe(6000000);
    expect(result.annualTravelAllowance).toBe(3600000);
    expect(result.annualTotalReceived).toBe(9600000);
  });

  it('旅費規程支給分は課税対象に含まれない', () => {
    const result = computeCompensationBreakdown(
      { monthlyCompensation: 500000, travelAllowanceMonthly: 300000 },
      '東京',
      false,
    );
    // 給与所得は役員報酬(月50万円×12=600万円)のみを基に計算される
    expect(result.salaryIncome).toBeLessThan(6000000);
    expect(result.salaryIncome).toBeGreaterThan(0);
  });

  it('手取り額は受取総額から所得税・住民税・社会保険料本人負担を差し引いた額になる', () => {
    const result = computeCompensationBreakdown(
      { monthlyCompensation: 500000, travelAllowanceMonthly: 0 },
      '東京',
      false,
    );
    const expectedNet =
      result.annualTotalReceived -
      result.incomeTaxTotal -
      result.residentTaxTotal -
      result.socialInsuranceEmployeeAnnualTotal;
    expect(result.netAnnualIncome).toBe(expectedNet);
  });
});

describe('simulateExecutiveCompensation', () => {
  // 実例参照: 「税務財務経営戦略講座」講演内の役員報酬シミュレーション。
  // 現行(パターンA): 役員報酬 月80万円のみ(年収960万円)
  // 変更後(パターンB): 役員報酬 月50万円 + 旅費規程支給 月30万円(受取総額は同じ年960万円)
  const current = { monthlyCompensation: 800000, travelAllowanceMonthly: 0 };
  const proposed = { monthlyCompensation: 500000, travelAllowanceMonthly: 300000 };

  it('標準報酬月額が第39級(79万円)から第30級(50万円)に下がる', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.current.healthInsuranceGrade).toBe(39);
    expect(result.proposed.healthInsuranceGrade).toBe(30);
  });

  it('厚生年金の標準報酬は上限65万円から実額50万円に下がる(保険料負担減の方向)', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.current.standardRemunerationPension).toBe(650000);
    expect(result.proposed.standardRemunerationPension).toBe(500000);
  });

  it('受取総額が同じでも、旅費規程活用後は手取りが増加する', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.proposed.annualTotalReceived).toBe(result.current.annualTotalReceived);
    expect(result.comparison.netIncomeChange).toBeGreaterThan(0);
  });

  it('会社負担(事業主分社会保険料)は旅費規程活用後に減少する', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.comparison.employerSocialInsuranceChange).toBeLessThan(0);
  });

  it('個人の税・社会保険料合計負担は旅費規程活用後に減少する', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.comparison.personalTaxAndInsuranceChange).toBeLessThan(0);
  });

  it('前提条件・限界を明記したnotesを返す', () => {
    const result = simulateExecutiveCompensation(current, proposed, '東京', false);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.some((n) => n.includes('概算値'))).toBe(true);
  });
});
