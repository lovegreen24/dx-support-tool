import {
  EMPLOYMENT_INSURANCE_EMPLOYEE_RATE,
  EMPLOYMENT_INSURANCE_EMPLOYER_RATE,
  HEALTH_INSURANCE_GRADES,
  HEALTH_INSURANCE_RATE_BY_PREFECTURE,
  PENSION_RATE,
  type StandardRemunerationGrade,
} from './rateTables.js';

const PENSION_FLOOR_STANDARD_AMOUNT = 88000; // 厚生年金 第1級
const PENSION_CAP_STANDARD_AMOUNT = 650000; // 厚生年金 第32級(上限)

/** 報酬月額から健康保険の標準報酬月額の等級を求める(協会けんぽ第1級〜第50級) */
export function findHealthInsuranceGrade(monthlyCompensation: number): StandardRemunerationGrade {
  const grade = HEALTH_INSURANCE_GRADES.find(
    (g) => monthlyCompensation >= g.lower && (g.upper === null || monthlyCompensation < g.upper),
  );
  if (!grade) {
    // 理論上到達しないが、念のため最上位等級にフォールバック
    return HEALTH_INSURANCE_GRADES[HEALTH_INSURANCE_GRADES.length - 1];
  }
  return grade;
}

/**
 * 報酬月額から厚生年金保険の標準報酬月額を求める。
 * 厚生年金は健康保険と別の等級表(第1級=88,000円〜第32級=650,000円)を持ち、
 * 健康保険の等級がそれより高い/低い場合はそれぞれ下限/上限額に丸められる。
 */
export function findPensionStandardRemuneration(monthlyCompensation: number): {
  pensionGrade: number | null;
  standardAmount: number;
} {
  if (monthlyCompensation < 93000) {
    return { pensionGrade: 1, standardAmount: PENSION_FLOOR_STANDARD_AMOUNT };
  }
  const healthGrade = findHealthInsuranceGrade(monthlyCompensation);
  if (healthGrade.pensionGrade !== null) {
    return { pensionGrade: healthGrade.pensionGrade, standardAmount: healthGrade.standardAmount };
  }
  // 健康保険の等級が厚生年金の等級表(第32級)を超える場合は上限額に固定
  return { pensionGrade: 32, standardAmount: PENSION_CAP_STANDARD_AMOUNT };
}

export interface SocialInsuranceResult {
  healthInsuranceGrade: number;
  pensionGrade: number | null;
  standardRemunerationHealth: number;
  standardRemunerationPension: number;
  healthInsuranceEmployeeAnnual: number;
  healthInsuranceEmployerAnnual: number;
  pensionEmployeeAnnual: number;
  pensionEmployerAnnual: number;
  employmentInsuranceEmployeeAnnual: number;
  employmentInsuranceEmployerAnnual: number;
  employeeAnnualTotal: number;
  employerAnnualTotal: number;
}

/**
 * 月額報酬(旅費規程支給分を除く課税対象の役員報酬)から年間の社会保険料を算出する。
 * 健康保険・厚生年金は労使折半、雇用保険は労使で料率が異なる。
 *
 * @param monthlyCompensation 標準報酬月額の算定基礎となる報酬月額(課税対象の役員報酬。旅費規程支給分は含めない)
 * @param annualTaxableSalary 雇用保険料の算定基礎となる年間の課税対象給与収入(賃金総額相当)
 */
export function computeSocialInsurance(
  monthlyCompensation: number,
  annualTaxableSalary: number,
  prefecture: string,
  careInsuranceApplicable: boolean,
): SocialInsuranceResult {
  const healthGrade = findHealthInsuranceGrade(monthlyCompensation);
  const pension = findPensionStandardRemuneration(monthlyCompensation);

  const prefRate = HEALTH_INSURANCE_RATE_BY_PREFECTURE[prefecture];
  if (!prefRate) {
    throw new Error(`未対応の都道府県です: ${prefecture}`);
  }
  // careApplicableは「健康保険料率+介護保険料率」の合算値。非該当の場合はnormal(健康保険料率のみ)を使う。
  const effectiveHealthRate = careInsuranceApplicable ? prefRate.careApplicable : prefRate.normal;

  const healthInsuranceMonthlyTotal = healthGrade.standardAmount * effectiveHealthRate;
  const healthInsuranceEmployeeAnnual = Math.round((healthInsuranceMonthlyTotal / 2) * 12);
  const healthInsuranceEmployerAnnual = healthInsuranceEmployeeAnnual;

  const pensionMonthlyTotal = pension.standardAmount * PENSION_RATE;
  const pensionEmployeeAnnual = Math.round((pensionMonthlyTotal / 2) * 12);
  const pensionEmployerAnnual = pensionEmployeeAnnual;

  const employmentInsuranceEmployeeAnnual = Math.round(annualTaxableSalary * EMPLOYMENT_INSURANCE_EMPLOYEE_RATE);
  const employmentInsuranceEmployerAnnual = Math.round(annualTaxableSalary * EMPLOYMENT_INSURANCE_EMPLOYER_RATE);

  const employeeAnnualTotal = healthInsuranceEmployeeAnnual + pensionEmployeeAnnual + employmentInsuranceEmployeeAnnual;
  const employerAnnualTotal = healthInsuranceEmployerAnnual + pensionEmployerAnnual + employmentInsuranceEmployerAnnual;

  return {
    healthInsuranceGrade: healthGrade.healthGrade,
    pensionGrade: pension.pensionGrade,
    standardRemunerationHealth: healthGrade.standardAmount,
    standardRemunerationPension: pension.standardAmount,
    healthInsuranceEmployeeAnnual,
    healthInsuranceEmployerAnnual,
    pensionEmployeeAnnual,
    pensionEmployerAnnual,
    employmentInsuranceEmployeeAnnual,
    employmentInsuranceEmployerAnnual,
    employeeAnnualTotal,
    employerAnnualTotal,
  };
}
