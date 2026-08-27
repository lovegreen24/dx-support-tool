import { simulateExecutiveCompensation } from '../simulation.js';
import { HEALTH_INSURANCE_RATE_BY_PREFECTURE } from '../rateTables.js';
import type { SimulateExecutiveCompensationInput, SimulateExecutiveCompensationOutput } from '../types.js';

export const SIMULATE_EXECUTIVE_COMPENSATION_TOOL_NAME = 'simulate_executive_compensation';

export const simulateExecutiveCompensationInputSchema = {
  type: 'object',
  properties: {
    prefecture: {
      type: 'string',
      description: '都道府県名(協会けんぽの健康保険料率決定に使用。例: "福岡")',
      enum: Object.keys(HEALTH_INSURANCE_RATE_BY_PREFECTURE),
    },
    care_insurance_applicable: {
      type: 'boolean',
      description: '40〜64歳で介護保険第2号被保険者に該当するか',
    },
    effective_corporate_tax_rate: {
      type: 'number',
      description:
        '会社の実効税率(法人税・地方法人税・法人住民税・事業税の合計、0〜1の小数。中小企業の目安は概ね0.23〜0.35)。' +
        'current/proposedのいずれかでbonus_annual>0かつbonus_pre_notified=falseの場合にのみ使用し、その場合は指定必須',
    },
    current: {
      type: 'object',
      description: '現行の役員報酬パターン',
      properties: {
        monthly_compensation: { type: 'number', description: '現行の役員報酬(課税対象の月額給与、円)' },
        travel_allowance_monthly: {
          type: 'number',
          description: '現行の旅費規程による月額支給額(非課税、円)。通常は0',
        },
        bonus_annual: { type: 'number', description: '現行の年1回の役員賞与総額(円)。賞与なしの場合は0' },
        bonus_pre_notified: {
          type: 'boolean',
          description: '現行の賞与が「事前確定届出給与」として届出済みか(bonus_annualが0の場合は無視される)',
        },
      },
      required: ['monthly_compensation', 'travel_allowance_monthly', 'bonus_annual', 'bonus_pre_notified'],
      additionalProperties: false,
    },
    proposed: {
      type: 'object',
      description: '変更後(提案する)役員報酬パターン',
      properties: {
        monthly_compensation: { type: 'number', description: '変更後の役員報酬(課税対象の月額給与、円)' },
        travel_allowance_monthly: {
          type: 'number',
          description: '変更後の旅費規程による月額支給額(非課税、円)',
        },
        bonus_annual: { type: 'number', description: '変更後の年1回の役員賞与総額(円)。賞与なしの場合は0' },
        bonus_pre_notified: {
          type: 'boolean',
          description: '変更後の賞与が「事前確定届出給与」として届出済みか(bonus_annualが0の場合は無視される)',
        },
      },
      required: ['monthly_compensation', 'travel_allowance_monthly', 'bonus_annual', 'bonus_pre_notified'],
      additionalProperties: false,
    },
  },
  required: ['prefecture', 'care_insurance_applicable', 'current', 'proposed'],
  additionalProperties: false,
} as const;

interface RawPattern {
  monthly_compensation: number;
  travel_allowance_monthly: number;
  bonus_annual: number;
  bonus_pre_notified: boolean;
}

interface RawInput {
  prefecture: string;
  care_insurance_applicable: boolean;
  effective_corporate_tax_rate?: number;
  current: RawPattern;
  proposed: RawPattern;
}

export function handleSimulateExecutiveCompensation(raw: RawInput): SimulateExecutiveCompensationOutput {
  const input = validateAndNormalize(raw);
  return simulateExecutiveCompensation(
    input.current,
    input.proposed,
    input.prefecture,
    input.careInsuranceApplicable,
    input.effectiveCorporateTaxRate,
  );
}

function validateAndNormalize(raw: RawInput): SimulateExecutiveCompensationInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('入力が不正です');
  }
  if (!raw.prefecture || !(raw.prefecture in HEALTH_INSURANCE_RATE_BY_PREFECTURE)) {
    throw new Error(`prefectureが不正です(対応都道府県: ${Object.keys(HEALTH_INSURANCE_RATE_BY_PREFECTURE).join('、')})`);
  }
  if (typeof raw.care_insurance_applicable !== 'boolean') {
    throw new Error('care_insurance_applicableはbooleanで指定してください');
  }
  validatePattern(raw.current, 'current');
  validatePattern(raw.proposed, 'proposed');

  if (raw.effective_corporate_tax_rate !== undefined) {
    const rate = raw.effective_corporate_tax_rate;
    if (typeof rate !== 'number' || rate <= 0 || rate > 1) {
      throw new Error('effective_corporate_tax_rateは0より大きく1以下の数値で指定してください');
    }
  }
  const nonDeductibleBonusExists =
    (raw.current.bonus_annual > 0 && !raw.current.bonus_pre_notified) ||
    (raw.proposed.bonus_annual > 0 && !raw.proposed.bonus_pre_notified);
  if (nonDeductibleBonusExists && raw.effective_corporate_tax_rate === undefined) {
    throw new Error(
      '事前確定届出給与として届出されていない賞与があるため、effective_corporate_tax_rateの指定が必要です',
    );
  }

  return {
    prefecture: raw.prefecture,
    careInsuranceApplicable: raw.care_insurance_applicable,
    effectiveCorporateTaxRate: raw.effective_corporate_tax_rate,
    current: toPattern(raw.current),
    proposed: toPattern(raw.proposed),
  };
}

function toPattern(pattern: RawPattern): SimulateExecutiveCompensationInput['current'] {
  return {
    monthlyCompensation: pattern.monthly_compensation,
    travelAllowanceMonthly: pattern.travel_allowance_monthly,
    bonusAnnual: pattern.bonus_annual,
    bonusPreNotified: pattern.bonus_pre_notified,
  };
}

function validatePattern(pattern: RawPattern, label: string): void {
  if (!pattern || typeof pattern !== 'object') {
    throw new Error(`${label}は必須のオブジェクトです`);
  }
  if (typeof pattern.monthly_compensation !== 'number' || pattern.monthly_compensation < 0) {
    throw new Error(`${label}.monthly_compensationは0以上の数値で指定してください`);
  }
  if (typeof pattern.travel_allowance_monthly !== 'number' || pattern.travel_allowance_monthly < 0) {
    throw new Error(`${label}.travel_allowance_monthlyは0以上の数値で指定してください`);
  }
  if (typeof pattern.bonus_annual !== 'number' || pattern.bonus_annual < 0) {
    throw new Error(`${label}.bonus_annualは0以上の数値で指定してください`);
  }
  if (typeof pattern.bonus_pre_notified !== 'boolean') {
    throw new Error(`${label}.bonus_pre_notifiedはbooleanで指定してください`);
  }
}
