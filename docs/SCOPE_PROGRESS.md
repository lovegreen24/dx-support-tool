# 開発進捗（SCOPE_PROGRESS）

## アーキ構成

- 確定アーキ: #4 ＋フロントエンド
- 操作者: ClaudeCode(コンサルタント本人)
- AI本体(プロンプトY): あり(財務分析・DX成熟度診断・提言書生成)
- MCP: 新規開発
- 種別: MCP型(#1〜#4)
- 自社DB: あり(クライアントカルテ・診断履歴・ヒアリング回答等)
- フロントUI: あり(進捗閲覧用の簡易Webダッシュボード・簡易パスワード保護)
- 配布: マイ専用
- 動的変数: あり(client_id単位でDB格納・取得)

詳細は `docs/requirements.md` を参照。

## 実装計画

### 開発フェーズ

| Phase | 名称 | 担当 | 状態 |
|-------|------|------|------|
| 1 | 要件定義 | Agent 1 | [x] |
| 2 | Git管理 | Agent 2 | [x] |
| 3 | フロントエンド基盤 | Agent 3 | [x] |
| 4 | ページ実装 | Agent 4 | [x] |
| 5 | 環境構築 | Agent 5 | [x] |
| 6 | バックエンド計画 | Agent 6 | [x] |
| 7 | エージェント構築 | Agent 7 | [x] |
| 8 | バックエンド実装 | Agent 8 | [x] |
| 9 | フロントエンド実装(API統合) | Agent 9 | [x] |
| 10 | E2Eテスト | Agent 10 | [ ] |
| 11 | ローカル動作確認 | Agent 11 | [ ] |
| 12 | デプロイ | Agent 12 | [ ] |

> アーキ#4(操作者=ClaudeCode・MCP新規開発・フロントUIあり)のため、Phase 3・4・9(フロントエンド)は簡易ダッシュボード分のみ実施。Phase 7(エージェント構築)はAI本体Yありのため実施。

## バックエンド実装計画

> 種別: MCP型(#1〜#4) + フロントUIあり(簡易ダッシュボード)の複合構成。既存8MCP(財務診断系)・OCR抽出は接続済み(M-001〜M-009)のため対象外。以下は未着手の3MCP(M-010〜M-012)の新規開発計画と、それらに依存する進捗ダッシュボードAPIの実装計画。

### 垂直スライス依存関係(進捗ダッシュボードAPI)

| 順序 | スライス名 | 主要機能 | 依存 |
|------|-----------|---------|------|
| 1 | ヘルスチェック | `/api/health` | なし |
| 2-A | クライアント一覧集計API | `/api/clients`(`list_client_history`ほか財務系MCP由来のヒアリング完了率・提案書ステータスを集計) | なし(既存MCP M-008のみ) |
| 2-B | 案件進捗集計API | `/api/case-progress`(案件管理MCP由来の6承認ポイント状況を集計) | MCP M-010(案件管理)実装完了 |

※ 2-Aと2-Bは実装自体は並列可能だが、2-Bは案件管理MCP(M-010)の完了が前提のため、実データ疎通確認はM-010完了後になる。

### エンドポイント実装タスクリスト

#### スライス1: ヘルスチェック
| タスク | エンドポイント | メソッド | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|--------------|---------|:----:|:----:|:----:|:----:|:----:|:------:|
| 1.1 | /api/health | GET | [x] | [x] | - | - | [x] | [x]（フロントエンドから消費するページ・機能が存在しないため専用UI連携は対象外。実装したCORS設定・サーバー起動確認により疎通は確認済み） |

#### スライス2-A: クライアント一覧集計
| タスク | エンドポイント | メソッド | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|--------------|---------|:----:|:----:|:----:|:----:|:----:|:------:|
| 2.1 | /api/clients | GET | [x] | [x] | [x]（save_client_record/remind_missing_hearing_items/generate_proposal_draft連携。list_client_historyは業種・従業員数・決算期・提案書状態を含まないため実装に不採用と判明、詳細は`backend/src/db/clientStore.ts`冒頭コメント参照） | - | [x] | [x] |

#### スライス2-B: 案件進捗集計
| タスク | エンドポイント | メソッド | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|--------------|---------|:----:|:----:|:----:|:----:|:----:|:------:|
| 2.2 | /api/case-progress | GET | [x] | [x] | [x]（M-010(cloud_proxy)ゲートウェイの環境変数バインディング不安定性のため、同一のGoogle Sheets(案件進捗シート)をMCPゲートウェイ経由せず直接HTTPで読む方式を採用。設計判断の詳細は`backend/src/google/caseProgressSheetClient.ts`冒頭コメント参照。実データ(実Google Sheets・モック無し)での内部結合テストは`backend/src/__tests__/caseProgress.external.test.ts`(`npm run test:integration:external`で実行。実クレデンシャルはpassword-manager `dx-support-tool-google-sheets-id`/`dx-support-tool-google-service-account-json`から取得しシェルでexportして与える。.env系ファイルは作成しない。デフォルトの`npm test`からは`*.external.test.ts`除外設定により対象外) | - | [x] | [x] |

**凡例**: 実装=API実装 / Unit=ユニットテスト / 内部=内部結合テスト / 外部=外部結合テスト / 品質=品質担保 / FE統合=フロントエンドAPI統合(`dummyData.ts`から実データへの置き換え。E2E仕様書 3.1 節のとおりDASH-004〜007・014等のアサーション値更新も含む)

## MCP実装計画

### 実装順序・依存関係

| 順序 | MCP | 分類 | 担当 | 依存 |
|------|-----|------|------|------|
| 1-A | 補助金マッチング(M-011) | 新規開発 | Agent 8 | なし(NOTION_TOKEN/NOTION_DATABASE_ID取得済) |
| 1-B | assess_digital_maturity(M-012) | 新規開発 | Agent 8 | なし |
| 1-C | 案件管理MCP(M-010) Google認証情報準備 | インフラ準備 | Agent 8 | なし(リードタイム確保のため最優先で着手) |
| 2 | 案件管理MCP(M-010) 本体実装 | 新規開発 | Agent 8 | 1-C完了 |

※ 1-A・1-B・1-Cは並列着手可能。既存パッケージ導入(@MCP追加)に該当するMCPはなし(全て新規開発)。

### MCP実装タスクリスト

#### 新規開発(Agent 8で実施)
| ID | MCP名 | ツール数 | 実装 | Unit | 結合 | 接続テスト |
|----|-------|---------|:----:|:----:|:----:|:----------:|
| M-011 | 補助金マッチング(suggest_matching_subsidies) | 1 | [x] | [x] | [x] | [x] |
| M-012 | assess_digital_maturity | 1 | [x] | [x] | [x] | [x] |
| M-010 | 案件管理MCP(進捗記録・取得) | 2 | [x] | [x] | [x] | [ ] |

**凡例**: 実装=MCPサーバー実装 / Unit=ツール単体テスト / 結合=MCP間結合テスト(案件管理MCPは他6MCPの完了イベントとの整合性を含む) / 接続テスト=`claude mcp list`でConnected確認

**既知の制約(cloud_proxyの環境変数バインディング伝播)**: `save_mcp_env`で保存した環境変数は、ゲートウェイ側のWorkerインスタンスに即座に反映されないことがある。M-011は一度は同一セッション内で接続確認(実呼び出し成功)できたが、後続の別MCP(M-010)デバッグ作業中に再度呼び出したところ同じセッション内で「環境変数未設定」エラーに戻った(`save_mcp_env`再実行・`activate_service`再実行でも復旧せず)。M-012も同様に同一セッション内では反映されなかった。再現性のある確実な回避策は現時点でなく、新しいセッションでゲートウェイが再接続された際に反映される可能性が高い。M-010の`GOOGLE_SERVICE_ACCOUNT_JSON`が未反映なのはこの制約が主因(`register_personal_mcp`の`envVars`宣言漏れも一因として発見・修正済み)。Phase 10(E2E)・Phase 11(ローカル動作確認)実施時は、新しいセッションで`suggest_matching_subsidies`・`assess_digital_maturity`・`record_case_approval`/`list_case_progress`の実呼び出しを再度行い、必要なら`save_mcp_env`を再実行してから接続テスト列を確定させること。

## データモデル定義

> 自社DB(クライアントカルテ・診断履歴・ヒアリング回答等)ありのため、新規開発する各MCP側の永続化スキーマを以下に定義する。クライアント基本情報・財務データ・ヒアリング回答・診断履歴は既存の財務系MCPのクラウドDBを単一の真実源として継続利用し、ダッシュボードAPI側では独自DBを持たない(集約のみ)。

### assess_digital_maturity(M-012)側DB — `digital_maturity_assessments`

| フィールド | 型 | 説明 |
|-----------|-----|------|
| client_id | string | クライアントID(財務系MCP発行のIDを共通利用) |
| assessed_at | datetime | 診断実施日時 |
| sales_score | number | 営業領域(SFA/CRM・EC活用)スコア |
| admin_score | number | 総務経理領域(クラウド会計・電子帳簿保存法)スコア |
| hr_score | number | 労務領域(年末調整/社保電子化・勤怠管理)スコア |
| infra_score | number | 社内基盤領域(チャット/Web会議/RPA/電子契約)スコア |
| overall_score | number | 総合スコア |
| priority_improvements | json | 改善優先度リスト |
| raw_answers | json | 構造化ヒアリング回答の原本 |

**DB反映済み(Phase 8 M0)**: Supabaseプロジェクト`dx-support-tool`(ref: `rkpsabgqdqbphlfemntc`・region: ap-northeast-1)を新規作成し、上記スキーマ通りに`public.digital_maturity_assessments`テーブルを作成済み(RLS有効・service_roleのみfor all許可)。接続情報はpassword-managerに`dx-support-tool-supabase-database-url`(pooler・ランタイム用)/`dx-support-tool-supabase-direct-url`(直接接続・マイグレーション用)/`dx-support-tool-supabase-service-key`/`dx-support-tool-supabase-anon-key`/`dx-support-tool-supabase-db-password`/`dx-support-tool-supabase-project-ref`として保存済み。M-012実装時は`save_mcp_env`で`DATABASE_URL`(=database-url相当)・`SUPABASE_SERVICE_KEY`(=service-key相当)としてMCPサーバーへ反映すること。`.env`系ファイルは作成せず、`src/config/index.ts`等のconfig経由でprocess.envを参照する。

### 案件管理MCP(M-010) — Google Sheetsスキーマ(案件進捗シート)

| 列 | 説明 |
|----|------|
| case_id | 案件ID |
| client_id | 対応クライアントID |
| client_name | クライアント名(表示用) |
| step_1_status 〜 step_6_status | 各承認ポイントのステータス(`completed`/`active`/`pending`) |
| step_1_approved_at 〜 step_6_approved_at | 各承認ポイントの承認日時 |
| updated_at | 最終更新日時 |

6承認ポイントの固定順序: ①クライアント登録 → ②決算書解析 → ③ヒアリング回収 → ④財務分析 → ⑤ベンチマーク比較 → ⑥提案書生成(E2E仕様書DASH-021のラベル順・フロント型`ApprovalStep`と一致させること)

## MCP/ツール管理表

| ID | MCP/ツール名 | 種別 | hosting型 | requiredEnvVars | 着手 | 完了 |
|----|-------------|------|-----------|-----------------|------|------|
| M-001 | save_client_record | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-002 | parse_financial_statement | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-003 | register_hearing_answer | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-004 | remind_missing_hearing_items | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-005 | analyze_working_capital | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-006 | compare_cost_benchmark | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-007 | generate_proposal_draft | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-008 | list_client_history | 既存利用 | cloud_proxy | なし | [x] | [x] |
| M-009 | OCR抽出 | 既存利用(WSL2向けに再実装・接続済) | local | なし | [x] | [x] |
| M-010 | 案件管理MCP | 新規開発(Phase 5でMCPストアの同名ツールは別プロジェクト(漫画電子書籍パイプライン)用と判明したため方針変更) | cloud_proxy | GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON(save_mcp_envで個人MCP`mcp-1786198177746-f68bcc76`へ反映済み。旧`mcp-1786196517525-66d9ef6c`・`mcp-1786197448729-4954a8c1`はハンドラ引数解決バグのためdeactivate済み、詳細は環境構築メモ参照) | [x] | [ ] |
| M-011 | 補助金マッチング | 新規開発 | cloud_proxy | NOTION_TOKEN, NOTION_DATABASE_ID(取得済・password-manager保存済) | [x] | [x] |
| M-012 | assess_digital_maturity(DX成熟度診断) | 新規開発 | cloud_proxy | DATABASE_URL, SUPABASE_SERVICE_KEY(DB反映済・password-manager保存済。詳細は「データモデル定義」節参照) | [x] | [x] |

## ページ管理表

| ID | ページ名 | ルート | 権限 | 着手 | 完了 |
|----|---------|-------|------|------|------|
| P-001 | 進捗ダッシュボード | / | 本人のみ(簡易パスワード保護) | [x] | [x] |

## 外部アカウント準備状況

| サービス | アカウント | APIキー | セットアップ |
|---------|-----------|---------|------------|
| Notion | [x] | [x] | [x] 補助金台帳データベースを新規作成し、インテグレーション「DX伴走支援ツール-補助金マッチング」を接続済み。NOTION_TOKEN・NOTION_DATABASE_IDはpassword-manager(`dx-support-tool-notion-token` / `dx-support-tool-notion-database-id`)に保存済み。M-011実装完了に伴いsave_mcp_envで個人MCP(`mcp-1786191971522-b63a8801`)へ反映済み |
| Google Sheets | [x] | [x] | [x] GCPプロジェクト`dx-support-case-mgmt-4921c3`を新規発行し、Sheets API有効化・専用サービスアカウント`case-management-mcp@dx-support-case-mgmt-4921c3.iam.gserviceaccount.com`を作成(JSONはpassword-manager `dx-support-tool-google-service-account-json` に保存済み)。サービスアカウント単体はDriveストレージクォータ0のためスプレッドシート自己作成不可と判明(`PERMISSION_DENIED`実測)。`gcloud auth login/application-default login --enable-gdrive-access`による人間アカウントへのDriveスコープ付与も試行したが、gcloud共有OAuthクライアントはGCP系スコープに限定されるためDriveスコープが付与されず断念(公式ヘルプに「Drive等GCP外のスコープは独自OAuthクライアントID作成が必要」と明記あり)。最終的に人間アカウント(lovegreen24@gmail.com)でスプレッドシート「DX伴走支援ツール - 案件進捗」を手動作成しサービスアカウントへ編集者共有する方式で解決。スキーマ通りヘッダー行(case_id, client_id, client_name, step_1_status〜step_6_status, step_1_approved_at〜step_6_approved_at, updated_at)をサービスアカウント権限で投入・書き込み権限を実証済み。スプレッドシートIDはpassword-manager(`dx-support-tool-google-sheets-id`)に保存済み。M-010本体実装時にsave_mcp_envで反映する |

## 環境構築メモ(Phase 5)

- フロントエンド`.env.local`(`VITE_DASHBOARD_PASSWORD`)は設定済み。`frontend/src/config/index.ts`に集約し、`AuthContext.tsx`から参照するよう修正
- OCR抽出MCP: ストア上の登録(`mcp-1785090666404-0fc42f06`)がWindows環境(lghid)向けパスのままでこのWSL2環境からは起動不可だったため、`~/.claude/mcp-servers/ocr-extract`にTesseract.js製MCPを再実装し、個人MCP`mcp-1786122220988-b095244a`として新規登録・always_on化・動作確認済み
- MCPストアの「案件管理MCP」(`mcp-1783864325728-105c9565`)は実体が別プロジェクト(漫画電子書籍自動化パイプライン)用のスキーマ(theme/cover/manuscript/kdp_submission等)であることが判明。DX支援ツールのクライアント案件・6承認ポイント管理とは別物のため流用せず、M-010は新規開発方針に変更(ユーザー確認済み)

## 環境構築メモ(Phase 8・M-011)

- 補助金マッチングMCP(`mcp-servers/subsidy-matching/`)を実装。unit 29件・外部結合(実Notion API) 4件、全PASS(品質担保の静的解析で不正モック・スキップなし)を確認後、`register_personal_mcp`で個人MCP(`mcp-1786191971522-b63a8801`)として登録し、`install_from_store`→`activate_service(always_on)`→`save_mcp_env`(NOTION_TOKEN, NOTION_DATABASE_ID)まで完了
- 接続テスト: 同一セッション内では当初未反映だったが、`save_mcp_env`再実行→`activate_service`後にツールがゲートウェイへ反映され、オーケストレーターが`suggest_matching_subsidies(client_id: "connectivity-check", industry: "製造業")`を実呼び出しして正常応答を確認済み(接続テスト列・完了列を`[x]`に更新済み)

## 環境構築メモ(Phase 8・M-012)

- DX成熟度診断MCP(`mcp-servers/digital-maturity/`)を実装。営業/総務経理/労務/社内基盤4領域・計13診断項目のカタログ(`src/catalog.ts`)を単一の真実源とし、スコアリングは外部I/Oを含まない純粋関数(`src/scoring.ts`)に切り出し(functional core)、Supabase書き込みは`pg`によるリポジトリ層(`src/db.ts`)に分離(imperative shell)
- `pg`をhostingに採用した理由: Cloudflare Workers上で実行される`register_personal_mcp`のハンドラ方式は生TCPのPostgres接続に対応しないため、`@MCP追加`知識のパターンC(自作・カスタムロジック)に従い、Node子プロセスとして起動する`register_personal_local_mcp`を採用(M-011のCloudflare Workers方式とは異なる実行方式)
- unit 28件(scoring 17件・config 4件を含む)・内部結合(実Supabase DB、DBモック無し)7件、全PASS(品質担保の静的解析で不正モック・スキップなしを確認)。テストで作成したデータは全てclient_id単位で後始末し、DB上の残留ゼロを確認済み
- `register_personal_local_mcp`で個人MCP(`mcp-1786192506148-5c36a8b1`)として登録(command=node, args=[`/home/lovegreen24/Project_04/mcp-servers/digital-maturity/dist/index.js`])→`save_mcp_env`(DATABASE_URL, SUPABASE_SERVICE_KEY)→`activate_service(always_on)`まで完了
- 接続テスト: オーケストレーターが同一セッション内でゲートウェイ経由の`assess_digital_maturity(client_id: "connectivity-check", answers: 全項目0)`を実呼び出しし、Supabaseへの実書き込み・スコアリング結果の正常応答を確認済み(接続テスト列・完了列を`[x]`に更新済み)。なお`client_id: "connectivity-check"`のテスト行が`digital_maturity_assessments`テーブルに残存しているため、本番データ集計前に削除すること

## 環境構築メモ(Phase 8・M-010)

- 案件管理MCP(`mcp-servers/case-management/`)を実装。ツールは`record_case_approval`(6承認ポイントのうち1つのステータスを記録。未登録case_idなら全ステップ`pending`で新規行を作成しつつ対象ステップを更新、`completed`にすると次ステップが`pending`ならactiveへ自動繰り上げ)・`list_case_progress`(case_id/client_idで絞り込み可能な一覧取得)の2つ
- 6承認ポイントのラベル順(クライアント登録・決算書解析・ヒアリング回収・財務分析・ベンチマーク比較・提案書生成)は`src/constants.ts`の`APPROVAL_POINT_LABELS`を単一の真実源とし、E2E仕様書DASH-021・フロント型`ApprovalStep`(`frontend/src/types/index.ts`)と一致させた
- hosting型はM-011同様`cloud_proxy`(`register_personal_mcp`・Cloudflare Workers方式)を採用。Google Sheets API(REST)・サービスアカウントJWT署名ともWeb Crypto API(`crypto.subtle`)・`atob`/`btoa`のみで実装し、Node固有API(`node:crypto`等)に依存しないため、Node上のstdio版(`src/index.ts`、ローカルテスト・単体テスト用)とCloudflare Workersハンドラ(登録時提出コード)の両方で同一ロジックが動作することを実機検証済み(後述)
- unit 36件(config/auth/rowMapper/sheets/record_case_approval/list_case_progressの6ファイル)・外部結合(実Google Sheets API、テストで書き込んだ行はafterAllで削除・後始末を実測確認)4件、全PASS。品質担保として行長120文字超・関数/ファイルサイズ超過・`.skip`/`.only`/不正モック混入が無いことを監査済み
- 結合テストの範囲: タスク指示に従い「実際のGoogle Sheetsに対する外部結合テスト」を実施(モック禁止)。案件管理MCP/ツール管理表の凡例が言及する「他6MCPの完了イベントとの整合性」検証(財務系6MCPの処理結果からrecord_case_approvalを実際に呼び出す一連の連携)は、進捗ダッシュボードAPI(2.2 `/api/case-progress`、Phase 9)側で実データ疎通確認する際に別途実施する
- `register_personal_mcp`での登録前に、登録予定のハンドラ用JS(Workers互換・importなし自己完結コード)を`AsyncFunction(input, env)`としてローカルで組み立て、実際のGoogle Sheetsに対して新規作成→更新→一覧取得のフルフローを実行し正常動作・後始末(残留ゼロ)を確認してから登録した
- 個人MCP(`mcp-1786196517525-66d9ef6c`)として`register_personal_mcp`→`install_from_store`→`activate_service(always_on)`→`save_mcp_env`(GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON)まで完了。`list_my_personal_mcps`で`status: active`・ツール2件登録済みを確認

### 障害対応(初回デプロイのハンドラ引数不一致バグ)

- オーケストレーターが実際にツール呼び出しを行ったところ、両ツールとも`ReferenceError: input is not defined` / `env is not defined`で失敗。原因は、登録前にローカルの`AsyncFunction(input, env)`検証だけでは、実際にCloudflare Workersランタイムが注入する引数名(パラメータ名)が`input`/`env`と一致するとは限らない点を見落としていたこと(M-011は結果的に命名が一致していたため問題が顕在化しなかった可能性がある)
- `update_personal_mcp`でハンドラを診断用コードに差し替えて`deactivate_service`→`activate_service`しても、再現テストで全く同じエラー行番号(`worker.js:240:42`)が返り続けたことから、**`update_personal_mcp`はカタログ(DB)更新のみで、既存の個人MCPのCloudflare Workers本体は再デプロイされない**ことが判明(`restart_service`もcloud_proxyには非対応と判明)。実デプロイを伴うのは`register_personal_mcp`(新規`mcp_id`発行)のみ
- 対策として、ハンドラ本文の先頭に`arguments`(関数の実引数を名前非依存で取得できるJS標準機能)を使った自己適応型のコンテキスト解決ロジック(`__resolveContext`)を追加。`input`/`env`/`args`/`params`/`environment`/`secrets`等の代表的な変数名を`typeof`で安全に探索し、見つからなければ実引数を位置・キー形状(`GOOGLE_SHEETS_ID`の有無、`case_id`等の有無)で判別する方式に変更。ローカルで`input/env`・`a/b`(名前不一致)・`ctx`(単一オブジェクトに`{input, env}`をネスト)・`args/environment`・`toolArgs/bindings`の5パターンの呼び出し規約をシミュレートし、実際のGoogle Sheetsに対して全パターンでrecord→list→後始末が成功することを確認済み
- 修正版(v2)を`register_personal_mcp`で新規`mcp_id: mcp-1786197448729-4954a8c1`として再登録→`activate_service`→`save_mcp_env`まで実施したが、オーケストレーターの再テストで両ツールとも`ReferenceError: arguments is not defined`により失敗。`arguments`はアロー関数に存在しないオブジェクトであり、v2の「実行時にtypeof等で名前を推測する」自己流の対応そのものが誤りだった(`Array.prototype.slice.call(arguments)`をtypeof等でガードせず直接参照していた箇所が原因)

### 一次情報の確認による根本修正(v3)

- 推測をやめ、実際に稼働中のM-011(`suggest_matching_subsidies`)がregister_personal_mcpに渡した「ハンドラコード本文」そのものを`update_personal_mcp`(No-opに近い`category`再指定)のレスポンスとして取得し、一次情報を確認。実際の解決パターンは以下だった(引数名は`args`/`params`、`arguments`は`typeof`で存在確認してから使う。`env`は`env[key]`のブラケットアクセスで参照):
  ```js
  const input = (typeof args !== 'undefined' && args) || (typeof params !== 'undefined' && params) || (typeof arguments !== 'undefined' && arguments[0]) || {};
  const getEnv = (key) => (typeof env !== 'undefined' && env && env[key]) || (typeof process !== 'undefined' && process.env && process.env[key]);
  ```
  これによりプラットフォームがハンドラをアロー関数としてラップしている(`arguments`非対応)ことが確定し、v2の自己流推測が誤りだった根本原因が判明した
- このパターンをそのまま踏襲してM-010のハンドラを書き直し(v3)。ローカルで`new Function('return (async (args, env) => {...})')()`によりM-011と同一の呼び出し規約(アロー関数・args/env)を再現した上で、record→list→更新→後始末の一連フローが実際のGoogle Sheetsに対して成功することを確認してから提出した
- `register_personal_mcp`で新規`mcp_id: mcp-1786198177746-f68bcc76`として再登録(旧`mcp-1786196517525-66d9ef6c`・`mcp-1786197448729-4954a8c1`は`deactivate_service`で無効化)→`install_from_store`→`activate_service(always_on)`→`save_mcp_env`(GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON)まで完了。診断用に作成した一時MCP(`mcp-1786196916790-44b0e4c6`)も無効化済み
- 接続テスト: M-011/M-012と同様、同一セッション内ではゲートウェイに新ツールが反映されず(`ToolSearch`で継続して未検出)、このセッションからの実呼び出しでの最終確認はできなかった。オーケストレーターが後続セッションで`mcp-1786198177746-f68bcc76__record_case_approval`/`__list_case_progress`の実呼び出しによる接続確認を行う想定(接続テスト列は`[ ]`のまま)

## 環境構築メモ(Phase 9)

- `frontend/src/services/api/dashboard.ts`のスケルトン(`@API_INTEGRATION`)を実装。`frontend/src/lib/apiClient.ts`(axiosインスタンス、baseURLは`config.apiBaseUrl`←`VITE_API_BASE_URL`)経由で`/api/clients`・`/api/case-progress`を呼び出す
- `frontend/src/hooks/useClients.ts`・`useCaseProgress.ts`を新規作成(`@tanstack/react-query`の`useQuery`。`main.tsx`に`QueryClientProvider`を追加)。`DashboardPage.tsx`・`ClientListSection.tsx`・`CaseProgressSection.tsx`のハードコード(`DUMMY_CLIENTS`/`DUMMY_CASE_PROGRESS`)をフック呼び出しに置換し、ローディング(`CircularProgress`)・エラー(`Alert`)表示を追加。`frontend/src/pages/dashboard/dummyData.ts`は削除済み
- **バックエンドの追加修正(CORS)**: ローカルでの疎通確認中、フロントエンド(Vite dev server)からのXHRが`Access-Control-Allow-Origin`ヘッダー欠如によりブロックされることが判明(Agent 8時点ではAPI単体のcurl確認のみでブラウザからの疎通確認はしていなかったため未検出)。`backend/src/app.ts`に`cors`パッケージを追加し、`config.frontendOrigin`(`FRONTEND_ORIGIN`環境変数・カンマ区切り、未設定時は全オリジン許可)で許可オリジンを制御するミドルウェアを追加
- **既知の未実施事項(バックエンドAPI認証)**: `/api/clients`・`/api/case-progress`はAgent 8実装時点・本Phase時点ともに認証機構を持たない(フロントエンドの簡易パスワード保護は`sessionStorage`によるSPA側のみで、バックエンドAPIへの直接アクセスは防げない)。本Phaseのスコープ(FE統合)外のため対応は見送ったが、Phase 11(ローカル動作確認)またはPhase 12(デプロイ)着手前に対応要否を検討すること
- 動作確認: バックエンド(`PORT=4620`)・フロントエンド(Vite dev、ランダムポート)を起動し、password-managerから取得した実クレデンシャル(`dx-support-tool-google-sheets-id`/`dx-support-tool-google-service-account-json`、シェルで一時export、ファイル化せず)で`/api/case-progress`が実Google Sheetsに正常疎通することを確認。`backend/data/clients.json`(gitignore対象)に一時テストデータを投入し、MCP Playwrightでログイン→ダッシュボード表示→統計カード/クライアント一覧の実データ反映→レスポンシブ(375px)を実機確認(コンソールエラー0件)。確認後、一時テストデータ・スクリーンショット・ローカルサーバープロセスは全て削除/停止済み
- `npx tsc --noEmit`・`npm run build`(フロントエンド)ともにエラー0件
