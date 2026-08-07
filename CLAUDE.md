# 中小企業DX伴走支援ツール

> 設計の共通原則（基本原則・資産価値の原則）は `~/.claude/CLAUDE.md` に従う。

## プロジェクト設定

技術スタック:
  コントローラー: Claude Code(ローカル・コンサルタント本人が操作)
  MCPサーバー群: 財務診断系8ツール(既存・cloud_proxy) / OCR抽出(既存・local) / 案件管理(既存・要接続) / 補助金マッチング(新規・cloud_proxy) / DX成熟度診断(新規・cloud_proxy)
  確認UI: 単一HTML + Vanilla JS、Cloudflare Pages

ポート設定(確認UIをローカル起動する場合):
※ 以下のコマンドで実際にランダム生成すること(AIの推測で選ばない):
```bash
FRONTEND_PORT=$((RANDOM % 1000 + 3000))
lsof -i :$FRONTEND_PORT 2>/dev/null && echo "⚠️ $FRONTEND_PORT は使用中" || echo "✅ frontend: $FRONTEND_PORT"
```

## テスト認証情報

進捗ダッシュボードの簡易パスワードは下記コマンドで実際にランダム生成すること:
```bash
openssl rand -base64 12
```

## 環境変数

- 各MCPサーバーごとに `.env.local` を配置
- 設定モジュール: `src/config/index.ts`(process.env集約)
- 必要な環境変数:
  - 補助金マッチングMCP: `NOTION_TOKEN`, `NOTION_DATABASE_ID`
  - 案件管理MCP: Google認証情報(要確認・実装時にhosting型を確定してから追記)
- ハードコード禁止: `process.env` はconfig経由のみ
- **絶対禁止**: `.env`, `.env.test`, `.env.development`, `.env.example` は作成しない

## 命名規則

- コンポーネント: PascalCase.tsx / その他: camelCase.ts
- 変数・関数: camelCase / 定数: UPPER_SNAKE_CASE / 型: PascalCase

## MCP構成

```
財務診断系8ツール（既存・cloud_proxy）← クライアント登録・決算書解析・ヒアリング・財務分析・提言書生成
├── save_client_record
├── parse_financial_statement
├── register_hearing_answer
├── remind_missing_hearing_items
├── analyze_working_capital
├── compare_cost_benchmark
├── generate_proposal_draft
└── list_client_history

OCR抽出（既存・local）← 画像からのテキスト抽出（補助的な読み取り）

案件管理MCP（既存・要接続）← Googleスプレッドシートで進捗・6承認ポイント管理

補助金マッチング（id: 未採番・新規開発・cloud_proxy）← Notion連携の補助金台帳とクライアント情報を照合
├── requiredEnvVars: NOTION_TOKEN, NOTION_DATABASE_ID
└── 既存の静的ツール(01-補助金マッチングツール)のロジックを移植

assess_digital_maturity（id: 未採番・新規開発・cloud_proxy）← 営業/総務経理/労務/社内基盤のDX成熟度診断
```

MCPツール名: snake_case(例: assess_digital_maturity, suggest_matching_subsidies)

## コード品質

- 関数: 100行以下 / ファイル: 700行以下 / 複雑度: 10以下 / 行長: 120文字
- Lint設定: `eslint.config.js`(プロジェクトルート)

## 品質ゲート（三段防壁）

> 方針サマリ。CI/CD の実装詳細は Agent 2(Git管理)が「CI/CD設定」として追記する。

- **第一防壁＝ローカル git hook**: commit で tsc/lint/秘密情報チェック、push で test
- **第二防壁＝マージ前ローカル受入ゲート（Agent 11）**: unit/結合/E2E/本番運用診断をローカルで緑にしてから merge
- **第三防壁＝軽量 Actions + branch protection**: `ci.yml` は tsc/lint のみ・main は `verify` 緑必須

## 開発ルール

### サーバー起動
- サーバーは1つのみ維持。別ポートでの重複起動禁止
- 起動前に既存プロセスを確認
- 環境変数変更時のみ再起動

### エラー対応
- 環境変数エラー → 全タスク停止、即報告(試行錯誤禁止)
- 同じエラー3回 → Web検索で最新情報を収集

### デプロイ
- デプロイはユーザーの明示的な承認を得てから実行する
- 詳細: docs/DEPLOYMENT.md

### ドキュメント管理
許可されたドキュメントのみ作成可能:
- docs/SCOPE_PROGRESS.md（実装計画・進捗）
- docs/requirements.md（要件定義）
- docs/DEPLOYMENT.md（デプロイ情報）
- docs/e2e-specs/（E2Eテスト仕様書）
上記以外のドキュメント作成はユーザー許諾が必要。
実装済みの記載は積極的に削除する。

## AIエージェント設計

- 目標自律度Lv: L2(AIは財務分析〜提案書ドラフト生成までを自動化。経営者への提示・最終判断はコンサルタント本人が行う)
- AI本体: Claude Sonnet + Tool Use + 自律ループ(最大10回目安)
- 実行ランタイム: 操作者=ClaudeCode(#1〜#4)のため、自律ループは**Claude Code自身**が回す。**MCPはAnthropic APIを叩かない＝ANTHROPIC_API_KEY不要**。SDK直接の記述もキーも書かない
