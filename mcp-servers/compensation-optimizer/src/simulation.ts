import {
  INCOME_TAX_BASIC_DEDUCTION,
  computeIncomeTax,
  computeSalaryIncome,
  computeSalaryIncomeDeduction,
} from './incomeTax.js';
import { RESIDENT_TAX_BASIC_DEDUCTION, computeResidentTax } from './residentTax.js';
import { computeBonusSocialInsurance, computeSocialInsurance } from './socialInsurance.js';
import type { CompensationBreakdown, CompensationPattern, SimulateExecutiveCompensationOutput } from './types.js';

/**
 * 1パターン(現行 or 変更後)の役員報酬・旅費規程・賞与の組み合わせから、
 * 社会保険料・所得税・住民税・年間手取り額までを試算する(純粋関数)。
 *
 * 前提・簡易化した点(注記としてoutputのnotesにも明記する):
 * - 所得控除は給与所得控除・社会保険料控除・基礎控除のみを考慮する
 *   (配偶者控除・扶養控除・生命保険料控除・小規模企業共済等掛金控除等は含まない)
 * - 給与所得控除は速算式を用いる(年収660万円未満は年末調整の号俸表と数千円〜数万円のズレが生じ得る)
 *
 * @param effectiveCorporateTaxRate 会社の実効税率。賞与が損金不算入となる場合(bonusPreNotified=false)にのみ使用
 */
