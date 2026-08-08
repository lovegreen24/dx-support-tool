/**
 * 環境変数の集約モジュール。process.envへの直接アクセスはこのファイル経由のみとする
 * (CLAUDE.md「ハードコード禁止: process.envはconfig経由のみ」に準拠)。
 */

export interface SubsidyMatchingConfig {
  notionToken: string;
  notionDatabaseId: string;
}

/**
 * 必須環境変数を読み込む。未設定の場合は即座にエラーを投げる
 * (CLAUDE.md「環境変数エラー → 全タスク停止、即報告」に準拠しフォールバックしない)。
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): SubsidyMatchingConfig {
  const notionToken = env.NOTION_TOKEN;
  const notionDatabaseId = env.NOTION_DATABASE_ID;

  const missing: string[] = [];
  if (!notionToken) missing.push('NOTION_TOKEN');
  if (!notionDatabaseId) missing.push('NOTION_DATABASE_ID');

  if (missing.length > 0) {
    throw new Error(`必須環境変数が未設定です: ${missing.join(', ')}`);
  }

  return {
    notionToken: notionToken as string,
    notionDatabaseId: notionDatabaseId as string,
  };
}
