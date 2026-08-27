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
  /** 年1回の役員賞与総額(円)。賞与なしの場合は0 */
  bonusAnnual: number;
  /** 賞与が「事前確定届出給与」として税務署に事前届出済みで法人税の損金算入要件を満たしているか(bonusAnnualが0の場合は無視) */
  bonusPreNotified: boolean;
}

export interface SimulateExecutiveCompensationInput {
  /** 都道府県名(協会けんぽの健康保険料率決定に使用。例: "福岡") */
  prefecture: string;
  /** 40〜64歳で介護保険第2号被保険者に該当するか */
  careInsuranceApplicable: boolean;
  /**
   * 会社の実効税率(法人税・地方法人税・法人住民税・事業税の合計、0〜1の小数)。
   * current/proposedのいずれかでbonusAnnual>0かつbonusPreNotified=falseの場合にのみ使用する(それ以外は未指定でよい)。
   */
  effectiveCorporateTaxRate?: number;
  current: CompensationPattern;
  proposed: CompensationPattern;
}

/** 1パターン分の試算結果の内訳 */
export interface CompensationBreakdown {
  monthlyCompensation: number;
  travelAllowanceMonthly: number;
  bonusAnnual: number;
  /** 年間の受取総額(役員報酬+旅費規程支給+賞与、課税・非課税問わず合計) */
  annualTotalReceived: number;
  /** 年間の課税対象給与収入(役員報酬+賞与、旅費規程支給分は非課税のため含まない) */
  annualTaxableSalary: number;
  /** 年間の旅費規程支給額(非課税) */
  annualTravelAllowance: number;

  healthInsuranceGrade: number;
  pensionGrade: number | null;
  standardRemunerationHealth: number;
  standardRemunerationPension: number;
  /** 賞与にかかる標準賞与額(健康保険。年度累計573万円上限適用後、賞与0の場合は0) */
  standardBonusAmountHealth: number;
  /** 賞与にかかる標準賞与額(厚生年金。1回150万円上限適用後、賞与0の場合は0) */
  standardBonusAmountPension: number;

  /** 健康保険料(年間、月額報酬分+賞与分の合計) */
  healthInsuranceEmployeeAnnual: number;
  healthInsuranceEmployerAnnual: number;
  /** 厚生年金保険料(年間、月額報酬分+賞与分の合計) */
  pensionEmployeeAnnual: number;
  pensionEmployerAnnual: number;
  employmentInsuranceEmployeeAnnual: number;
  employmentInsuranceEmployerAnnual: number;
  socialInsuranceEmployeeAnnualTotal: number;
  socialInsuranceEmployerAnnualTotal: number;
  /**
   * 賞与が「事前確定届出給与」の要件を満たさない場合に生じる、会社側の追加コスト
   * (賞与全額が損金不算入となることによる法人税相当額の増加。届出済み/賞与0の場合は0)
   */
  bonusCorporateTaxCost: number;

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
    /** 賞与の損金不算入による会社の法人税負担相当額の年間増減 */
    corporateTaxImpactChange: number;
    /** 会社負担の総コスト増減(事業主負担社会保険料+法人税影響の合計) */
    employerTotalCostChange: number;
    /** 個人の税・社会保険料合計負担の年間増減(マイナス=負担減) */
    personalTaxAndInsuranceChange: number;
  };
  notes: string[];
}
