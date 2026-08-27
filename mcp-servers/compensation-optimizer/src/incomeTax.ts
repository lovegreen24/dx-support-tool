import { INCOME_TAX_BASIC_DEDUCTION, INCOME_TAX_BRACKETS, RECONSTRUCTION_TAX_RATE } from './rateTables.js';

/** 課税所得の端数処理(1,000円未満切り捨て。国税庁の速算表の適用ルール) */
export function truncateToThousand(amount: number): number {
  return Math.floor(Math.max(0, amount) / 1000) * 1000;
}

/**
 * 給与収入額から給与所得控除額を算出する(令和7年分以降の速算表)。
 * 65万円未満の収入は全額が控除され給与所得は0円になる。
 * 出典: 国税庁No.1410(令和7年分以降)。
 *
 * 注意: 給与収入660万円未満は、法律上は本来「給与所得控除後の給与等の金額の表」
 * (4,000円刻みの号俸表・国税庁「年末調整のしかた」別表第五)を用いるのが正式であり、
 * この速算式による概算値とは数千円〜数万円程度のズレが生じる場合がある。
 */
export function computeSalaryIncomeDeduction(annualIncome: number): number {
  if (annualIncome <= 0) return 0;
  if (annualIncome <= 650000) return annualIncome;
  if (annualIncome <= 1900000) return 650000;
  if (annualIncome <= 3600000) return annualIncome * 0.3 + 80000;
  if (annualIncome <= 6600000) return annualIncome * 0.2 + 440000;
  if (annualIncome <= 8500000) return annualIncome * 0.1 + 1100000;
  return 1950000;
}

/** 給与収入から給与所得(給与所得控除後の金額)を算出する */
export function computeSalaryIncome(annualIncome: number): number {
  return Math.max(0, annualIncome - computeSalaryIncomeDeduction(annualIncome));
}

/**
 * 所得税額を算出する(累進速算表+復興特別所得税2.1%)。
 * @param taxableIncome 所得税の課税所得(給与所得から社会保険料控除・基礎控除等を差し引いた後の金額)
 */
export function computeIncomeTax(taxableIncome: number): {
  incomeTax: number;
  reconstructionTax: number;
  total: number;
} {
  const truncated = truncateToThousand(taxableIncome);
  const bracket = INCOME_TAX_BRACKETS.find((b) => b.max === null || truncated <= b.max);
  if (!bracket) {
    throw new Error('所得税速算表に該当する区分が見つかりません');
  }
  const incomeTax = Math.max(0, Math.round(truncated * bracket.rate - bracket.deduction));
  const reconstructionTax = Math.round(incomeTax * RECONSTRUCTION_TAX_RATE);
  return { incomeTax, reconstructionTax, total: incomeTax + reconstructionTax };
}

export { INCOME_TAX_BASIC_DEDUCTION };
