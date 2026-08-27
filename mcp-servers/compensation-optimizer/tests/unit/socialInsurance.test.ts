import {
  computeBonusSocialInsurance,
  computeSocialInsurance,
  findHealthInsuranceGrade,
  findPensionStandardRemuneration,
} from '../../src/socialInsurance.js';

describe('findHealthInsuranceGrade', () => {
  it('報酬月額79万円は健康保険第39級(標準報酬79万円)になる', () => {
    // 実例参照: 「税務財務経営戦略講座」講演内で示された役員報酬シミュレーション(パターンA)
    const grade = findHealthInsuranceGrade(790000);
    expect(grade.healthGrade).toBe(39);
    expect(grade.standardAmount).toBe(790000);
  });

  it('報酬月額50万円は健康保険第30級(標準報酬50万円)になる', () => {
    // 同上(パターンB)
    const grade = findHealthInsuranceGrade(500000);
    expect(grade.healthGrade).toBe(30);
    expect(grade.standardAmount).toBe(500000);
  });

  it('報酬月額が最低等級未満(5万円)でも第1級(58,000円)になる', () => {
    expect(findHealthInsuranceGrade(50000).healthGrade).toBe(1);
  });

  it('報酬月額が最高等級を超えても第50級(1,390,000円)になる', () => {
    expect(findHealthInsuranceGrade(2000000).healthGrade).toBe(50);
  });
});

describe('findPensionStandardRemuneration', () => {
  it('報酬月額79万円は厚生年金の上限(第32級・65万円)にキャップされる', () => {
    const result = findPensionStandardRemuneration(790000);
    expect(result.standardAmount).toBe(650000);
    expect(result.pensionGrade).toBe(32);
  });

  it('報酬月額50万円は厚生年金上限未満のため実額(50万円)がそのまま使われる', () => {
    const result = findPensionStandardRemuneration(500000);
    expect(result.standardAmount).toBe(500000);
    expect(result.pensionGrade).toBe(27);
  });

  it('報酬月額が低い場合は厚生年金の下限(第1級・88,000円)になる', () => {
    const result = findPensionStandardRemuneration(50000);
    expect(result.standardAmount).toBe(88000);
    expect(result.pensionGrade).toBe(1);
  });
});

describe('computeSocialInsurance', () => {
  it('東京・介護保険非該当で健康保険料率9.91%を適用する', () => {
    const result = computeSocialInsurance(500000, 6000000, '東京', false);
    const expectedMonthlyEmployee = (500000 * 0.0991) / 2;
    expect(result.healthInsuranceEmployeeAnnual).toBe(Math.round(expectedMonthlyEmployee * 12));
    expect(result.healthInsuranceEmployeeAnnual).toBe(result.healthInsuranceEmployerAnnual);
  });

  it('厚生年金保険料は労使折半(18.3%の半分=9.15%)で計算する', () => {
    const result = computeSocialInsurance(500000, 6000000, '東京', false);
    expect(result.pensionEmployeeAnnual).toBe(Math.round(((500000 * 0.183) / 2) * 12));
  });

  it('雇用保険料は年間の課税対象給与収入(annualTaxableSalary)を基に計算する', () => {
    const result = computeSocialInsurance(500000, 6000000, '東京', false);
    expect(result.employmentInsuranceEmployeeAnnual).toBe(Math.round(6000000 * 0.0055));
    expect(result.employmentInsuranceEmployerAnnual).toBe(Math.round(6000000 * 0.009));
  });

  it('未対応の都道府県を指定するとエラーになる', () => {
    expect(() => computeSocialInsurance(500000, 6000000, '存在しない県', false)).toThrow(/未対応の都道府県/);
  });
});

describe('computeBonusSocialInsurance', () => {
  it('賞与が0の場合はすべて0になる', () => {
    const result = computeBonusSocialInsurance(0, '東京', false);
    expect(result.standardBonusAmountHealth).toBe(0);
    expect(result.employeeAnnualTotal).toBe(0);
    expect(result.employerAnnualTotal).toBe(0);
  });

  it('標準賞与額は1,000円未満を切り捨てる', () => {
    const result = computeBonusSocialInsurance(1234567, '東京', false);
    expect(result.standardBonusAmountHealth).toBe(1234000);
    expect(result.standardBonusAmountPension).toBe(1234000);
  });

  it('健康保険の標準賞与額は年573万円が上限になる(厚生年金は150万円のまま)', () => {
    const result = computeBonusSocialInsurance(7000000, '東京', false);
    expect(result.standardBonusAmountHealth).toBe(5730000);
    expect(result.standardBonusAmountPension).toBe(1500000);
  });

  it('厚生年金の標準賞与額は1回150万円が上限になる', () => {
    const result = computeBonusSocialInsurance(2000000, '東京', false);
    expect(result.standardBonusAmountPension).toBe(1500000);
  });

  it('健康保険料・厚生年金保険料は労使折半で計算する', () => {
    const result = computeBonusSocialInsurance(2000000, '東京', false);
    expect(result.healthInsuranceEmployeeAnnual).toBe(result.healthInsuranceEmployerAnnual);
    expect(result.pensionEmployeeAnnual).toBe(result.pensionEmployerAnnual);
    expect(result.healthInsuranceEmployeeAnnual).toBe(Math.round((2000000 * 0.0991) / 2));
    expect(result.pensionEmployeeAnnual).toBe(Math.round((1500000 * 0.183) / 2));
  });

  it('未対応の都道府県を指定するとエラーになる', () => {
    expect(() => computeBonusSocialInsurance(1000000, '存在しない県', false)).toThrow(/未対応の都道府県/);
  });
});
