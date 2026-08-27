import {
  computeIncomeTax,
  computeSalaryIncome,
  computeSalaryIncomeDeduction,
  truncateToThousand,
} from '../../src/incomeTax.js';

describe('truncateToThousand', () => {
  it('1,000円未満を切り捨てる', () => {
    expect(truncateToThousand(1999999)).toBe(1999000);
    expect(truncateToThousand(1000)).toBe(1000);
    expect(truncateToThousand(999)).toBe(0);
  });

  it('負数は0として扱う', () => {
    expect(truncateToThousand(-500)).toBe(0);
  });
});

describe('computeSalaryIncomeDeduction', () => {
  it('65万円以下は収入全額が控除される(給与所得0円)', () => {
    expect(computeSalaryIncomeDeduction(500000)).toBe(500000);
  });

  it('65万円超190万円以下は定額65万円', () => {
    expect(computeSalaryIncomeDeduction(1000000)).toBe(650000);
    expect(computeSalaryIncomeDeduction(1900000)).toBe(650000);
  });

  it('360万円超660万円以下は収入×20%+44万円', () => {
    expect(computeSalaryIncomeDeduction(6000000)).toBe(6000000 * 0.2 + 440000);
  });

  it('850万円超は195万円で頭打ち', () => {
    expect(computeSalaryIncomeDeduction(9600000)).toBe(1950000);
    expect(computeSalaryIncomeDeduction(20000000)).toBe(1950000);
  });
});

describe('computeSalaryIncome', () => {
  it('年収960万円は給与所得控除195万円(上限)を差し引いた765万円になる', () => {
    expect(computeSalaryIncome(9600000)).toBe(9600000 - 1950000);
  });
});

describe('computeIncomeTax', () => {
  it('課税所得3,299,000円(10%区分)を正しく計算する', () => {
    const result = computeIncomeTax(3299000);
    expect(result.incomeTax).toBe(3299000 * 0.1 - 97500);
    expect(result.reconstructionTax).toBe(Math.round(result.incomeTax * 0.021));
    expect(result.total).toBe(result.incomeTax + result.reconstructionTax);
  });

  it('課税所得3,300,000円(20%区分の下限)を正しく計算する', () => {
    const result = computeIncomeTax(3300000);
    expect(result.incomeTax).toBe(3300000 * 0.2 - 427500);
  });

  it('1,000円未満の端数を切り捨ててから税率を適用する', () => {
    const result = computeIncomeTax(1999999);
    expect(result.incomeTax).toBe(Math.round(1999000 * 0.1 - 97500));
  });

  it('課税所得0円は税額0円になる', () => {
    const result = computeIncomeTax(0);
    expect(result.total).toBe(0);
  });

  it('最高税率区分(4,000万円超)を正しく計算する', () => {
    const result = computeIncomeTax(45000000);
    expect(result.incomeTax).toBe(45000000 * 0.45 - 4796000);
  });
});
