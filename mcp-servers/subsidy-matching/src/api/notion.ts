import type { SubsidyRecord } from '../types.js';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

/** Notion補助金台帳データベースのプロパティ名(固定・Phase 6-8で確定済み) */
const PROPERTY_NAMES = {
  title: '補助金名',
  targetIndustries: '対象業種',
  targetConditions: '対象条件',
  organization: '実施機関',
  subsidyAmount: '補助額',
  deadline: '申請締切',
  status: 'ステータス',
  url: '詳細URL',
  notes: '備考',
} as const;

interface NotionRichTextItem {
  plain_text: string;
}

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

export class NotionApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = 'NotionApiError';
  }
}

/** Notion補助金台帳データベースへの読み取り専用クライアント */
export class NotionSubsidyClient {
  constructor(
    private readonly token: string,
    private readonly databaseId: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** データベース内の全補助金レコードを取得する(ページネーション対応) */
  async listSubsidies(): Promise<SubsidyRecord[]> {
    const records: SubsidyRecord[] = [];
    let cursor: string | undefined;

    do {
      const page = await this.queryOnePage(cursor);
      for (const notionPage of page.results) {
        records.push(parseSubsidyRecord(notionPage));
      }
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return records;
  }

  private async queryOnePage(startCursor?: string): Promise<NotionQueryResponse> {
    const body: Record<string, unknown> = {};
    if (startCursor) body.start_cursor = startCursor;

    const response = await this.fetchImpl(`${NOTION_API_BASE}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new NotionApiError(
        `Notion APIエラー(status=${response.status}): ${errorBody}`,
        response.status,
        errorBody,
      );
    }

    return (await response.json()) as NotionQueryResponse;
  }
}

/** Notionページの生プロパティを正規化されたSubsidyRecordへ変換する(純粋関数) */
export function parseSubsidyRecord(page: NotionPage): SubsidyRecord {
  const props = page.properties;

  return {
    pageId: page.id,
    subsidyName: extractTitle(props[PROPERTY_NAMES.title]),
    targetIndustries: extractMultiSelect(props[PROPERTY_NAMES.targetIndustries]),
    targetConditions: extractRichText(props[PROPERTY_NAMES.targetConditions]),
    organization: extractRichText(props[PROPERTY_NAMES.organization]),
    subsidyAmount: extractRichText(props[PROPERTY_NAMES.subsidyAmount]),
    applicationDeadline: extractDate(props[PROPERTY_NAMES.deadline]),
    status: extractSelect(props[PROPERTY_NAMES.status]),
    detailUrl: extractUrl(props[PROPERTY_NAMES.url]),
    notes: extractRichText(props[PROPERTY_NAMES.notes]),
  };
}

function extractTitle(prop: unknown): string {
  const items = (prop as { title?: NotionRichTextItem[] } | undefined)?.title ?? [];
  return items.map((item) => item.plain_text).join('');
}

function extractRichText(prop: unknown): string {
  const items = (prop as { rich_text?: NotionRichTextItem[] } | undefined)?.rich_text ?? [];
  return items.map((item) => item.plain_text).join('');
}

function extractMultiSelect(prop: unknown): string[] {
  const options = (prop as { multi_select?: { name: string }[] } | undefined)?.multi_select ?? [];
  return options.map((option) => option.name);
}

function extractSelect(prop: unknown): string {
  return (prop as { select?: { name: string } | null } | undefined)?.select?.name ?? '';
}

function extractDate(prop: unknown): string | null {
  return (prop as { date?: { start: string } | null } | undefined)?.date?.start ?? null;
}

function extractUrl(prop: unknown): string | null {
  return (prop as { url?: string | null } | undefined)?.url ?? null;
}
