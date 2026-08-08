import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * クライアント一覧集計API(`/api/clients`)向けのローカル永続化層(要件定義0章の「自社DB」)。
 *
 * 【設計判断】財務系8MCP(cloud_proxy)には、登録済みクライアントの基本情報
 * (企業名・業種・従業員数・決算期)を一覧取得するAPIが存在しない。
 * - `save_client_record` はクライアント新規登録時に基本情報を1回だけ返す(再取得不可)
 * - `list_client_history` は運転資金診断(analyze_working_capital)を実施済みのクライアントの
 *   診断結果のみを返し、業種・従業員数・決算期は含まない
 * - `remind_missing_hearing_items` は未回答項目のみを返す(回答総数の取得APIはない)
 * - 提案書生成(`generate_proposal_draft`)が実行済みかどうかを問い合わせるAPIも存在しない
 *
 * また、これらのMCPは操作者であるClaude Codeのツール呼び出し経由でのみ到達可能であり、
 * 本バックエンド(Expressサーバー)プロセス単体からネットワーク越しに直接呼び出すことはできない
 * (実行ランタイム: 操作者=ClaudeCodeのため、自律ループはClaude Code自身が回す。定期実行なし)。
 *
 * そのため、Claude CodeがMCPを呼び出した結果を `mcp/ingest.ts` を通じてこのストアに取り込み、
 * `/api/clients` はこのローカルストアを読むだけの軽量な読み取り専用エンドポイントとする。
 */
export interface ClientSnapshot {
  clientId: string;
  name: string;
  industry: string;
  employeeCount: number;
  /** save_client_recordが返すMM-DD形式(例: "03-31") */
  fiscalYearEndMonthDay: string;
  /** remind_missing_hearing_itemsから同期した直近の未回答件数。未同期の場合はnull */
  hearingMissingCount: number | null;
  /** generate_proposal_draftが成功した日時。未生成の場合はnull */
  proposalGeneratedAt: string | null;
  /** このストアに初めて登録された日時(一覧の表示順を安定させるために保持) */
  createdAt: string;
  updatedAt: string;
}

export interface ClientProfileInput {
  clientId: string;
  name: string;
  industry: string;
  employeeCount: number;
  fiscalYearEndMonthDay: string;
}

interface StoreFile {
  clients: Record<string, ClientSnapshot>;
}

function emptyStoreFile(): StoreFile {
  return { clients: {} };
}

/**
 * クライアントスナップショットのJSONファイル永続化ストア。
 * 単一コンサルタント専用(マイ専用配布)かつ想定クライアント数が小規模なため、
 * DBサーバーを立てずファイルベースの永続化で十分と判断(過剰設計を避ける)。
 */
export class ClientStore {
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private load(): StoreFile {
    if (!existsSync(this.filePath)) {
      return emptyStoreFile();
    }
    const raw = readFileSync(this.filePath, 'utf-8').trim();
    if (raw === '') {
      return emptyStoreFile();
    }
    return JSON.parse(raw) as StoreFile;
  }

  private save(data: StoreFile): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /** save_client_recordの結果を取り込む(新規作成 or 基本情報の上書き更新) */
  upsertProfile(profile: ClientProfileInput, now: Date = new Date()): ClientSnapshot {
    const data = this.load();
    const existing = data.clients[profile.clientId];
    const snapshot: ClientSnapshot = {
      clientId: profile.clientId,
      name: profile.name,
      industry: profile.industry,
      employeeCount: profile.employeeCount,
      fiscalYearEndMonthDay: profile.fiscalYearEndMonthDay,
      hearingMissingCount: existing?.hearingMissingCount ?? null,
      proposalGeneratedAt: existing?.proposalGeneratedAt ?? null,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    data.clients[profile.clientId] = snapshot;
    this.save(data);
    return snapshot;
  }

  /** remind_missing_hearing_itemsの結果(未回答件数)を同期する */
  updateHearingProgress(clientId: string, missingCount: number, now: Date = new Date()): ClientSnapshot {
    const data = this.load();
    const existing = data.clients[clientId];
    if (!existing) {
      throw new Error(`ClientStore: unknown clientId "${clientId}" (先にupsertProfileでプロフィールを登録してください)`);
    }
    const snapshot: ClientSnapshot = {
      ...existing,
      hearingMissingCount: missingCount,
      updatedAt: now.toISOString(),
    };
    data.clients[clientId] = snapshot;
    this.save(data);
    return snapshot;
  }

  /** generate_proposal_draftが成功したことを記録する */
  markProposalGenerated(clientId: string, generatedAt: string, now: Date = new Date()): ClientSnapshot {
    const data = this.load();
    const existing = data.clients[clientId];
    if (!existing) {
      throw new Error(`ClientStore: unknown clientId "${clientId}" (先にupsertProfileでプロフィールを登録してください)`);
    }
    const snapshot: ClientSnapshot = {
      ...existing,
      proposalGeneratedAt: generatedAt,
      updatedAt: now.toISOString(),
    };
    data.clients[clientId] = snapshot;
    this.save(data);
    return snapshot;
  }

  listAll(): ClientSnapshot[] {
    const data = this.load();
    return Object.values(data.clients).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}
