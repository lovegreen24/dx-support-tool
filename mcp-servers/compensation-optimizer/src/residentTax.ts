import { RESIDENT_TAX_BASIC_DEDUCTION, RESIDENT_TAX_INCOME_RATE, RESIDENT_TAX_PER_CAPITA } from './rateTables.js';
import { truncateToThousand } from './incomeTax.js';

export { RESIDENT_TAX_BASIC_DEDUCTION };

/**
 * 住民税額を算出する(所得割10%+均等割5,000円)。
 * @param taxableIncome 住民税の課税所得(給与所得から社会保険料控除・基礎控除(住民税43万円)等を差し引いた後の金額)
 */
export function computeResidentTax(taxableIncome: number): {
  incomeLevy: number;
  perCapitaLevy: number;
  total: number;
} {
  const truncated = truncateToThousand(taxableIncome);
  const incomeLevy = Math.round(truncated * RESIDENT_TAX_INCOME_RATE);
  return { incomeLevy, perCapitaLevy: RESIDENT_TAX_PER_CAPITA, total: incomeLevy + RESIDENT_TAX_PER_CAPITA };
}