export function computeCompensationBreakdown(
  pattern: CompensationPattern,
  prefecture: string,
  careInsuranceApplicable: boolean,
  effectiveCorporateTaxRate?: number,
): CompensationBreakdown {
  const annualBonus = pattern.bonusAnnual;
  const annualTaxableSalary = pattern.monthlyCompensation * 12 + annualBonus;
  const annualTravelAllowance = pattern.travelAllowanceMonthly * 12;
  const annualTotalReceived = annualTaxableSalary + annualTravelAllowance;

  const socialInsurance = computeSocialInsurance(
    pattern.monthlyCompensation,
    annualTaxableSalary,
    prefecture,
    careInsuranceApplicable,
  );
  const bonusSocialInsurance = computeBonusSocialInsurance(annualBonus, prefecture, careInsuranceApplicable);

  const healthInsuranceEmployeeAnnual =
    socialInsurance.healthInsuranceEmployeeAnnual + bonusSocialInsurance.healthInsuranceEmployeeAnnual;
  const healthInsuranceEmployerAnnual =
    socialInsurance.healthInsuranceEmployerAnnual + bonusSocialInsurance.healthInsuranceEmployerAnnual;
  const pensionEmployeeAnnual = socialInsurance.pensionEmployeeAnnual + bonusSocialInsurance.pensionEmployeeAnnual;
  const pensionEmployerAnnual = socialInsurance.pensionEmployerAnnual + bonusSocialInsurance.pensionEmployerAnnual;
  const employeeAnnualTotal =
    healthInsuranceEmployeeAnnual + pensionEmployeeAnnual + socialInsurance.employmentInsuranceEmployeeAnnual;
  const employerAnnualTotal =
    healthInsuranceEmployerAnnual + pensionEmployerAnnual + socialInsurance.employmentInsuranceEmployerAnnual;

  const bonusCorporateTaxCost =
    annualBonus > 0 && !pattern.bonusPreNotified ? Math.round(annualBonus * (effectiveCorporateTaxRate ?? 0)) : 0;

  const salaryIncomeDeduction = computeSalaryIncomeDeduction(annualTaxableSalary);
  const salaryIncome = computeSalaryIncome(annualTaxableSalary);

  const taxableIncomeNational = Math.max(0, salaryIncome - employeeAnnualTotal - INCOME_TAX_BASIC_DEDUCTION);
  const taxableIncomeResident = Math.max(0, salaryIncome - employeeAnnualTotal - RESIDENT_TAX_BASIC_DEDUCTION);

  const { incomeTax, reconstructionTax, total: incomeTaxTotal } = computeIncomeTax(taxableIncomeNational);
  const { incomeLevy, perCapitaLevy, total: residentTaxTotal } = computeResidentTax(taxableIncomeResident);

  const netAnnualIncome = annualTotalReceived - incomeTaxTotal - residentTaxTotal - employeeAnnualTotal;

  return {
    monthlyCompensation: pattern.monthlyCompensation,
    travelAllowanceMonthly: pattern.travelAllowanceMonthly,
    bonusAnnual: annualBonus,
    annualTotalReceived,
    annualTaxableSalary,
    annualTravelAllowance,

    healthInsuranceGrade: socialInsurance.healthInsuranceGrade,
    pensionGrade: socialInsurance.pensionGrade,
    standardRemunerationHealth: socialInsurance.standardRemunerationHealth,
    standardRemunerationPension: socialInsurance.standardRemunerationPension,
    standardBonusAmountHealth: bonusSocialInsurance.standardBonusAmountHealth,
    standardBonusAmountPension: bonusSocialInsurance.standardBonusAmountPension,

    healthInsuranceEmployeeAnnual,
    healthInsuranceEmployerAnnual,
    pensionEmployeeAnnual,
    pensionEmployerAnnual,
    employmentInsuranceEmployeeAnnual: socialInsurance.employmentInsuranceEmployeeAnnual,
    employmentInsuranceEmployerAnnual: socialInsurance.employmentInsuranceEmployerAnnual,
    socialInsuranceEmployeeAnnualTotal: employeeAnnualTotal,
    socialInsuranceEmployerAnnualTotal: employerAnnualTotal,
    bonusCorporateTaxCost,

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
  '賞与の社会保険料は標準賞与額(1,000円未満切り捨て)に基づき、月額報酬分とは別枠で算定しています。' +
    '健康保険は年度累計573万円、厚生年金は1回の支給につき150万円が上限です(いずれも令和7年度時点)。',
  '役員賞与は「事前確定届出給与」として所定の期限(原則、株主総会等の決議日から1か月を経過する日と' +
    '会計期間開始日から4か月を経過する日のいずれか早い日。新設法人は設立の日から2か月以内)までに税務署へ届出し、' +
    '実際に届出どおりの金額・時期で支給しなければ、その賞与額は全額が法人税法上の損金に算入されません(法人税法34条)。' +
    '未届出のケースの法人税影響額は入力された実効税率に基づく概算であり、実際の税額とは乖離する場合があります。',
  '旅費規程による日当・宿泊費が非課税となるには、実費相当・社会通念上相当な金額であること等の要件(所得税基本通達9-3)を満たす必要があります。' +
    '金額の法定上限はなく、同業他社比較や実態(出張実績)との整合性が税務調査での判断基準になります。',
  '役員報酬(給与)は消費税の不課税ですが、旅費規程に基づく出張旅費・宿泊費・日当のうち通常必要な部分は会社側の課税仕入れとして仕入税額控除の対象になり得ます(国税庁質疑応答事例)。' +
    'ただし会社全体の消費税納税額への影響は課税売上・課税仕入れの状況によるため、個別に確認してください。',
  '本試算は最終的な税務判断を保証するものではありません。実際の申告・提案前に税理士・社会保険労務士による確認を必ず行ってください。',
];

/**
 * 現行パターンと変更後パターンを比較し、手取り・会社負担の増減を含めた試算結果を返す。
 * @param effectiveCorporateTaxRate 会社の実効税率。current/proposedいずれかで賞与が損金不算入となる場合にのみ使用
 */
export function simulateExecutiveCompensation(
  currentPattern: CompensationPattern,
  proposedPattern: CompensationPattern,
  prefecture: string,
  careInsuranceApplicable: boolean,
  effectiveCorporateTaxRate?: number,
): SimulateExecutiveCompensationOutput {
  const current = computeCompensationBreakdown(
    currentPattern,
    prefecture,
    careInsuranceApplicable,
    effectiveCorporateTaxRate,
  );
  const proposed = computeCompensationBreakdown(
    proposedPattern,
    prefecture,
    careInsuranceApplicable,
    effectiveCorporateTaxRate,
  );

  const netIncomeChange = proposed.netAnnualIncome - current.netAnnualIncome;
  const employerSocialInsuranceChange =
    proposed.socialInsuranceEmployerAnnualTotal - current.socialInsuranceEmployerAnnualTotal;
  const corporateTaxImpactChange = proposed.bonusCorporateTaxCost - current.bonusCorporateTaxCost;
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
      corporateTaxImpactChange,
      employerTotalCostChange: employerSocialInsuranceChange + corporateTaxImpactChange,
      personalTaxAndInsuranceChange: proposedPersonalBurden - currentPersonalBurden,
    },
    notes: [...SIMULATION_NOTES],
  };
}
