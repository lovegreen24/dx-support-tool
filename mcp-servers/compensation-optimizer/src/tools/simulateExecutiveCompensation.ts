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
    current: {
      type: 'object',
      description: '現行の役員報酬パターン',
      properties: {
        monthly_compensation: { type: 'number', description: '現行の役員報酬(課税対象の月額給与、円)' },
        travel_allowance_monthly: {
          type: 'number',
          description: '現行の旅費規程による月額支給額(非課税、円)。通常は0',
        },
      },
      required: ['monthly_compensation', 'travel_allowance_monthly'],
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
      },
      required: ['monthly_compensation', 'travel_allowance_monthly'],
      additionalProperties: false,
    },
  },
  required: ['prefecture', 'care_insurance_applicable', 'current', 'proposed'],
  additionalProperties: false,
} as const;

interface RawInput {
  prefecture: string;
  care_insurance_applicable: boolean;
  current: { monthly_compensation: number; travel_allowance_monthly: number };
  proposed: { monthly_compensation: number; travel_allowance_monthly: number };
}

export function handleSimulateExecutiveCompensation(raw: RawInput): SimulateExecutiveCompensationOutput {
  const input = validateAndNormalize(raw);
  return simulateExecutiveCompensation(input.current, input.proposed, input.prefecture, input.careInsuranceApplicable);
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

  return {
    prefecture: raw.prefecture,
    careInsuranceApplicable: raw.care_insurance_applicable,
    current: {
      monthlyCompensation: raw.current.monthly_compensation,
      travelAllowanceMonthly: raw.current.travel_allowance_monthly,
    },
    proposed: {
      monthlyCompensation: raw.proposed.monthly_compensation,
      travelAllowanceMonthly: raw.proposed.travel_allowance_monthly,
    },
  };
}

interface RawPattern {
  monthly_compensation: number;
  travel_allowance_monthly: number;
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
}
