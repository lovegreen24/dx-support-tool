/**
 * 財務系MCP `remind_missing_hearing_items` が管理するヒアリング項目マスタ。
 *
 * このMCPは「未回答」項目のみを返し、全項目数(分母)を返すAPIを持たないため、
 * ヒアリング完了率を計算するには全項目のカタログをこちら側で保持する必要がある。
 * 以下は client_id `8a02688a-06fc-4867-ad0f-187b4255939a` に対する実際のMCP呼び出し
 * (2026-08-08実施の内部結合テストで実施)で観測した29項目(カテゴリA〜H)そのもの。
 * MCP側の項目定義が変更された場合はこの一覧も追随して更新すること。
 */
export const HEARING_CHECKLIST_ITEM_IDS: readonly string[] = [
  // カテゴリA: 基本情報
  'industry',
  'revenue_scale',
  'employee_count',
  'fiscal_year_end',
  // カテゴリB: 資金繰り(必要運転資金診断用)
  'fixed_costs',
  'variable_costs',
  'temporary_expenses',
  'receivables_schedule',
  'min_cash_sales',
  'bank_balance',
  // カテゴリC: 貸借対照表項目
  'inventory_amount_and_turnover_days',
  'receivables_balance_and_collection_site',
  'payables_balance_and_payment_site',
  // カテゴリD: 固定費・資産の無駄
  'dead_inventory',
  'uncollectible_receivables',
  'unused_subscriptions',
  'excessive_insurance',
  'excessive_entertainment_expenses',
  // カテゴリE: 借入
  'borrowing_balance_and_type',
  'monthly_repayment_vs_new_borrowing',
  'bank_repayment_plan_review_request',
  'recent_meeting_contact',
  // カテゴリF: 設備・契約
  'equipment_and_utility_contracts',
  // カテゴリG: 役員報酬・社会保険
  'executive_compensation_structure',
  'social_insurance_burden',
  // カテゴリH: 資金繰り管理体制
  'cash_flow_statement_practice',
  'cash_flow_monitoring_owner',
  'fear_of_cash_flow_table',
  'payment_site_negotiation_started',
] as const;

export const HEARING_CHECKLIST_TOTAL_COUNT = HEARING_CHECKLIST_ITEM_IDS.length;

/**
 * remind_missing_hearing_itemsが返した未回答件数から、ヒアリング完了率(0〜100の整数%)を算出する。
 * missingCountがnull/undefined(=ヒアリング未着手・未同期)の場合は0%として扱う。
 */
export function computeHearingCompletionRate(missingCount: number | null | undefined): number {
  if (missingCount === null || missingCount === undefined) {
    return 0;
  }
  const answeredCount = HEARING_CHECKLIST_TOTAL_COUNT - missingCount;
  const rate = (answeredCount / HEARING_CHECKLIST_TOTAL_COUNT) * 100;
  return Math.min(100, Math.max(0, Math.round(rate)));
}
