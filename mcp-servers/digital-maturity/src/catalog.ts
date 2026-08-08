import type { MaturityAreaId, MaturityCatalogItem } from './types.js';

/** 4診断領域のラベル(固定・docs/requirements.md T-012に準拠) */
export const AREA_LABELS: Record<MaturityAreaId, string> = {
  sales: '営業(SFA/CRM・EC活用)',
  admin: '総務経理(クラウド会計・電子帳簿保存法)',
  hr: '労務(年末調整/社保電子化・勤怠管理)',
  infra: '社内基盤(チャット/Web会議/RPA/電子契約)',
};

export const AREA_IDS: MaturityAreaId[] = ['sales', 'admin', 'hr', 'infra'];

/**
 * 診断項目カタログ(固定データ)。
 * ヒアリング時にコンサルタントが各項目を0(未導入)〜4(高度活用/自動化)の
 * 5段階でクライアントに確認し、assess_digital_maturityの`answers`に渡す。
 */
export const MATURITY_CATALOG: MaturityCatalogItem[] = [
  // 営業(sales)
  {
    itemId: 'sfa_crm',
    areaId: 'sales',
    label: 'SFA/CRMの導入・活用状況',
    improvementAction: '顧客情報を一元管理できるSFA/CRMツールの導入を検討し、案件・商談履歴を蓄積する',
  },
  {
    itemId: 'ec_utilization',
    areaId: 'sales',
    label: 'EC活用状況',
    improvementAction: '自社ECサイトやオンライン販路の開設・強化を検討し、非対面での販売チャネルを確保する',
  },
  {
    itemId: 'sales_data_analysis',
    areaId: 'sales',
    label: '営業データの分析活用',
    improvementAction: '売上・商談データを定期的に分析し、営業戦略に反映する仕組みを整える',
  },
  // 総務経理(admin)
  {
    itemId: 'cloud_accounting',
    areaId: 'admin',
    label: 'クラウド会計ソフトの活用状況',
    improvementAction: 'クラウド会計ソフトを導入し、記帳・請求書発行・入出金管理を自動化する',
  },
  {
    itemId: 'e_document_law',
    areaId: 'admin',
    label: '電子帳簿保存法への対応状況',
    improvementAction: '電子帳簿保存法の保存要件(タイムスタンプ・検索性確保等)を満たす運用に移行する',
  },
  {
    itemId: 'expense_digitalization',
    areaId: 'admin',
    label: '経費精算の電子化状況',
    improvementAction: '経費精算システムを導入し、領収書のスキャン・自動仕訳による電子化を進める',
  },
  // 労務(hr)
  {
    itemId: 'year_end_adjustment',
    areaId: 'hr',
    label: '年末調整の電子化状況',
    improvementAction: '年末調整をWeb上で完結できるクラウド労務ソフトの導入を検討する',
  },
  {
    itemId: 'social_insurance_e',
    areaId: 'hr',
    label: '社会保険手続きの電子化状況',
    improvementAction: '社会保険の電子申請(e-Gov連携)に対応し、書面提出の手間を削減する',
  },
  {
    itemId: 'attendance_management',
    areaId: 'hr',
    label: '勤怠管理システムの活用状況',
    improvementAction: 'クラウド勤怠管理システムを導入し、打刻・集計・残業時間管理を自動化する',
  },
  // 社内基盤(infra)
  {
    itemId: 'chat_tool',
    areaId: 'infra',
    label: 'ビジネスチャットの活用状況',
    improvementAction: 'ビジネスチャットツールを導入し、メール依存を減らして情報共有を迅速化する',
  },
  {
    itemId: 'web_conference',
    areaId: 'infra',
    label: 'Web会議の活用状況',
    improvementAction: 'Web会議ツールを整備し、遠隔での商談・打合せに対応できる体制を作る',
  },
  {
    itemId: 'rpa_utilization',
    areaId: 'infra',
    label: 'RPA(業務自動化)の活用状況',
    improvementAction: '定型作業を洗い出し、RPAツールによる自動化を試験導入する',
  },
  {
    itemId: 'e_contract',
    areaId: 'infra',
    label: '電子契約の活用状況',
    improvementAction: '電子契約サービスを導入し、契約書の郵送・押印プロセスを削減する',
  },
];
