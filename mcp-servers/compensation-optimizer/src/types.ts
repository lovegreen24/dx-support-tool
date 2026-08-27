/**
 * 役員報酬・旅費規程シミュレーションMCPの型定義。
 * 本MCPは永続化を持たない純粋な計算ツール(コンサルタント本人が提案時に都度試算する内部用途)。
 */

/** 役員報酬の1パターン(現行 or 変更後)の入力 */
export interface CompensationPattern {
  /** 役員報酬(課税対象の月額給与) */
  monthlyCompensation: number;
  /** 旅費規程に基づく月額支給額(非課税の日当・宿泊費等の合計) */
  travelAllowanceMonthly: number;
}

export interface SimulateExecutiveCompensationInput {
  /** 都道府県名(協会けんぽの健康保険料率決定に使用。例: "福岡") */
  prefecture: string;
  /** 40〜64歳で介護保険第2号被保険者に該当するか */
  careInsuranceApplicable: boolean;
  current: CompensationPattern;
  proposed: CompensationPattern;
}

/** 1パターン分の試算結果の内訳 */
export interface CompensationBreakdown {
  monthlyCompensation: number;
  travelAllowanceMonthly: number;
  /** 年間の受取総額(役員報酬+旅費規程支給、課税・非課税問わず合計) */
  annualTotalReceived: number;
  /** 年間の課税対象給与収入(役員報酬のみ、旅費規程支給分は非課税のため含まない) */
  annualTaxableSalary: number;
  /** 年間の旅費規程支給額(非課税) */
  annualTravelAllowance: number;

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
  socialInsuranceEmployeeAnnualTotal: number;
  socialInsuranceEmployerAnnualTotal: number;

  salaryIncomeDeduction: number;
  salaryIncome: number;
  taxableIncomeNational: number;
  taxableIncomeResident: number;

  incomeTax: number;
  reconstructionTax: number;
  incomeTaxTotal: number;

  residentTaxIncomeLevy: number;
  residentTaxPerCapitaLevy: number;
  residentTaxTotal: number;

  /** 年間手取り額(受取総額 − 所得税等 − 住民税 − 社会保険料本人負担) */
  netAnnualIncome: number;
}

export interface SimulateExecutiveCompensationOutput {
  current: CompensationBreakdown;
  proposed: CompensationBreakdown;
  comparison: {
    /** 個人の年間手取り増減(proposed - current) */
    netIncomeChange: number;
    /** 会社負担の社会保険料(事業主負担分)年間増減 */
    employerSocialInsuranceChange: number;
    /** 個人の税・社会保険料合計負担の年間増減(マイナス=負担減) */
    personalTaxAndInsuranceChange: number;
  };
  notes: string[];
}
