import { handleSimulateExecutiveCompensation } from '../../src/tools/simulateExecutiveCompensation.js';

describe('handleSimulateExecutiveCompensation', () => {
  const validPattern = {
    monthly_compensation: 500000,
    travel_allowance_monthly: 0,
    bonus_annual: 0,
    bonus_pre_notified: false,
  };

  const validInput = {
    prefecture: '東京',
    care_insurance_applicable: false,
    current: validPattern,
    proposed: { ...validPattern, monthly_compensation: 600000 },
  };

  it('正常な入力を受け付け、試算結果を返す', () => {
    const result = handleSimulateExecutiveCompensation(validInput);
    expect(result.current.monthlyCompensation).toBe(500000);
    expect(result.proposed.monthlyCompensation).toBe(600000);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it('未対応の都道府県を指定するとエラーになる', () => {
    expect(() => handleSimulateExecutiveCompensation({ ...validInput, prefecture: '存在しない県' })).toThrow(
      /prefecture/,
    );
  });

  it('care_insurance_applicableがboolean以外だとエラーになる', () => {
    expect(() =>
      handleSimulateExecutiveCompensation({
        ...validInput,
        care_insurance_applicable: 'true' as unknown as boolean,
      }),
    ).toThrow(/care_insurance_applicable/);
  });

  describe('current/proposedパターンの検証', () => {
    it('monthly_compensationが負数だとエラーになる', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({
          ...validInput,
          current: { ...validPattern, monthly_compensation: -1 },
        }),
      ).toThrow(/current\.monthly_compensation/);
    });

    it('travel_allowance_monthlyが負数だとエラーになる', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({
          ...validInput,
          proposed: { ...validPattern, travel_allowance_monthly: -1 },
        }),
      ).toThrow(/proposed\.travel_allowance_monthly/);
    });

    it('bonus_annualが負数だとエラーになる', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({
          ...validInput,
          current: { ...validPattern, bonus_annual: -1 },
        }),
      ).toThrow(/current\.bonus_annual/);
    });

    it('bonus_pre_notifiedがboolean以外だとエラーになる', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({
          ...validInput,
          proposed: { ...validPattern, bonus_pre_notified: 'yes' as unknown as boolean },
        }),
      ).toThrow(/proposed\.bonus_pre_notified/);
    });
  });

  describe('effective_corporate_tax_rateの検証', () => {
    it('0〜1の範囲外だとエラーになる(0)', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({ ...validInput, effective_corporate_tax_rate: 0 }),
      ).toThrow(/effective_corporate_tax_rate/);
    });

    it('0〜1の範囲外だとエラーになる(1超)', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({ ...validInput, effective_corporate_tax_rate: 1.5 }),
      ).toThrow(/effective_corporate_tax_rate/);
    });

    it('未届出の賞与があるのに指定が無いとエラーになる', () => {
      expect(() =>
        handleSimulateExecutiveCompensation({
          ...validInput,
          proposed: { ...validPattern, bonus_annual: 1000000, bonus_pre_notified: false },
        }),
      ).toThrow(/effective_corporate_tax_rate/);
    });

    it('賞与が事前確定届出済みなら指定が無くてもエラーにならない', () => {
      const result = handleSimulateExecutiveCompensation({
        ...validInput,
        proposed: { ...validPattern, bonus_annual: 1000000, bonus_pre_notified: true },
      });
      expect(result.proposed.bonusCorporateTaxCost).toBe(0);
    });

    it('賞与が0なら未届出でも指定が無くてもエラーにならない', () => {
      const result = handleSimulateExecutiveCompensation({
        ...validInput,
        proposed: { ...validPattern, bonus_annual: 0, bonus_pre_notified: false },
      });
      expect(result.proposed.bonusCorporateTaxCost).toBe(0);
    });

    it('未届出の賞与に対し指定があれば法人税影響コストが計算される', () => {
      const result = handleSimulateExecutiveCompensation({
        ...validInput,
        proposed: { ...validPattern, bonus_annual: 1000000, bonus_pre_notified: false },
        effective_corporate_tax_rate: 0.3,
      });
      expect(result.proposed.bonusCorporateTaxCost).toBe(300000);
    });
  });
});
