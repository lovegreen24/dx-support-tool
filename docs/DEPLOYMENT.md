# デプロイ情報

> ホスティング先(Cloudflare Pages/Workers等)の具体的な選定・契約はPhase 12(デプロイ)で確定する。
> 本ドキュメントはPhase 11(ローカル動作確認・本番運用診断)時点で判明している、デプロイ前提知識・環境変数・監視・バックアップ手順をまとめたもの。

## 構成

- フロントエンド: `frontend/`(Vite + React、静的ビルド。`npm run build`で`frontend/dist/`を生成)
- バックエンド: `backend/`(Express、`npm run build`で`backend/dist/`を生成し`node dist/server.js`で起動)
- MCPサーバー: `mcp-servers/*`(cloud_proxy: 補助金マッチング・案件管理／local: DX成熟度診断)。デプロイ経路はMCPストア経由でありWebのデプロイとは別系統

## 必要な環境変数

`.env`系ファイルは作成しない(CLAUDE.md方針)。デプロイ先のシークレット管理機能(例: Cloudflare Workers Secrets)で設定する。値は全てpassword-managerに保存済み。

### バックエンド(`backend/`)

| 変数名 | 用途 | password-manager保存先 |
|--------|------|------------------------|
| `PORT` | リッスンポート(未設定時4620) | - |
| `NODE_ENV` | `production`を指定 | - |
| `API_KEY` | `/api/clients`・`/api/case-progress`のX-API-Key認証(フロントエンドの`VITE_API_KEY`と同一値) | `dx-support-tool-api-key` |
| `GOOGLE_SHEETS_ID` | 案件進捗スプレッドシートID | `dx-support-tool-google-sheets-id` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | 案件進捗スプレッドシート読み取り用サービスアカウント | `dx-support-tool-google-service-account-json` |
| `FRONTEND_ORIGIN` | CORS許可オリジン(カンマ区切り)。**本番では必ず設定すること**(未設定時は全オリジン許可) | - |
| `CLIENT_STORE_FILE_PATH` | クライアント一覧ローカルDBのファイルパス(未設定時`data/clients.json`)。永続ストレージが無い実行環境では起動のたびにリセットされる点に注意 | - |

### フロントエンド(`frontend/`)

| 変数名 | 用途 | password-manager保存先 |
|--------|------|------------------------|
| `VITE_DASHBOARD_PASSWORD` | ダッシュボードログインの簡易パスワード | ローカル`.env.local`のみ(Cloudflare Pages環境変数として本番設定要) |
| `VITE_API_BASE_URL` | バックエンドAPIのURL | - |
| `VITE_API_KEY` | バックエンドAPI認証用(`API_KEY`と同一値) | `dx-support-tool-api-key` |

### MCPサーバー

| MCP | 変数名 | password-manager保存先 |
|-----|--------|------------------------|
| 補助金マッチング(M-011) | `NOTION_TOKEN`, `NOTION_DATABASE_ID` | `dx-support-tool-notion-token` / `dx-support-tool-notion-database-id` |
| 案件管理(M-010) | `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | `dx-support-tool-google-sheets-id` / `dx-support-tool-google-service-account-json` |
| DX成熟度診断(M-012) | `DATABASE_URL`, `SUPABASE_SERVICE_KEY` | `dx-support-tool-supabase-database-url` / `dx-support-tool-supabase-service-key` |

## CI/CD

`.github/workflows/ci.yml`の`verify`ジョブが、`package.json`を持つ各パッケージ(`backend`・`frontend`・`mcp-servers/*`)を走査してtsc・lintのみ実行する(第三防壁)。unit/結合/E2E/buildはActions課金削減とE2Eの本番DB直結事故防止のため実行せず、ローカル受入ゲート(Agent 11・本ファイル更新時点で実施済み)で担保する。mainブランチは`verify`ジョブの成功が必須(branch protection)。

## 監視

- `GET /api/health`: 稼働確認用(認証不要)。`status`/`uptimeSeconds`/`timestamp`を返す
- `GET /api/metrics`: 運用監視用(認証不要・業務データを含まない)。`uptimeSeconds`/`memory`(RSS・heap使用量MB)/`nodeVersion`/`timestamp`を返す
- 外部アップタイム監視(UptimeRobot等の無料枠で十分な規模)を`/api/health`に対して設定することを推奨。アラート通知先はPhase 12で決定
- ログは`backend/src/logger.ts`(Winston)で構造化JSON出力。標準出力へ出すためデプロイ先のログ収集機能(Cloudflare Logs等)にそのまま連携できる

## バックアップ・復旧

自社DB(クライアント基本情報)以外は全て外部マネージドサービスに保存されており、各サービスの標準機能でバックアップ可能。

| データ | 保存先 | バックアップ方法 |
|--------|--------|-------------------|
| クライアント一覧ローカルDB | `backend/data/clients.json` | 永続ボリュームを持つ実行環境ではファイルをそのまま定期コピー。ステートレスな実行環境(Cloudflare Workers等)を選ぶ場合は、このファイルストアの永続化方式自体をPhase 12で再検討すること(現状は単一プロセス内のローカルファイル前提) |
| 案件進捗 | Googleスプレッドシート | Google Driveの標準版履歴機能(ファイル > 変更履歴)で復元可能。追加で月次エクスポート(ファイル > ダウンロード > CSV)を推奨 |
| DX成熟度診断履歴 | Supabase(`digital_maturity_assessments`テーブル) | Supabase管理画面のPoint-in-Time Recovery、または`pg_dump`(`DATABASE_URL`を使用)での定期エクスポートを推奨 |
| 財務診断・ヒアリング等 | 既存財務系8MCPのクラウドDB(MCP提供元管理) | MCP提供元のバックアップ方針に準拠(本プロジェクト側での対応なし) |

## 既知の制約

- cloud_proxyゲートウェイの環境変数バインディングが同一セッション内で反映されないことがある(詳細はdocs/SCOPE_PROGRESS.md「MCP実装計画」節)。デプロイ後の初回接続確認は新しいセッションで実施すること
- バックエンドAPI認証は共有APIキー方式(X-API-Keyヘッダー)であり、ユーザー単位の認証・認可は行っていない。単一コンサルタント専用(マイ専用配布)の前提に基づく設計判断
