# デプロイ情報

## 本番環境URL(⚠️ 変更禁止・CORS/API連携が依存)

- フロントエンド: https://dx-support-tool.vercel.app
- バックエンド: https://dx-support-tool-backend-244699407868.asia-northeast1.run.app

## デプロイ方法

```bash
./scripts/deploy-production.sh
```

品質ゲート(tsc・build・backend unit/内部結合テスト)を通過後、`deploy-backend.sh`(Cloud Run)・`deploy-frontend.sh`(Vercel)を順に実行する。個別スクリプトの直接実行は品質ゲートをスキップしてしまうため避けること。

外部結合テスト(`npm run test:integration:external`)とE2Eテストは実際のGoogle Sheets/Supabase/財務系クラウドDBに書き込むため、デプロイの度に自動実行しない(本番データ汚染防止)。必要な場合は個別に手動実行すること。

## 構成

- フロントエンド: `frontend/`(Vite + React、Vercel。プロジェクト名`dx-support-tool`)
- バックエンド: `backend/`(Express、Cloud Run。サービス名`dx-support-tool-backend`、リージョン`asia-northeast1`、GCPプロジェクト`gen-lang-client-0662622046`。Buildpacksでソースから直接デプロイ、Dockerfile不要)
- MCPサーバー: `mcp-servers/*`(cloud_proxy: 補助金マッチング・案件管理・DX成熟度診断／local: OCR抽出)。デプロイ経路はBlueLamp MCPストア経由でありWebのデプロイとは別系統(Phase 5/8/9で登録済み)
- NotebookLM連携MCP(M-013): サードパーティOSS `notebooklm-mcp`(npm・MIT)をローカル実行。リポジトリルートの`.mcp.json`でバージョン固定して読み込むため、デプロイ対象外(コンサルタント本人のローカル環境のみ)。導入は`./scripts/setup-notebooklm-mcp.sh`

## 環境変数

`.env`系ファイルは作成しない(CLAUDE.md方針)。バックエンドの秘匿値はGCP Secret Manager、フロントエンドはVercel環境変数(Production)で管理する。値は全てpassword-managerにも保存済み。

### バックエンド(Cloud Run)

| 変数名 | 設定方法 | 用途 |
|--------|---------|------|
| `PORT` | Cloud Run自動注入(8080) | リッスンポート |
| `NODE_ENV` | `--set-env-vars`で`production` | - |
| `FRONTEND_ORIGIN` | `--set-env-vars`(Vercel URL) | CORS許可オリジン |
| `API_KEY` | Secret Manager `dx-support-tool-API_KEY` | `/api/clients`・`/api/case-progress`のX-API-Key認証(フロントエンドの`VITE_API_KEY`と同一値) |
| `GOOGLE_SHEETS_ID` | Secret Manager `dx-support-tool-GOOGLE_SHEETS_ID` | 案件進捗スプレッドシートID |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Secret Manager `dx-support-tool-GOOGLE_SERVICE_ACCOUNT_JSON` | 案件進捗スプレッドシート読み取り用サービスアカウント |
| `CLIENT_STORE_FILE_PATH` | 未設定(既定`data/clients.json`) | クライアント一覧ローカルDB。**Cloud Runはステートレスのため再デプロイ・スケールイン毎にリセットされる**(既知の制約として受入済み、下記参照) |

Secret ManagerへのアクセスはCloud Runの実行サービスアカウント(`244699407868-compute@developer.gserviceaccount.com`)に`roles/secretmanager.secretAccessor`を各シークレット単位で付与済み。

### フロントエンド(Vercel、Production環境変数)

| 変数名 | 用途 | password-manager保存先 |
|--------|------|------------------------|
| `VITE_DASHBOARD_PASSWORD` | ダッシュボードログインの簡易パスワード | `dx-support-tool-dashboard-password` |
| `VITE_API_BASE_URL` | バックエンドAPIのURL(Cloud Run URL) | - |
| `VITE_API_KEY` | バックエンドAPI認証用(`API_KEY`と同一値) | `dx-support-tool-api-key` |

いずれも`VITE_`プレフィックスによりクライアントサイドに露出する(Vercel CLIも警告表示)。単一コンサルタント専用のクライアントサイド簡易保護という設計上の既知の制約(要件定義書§6)であり、新規の問題ではない。

### MCPサーバー(BlueLamp、Web本番デプロイとは別系統)

