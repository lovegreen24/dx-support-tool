import {
  INCOME_TAX_BASIC_DEDUCTION,
  computeIncomeTax,
  computeSalaryIncome,
  computeSalaryIncomeDeduction,
} from './incomeTax.js';
import { RESIDENT_TAX_BASIC_DEDUCTION, computeResidentTax } from './residentTax.js';
import { computeSocialInsurance } from './socialInsurance.js';
import type { CompensationBreakdown, CompensationPattern, SimulateExecutiveCompensationOutput } from './types.js';

/**
 * 1パターン(現行 or 変更後)の役員報酬・旅費規程の組み合わせから、
 * 社会保険料・所得税・住民税・年間手取り額までを試算する(純粋関数)。
 *
 * 前提・簡易化した点(注記としてoutputのnotesにも明記する):
 * - 賞与は対象外(月額の役員報酬・旅費規程支給のみを対象とする)
 * - 所得控除は給与所得控除・社会保険料控除・基礎控除のみを考慮する
 *   (配偶者控除・扶養控除・生命保険料控除・小規模企業共済等掛金控除等は含まない)
 * - 給与所得控除は速算式を用いる(年収660万円未満は年末調整の号俸表と数千円〜数万円のズレが生じ得る)
 */
export function computeCompensationBreakdown(
  pattern: CompensationPattern,
  prefecture: string,
  careInsuranceApplicable: boolean,
): CompensationBreakdown {
  const annualTaxableSalary = pattern.monthlyCompensation * 12;
  const annualTravelAllowance = pattern.travelAllowanceMonthly * 12;
  const annualTotalReceived = annualTaxableSalary + annualTravelAllowance;

  const socialInsurance = computeSocialInsurance(
    pattern.monthlyCompensation,
    annualTaxableSalary,
    prefecture,
    careInsuranceApplicable,
  );

  const salaryIncomeDeduction = computeSalaryIncomeDeduction(annualTaxableSalary);
  const salaryIncome = computeSalaryIncome(annualTaxableSalary);

  const taxableIncomeNational = Math.max(
    0,
    salaryIncome - socialInsurance.employeeAnnualTotal - INCOME_TAX_BASIC_DEDUCTION,
  );
  const taxableIncomeResident = Math.max(
    0,
    salaryIncome - socialInsurance.employeeAnnualTotal - RESIDENT_TAX_BASIC_DEDUCTION,
  );

  const { incomeTax, reconstructionTax, total: incomeTaxTotal } = computeIncomeTax(taxableIncomeNational);
  const { incomeLevy, perCapitaLevy, total: residentTaxTotal } = computeResidentTax(taxableIncomeResident);

  const netAnnualIncome =
    annualTotalReceived - incomeTaxTotal - residentTaxTotal - socialInsurance.employeeAnnualTotal;

  return {
    monthlyCompensation: pattern.monthlyCompensation,
    travelAllowanceMonthly: pattern.travelAllowanceMonthly,
    annualTotalReceived,
    annualTaxableSalary,
    annualTravelAllowance,

    healthInsuranceGrade: socialInsurance.healthInsuranceGrade,
    pensionGrade: socialInsurance.pensionGrade,
    standardRemunerationHealth: socialInsurance.standardRemunerationHealth,
    standardRemunerationPension: socialInsurance.standardRemunerationPension,

    healthInsuranceEmployeeAnnual: socialInsurance.healthInsuranceEmployeeAnnual,
    healthInsuranceEmployerAnnual: socialInsurance.healthInsuranceEmployerAnnual,
    pensionEmployeeAnnual: socialInsurance.pensionEmployeeAnnual,
    pensionEmployerAnnual: socialInsurance.pensionEmployerAnnual,
    employmentInsuranceEmployeeAnnual: socialInsurance.employmentInsuranceEmployeeAnnual,
    employmentInsuranceEmployerAnnual: socialInsurance.employmentInsuranceEmployerAnnual,
    socialInsuranceEmployeeAnnualTotal: socialInsurance.employeeAnnualTotal,
    socialInsuranceEmployerAnnualTotal: socialInsurance.employerAnnualTotal,

    salaryIncomeDeduction,
    salaryIncome,
    taxableIncomeNational,
    taxableIncomeResident,

    incomeTax,
    reconstructionTax,
    incomeTaxTotal,

    residentTaxIncomeLevy: incomeLevy,
    residentTaxPerCapitaLevy: perCapitaLevy,
    residentTaxTotal,

    netAnnualIncome,
  };
}

const SIMULATION_NOTES: readonly string[] = [
  '本試算は概算値です。配偶者控除・扶養控除・生命保険料控除・小規模企業共済等掛金控除等の個別事情は考慮していません。',
  '給与所得控除は国税庁の速算式を用いています。年収660万円未満の場合、年末調整で用いる「給与所得控除後の給与等の金額の表」(4,000円刻み)とは数千円〜数万円程度の差が生じる場合があります。',
  '賞与は試算の対象外です(月額の役員報酬・旅費規程支給のみを対象としています)。',
  '旅費規程による日当・宿泊費が非課税となるには、実費相当・社会通念上相当な金額であること等の要件(所得税基本通達9-3)を満たす必要があります。' +
    '金額の法定上限はなく、同業他社比較や実態(出張実績)との整合性が税務調査での判断基準になります。',
  '役員報酬(給与)は消費税の不課税ですが、旅費規程に基づく出張旅費・宿泊費・日当のうち通常必要な部分は会社側の課税仕入れとして仕入税額控除の対象になり得ます(国税庁質疑応答事例)。' +
    'ただし会社全体の消費税納税額への影響は課税売上・課税仕入れの状況によるため、個別に確認してください。',
  '本試算は最終的な税務判断を保証するものではありません。実際の申告・提案前に税理士・社会保険労務士による確認を必ず行ってください。',
];

/** 現行パターンと変更後パターンを比較し、手取り・会社負担の増減を含めた試算結果を返す */
export function simulateExecutiveCompensation(
  currentPattern: CompensationPattern,
  proposedPattern: CompensationPattern,
  prefecture: string,
  careInsuranceApplicable: boolean,
): SimulateExecutiveCompensationOutput {
  const current = computeCompensationBreakdown(currentPattern, prefecture, careInsuranceApplicable);
  const proposed = computeCompensationBreakdown(proposedPattern, prefecture, careInsuranceApplicable);

  const netIncomeChange = proposed.netAnnualIncome - current.netAnnualIncome;
  const employerSocialInsuranceChange =
    proposed.socialInsuranceEmployerAnnualTotal - current.socialInsuranceEmployerAnnualTotal;
  const currentPersonalBurden =
    current.incomeTaxTotal + current.residentTaxTotal + current.socialInsuranceEmployeeAnnualTotal;
  const proposedPersonalBurden =
    proposed.incomeTaxTotal + proposed.residentTaxTotal + proposed.socialInsuranceEmployeeAnnualTotal;

  return {
    current,
    proposed,
    comparison: {
      netIncomeChange,
      employerSocialInsuranceChange,
      personalTaxAndInsuranceChange: proposedPersonalBurden - currentPersonalBurden,
    },
    notes: [...SIMULATION_NOTES],
  };
}