| MCP | 変数名 | password-manager保存先 |
|-----|--------|------------------------|
| 補助金マッチング(M-011) | `NOTION_TOKEN`, `NOTION_DATABASE_ID` | `dx-support-tool-notion-token` / `dx-support-tool-notion-database-id` |
| 案件管理(M-010) | `GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | `dx-support-tool-google-sheets-id` / `dx-support-tool-google-service-account-json` |
| DX成熟度診断(M-012) | `DATABASE_URL`, `SUPABASE_SERVICE_KEY` | `dx-support-tool-supabase-database-url` / `dx-support-tool-supabase-service-key` |

NotebookLM連携(M-013)は秘匿値の環境変数を持たない。認証は本人のGoogleセッション(`~/.local/share/notebooklm-mcp/chrome_profile/`)で完結し、`.mcp.json`が持つのは`NOTEBOOKLM_PROFILE`等の挙動設定のみ。**このChromeプロファイルはGoogleアカウントのセッションそのものであり、リポジトリ・password-manager・バックアップのいずれにも複製しないこと**。

## CI/CD

`.github/workflows/ci.yml`の`verify`ジョブが、`package.json`を持つ各パッケージ(`backend`・`frontend`・`mcp-servers/*`)を走査してtsc・lintのみ実行する(第三防壁)。unit/結合/E2E/buildはActions課金削減とE2Eの本番DB直結事故防止のため実行せず、ローカル受入ゲート(Agent 11)と本番デプロイ前品質ゲート(`deploy-production.sh`)で担保する。mainブランチは`verify`ジョブの成功が必須(branch protection)。

## 監視

- `GET /api/health`: 稼働確認用(認証不要)。`status`/`uptimeSeconds`/`timestamp`を返す
- `GET /api/metrics`: 運用監視用(認証不要・業務データを含まない)。`uptimeSeconds`/`memory`(RSS・heap使用量MB)/`nodeVersion`/`timestamp`を返す
- 外部アップタイム監視(UptimeRobot等の無料枠で十分な規模)を本番`/api/health`(https://dx-support-tool-backend-244699407868.asia-northeast1.run.app/api/health)に対して設定することを推奨(未設定・任意)
- ログは`backend/src/logger.ts`(Winston)で構造化JSON出力。Cloud Runは標準出力を自動でCloud Loggingに収集する
- Cloud Runの課金は使用量ベース(`--max-instances=2`設定済み)。単一コンサルタント利用のため無料枠内で収まる見込み

## バックアップ・復旧

自社DB(クライアント基本情報)以外は全て外部マネージドサービスに保存されており、各サービスの標準機能でバックアップ可能。

| データ | 保存先 | バックアップ方法 |
|--------|--------|-------------------|
| クライアント一覧ローカルDB | `backend/data/clients.json` | **Cloud Run(ステートレス)採用のため永続化なし。既知の制約として受入済み**(単一コンサルタント・低頻度利用のため実害は小さいと判断。恒久対応が必要になった場合はCloud Storage等への移行を検討) |
| 案件進捗 | Googleスプレッドシート | Google Driveの標準版履歴機能(ファイル > 変更履歴)で復元可能。追加で月次エクスポート(ファイル > ダウンロード > CSV)を推奨 |
| DX成熟度診断履歴 | Supabase(`digital_maturity_assessments`テーブル) | Supabase管理画面のPoint-in-Time Recovery、または`pg_dump`(`DATABASE_URL`を使用)での定期エクスポートを推奨 |
| 財務診断・ヒアリング等 | 既存財務系8MCPのクラウドDB(MCP提供元管理) | MCP提供元のバックアップ方針に準拠(本プロジェクト側での対応なし) |

## 既知の制約

- cloud_proxyゲートウェイの環境変数バインディングがM-010(案件管理)・M-011(補助金マッチング)で反映されない問題が継続中(BlueLampサポートチケット`99288c5f-4c19-42e7-b539-b6adee0e55f8`起票済み、詳細はdocs/SCOPE_PROGRESS.md参照)。ダッシュボードAPI(`/api/case-progress`)はこのゲートウェイを経由しない別経路(直接HTTP)のため影響なし
- バックエンドAPI認証は共有APIキー方式(X-API-Keyヘッダー)であり、ユーザー単位の認証・認可は行っていない。単一コンサルタント専用(マイ専用配布)の前提に基づく設計判断
- `backend/data/clients.json`はCloud Runの性質上永続化されない(上記バックアップ表参照)
