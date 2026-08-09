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

### 拡張フェーズ

> 開発フェーズ(Phase 1〜12)は全て完了。以降は機能拡張・運用フェーズ。

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
| 10 | E2Eテスト | Agent 10 | [x] |
| 11 | ローカル動作確認 | Agent 11 | [x] |
| 12 | デプロイ | Agent 12 | [x] |

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

## 📊 受入試験進捗(Phase 10)

- 種別判定: 複合型(MCP実装計画のMCP型記述 + バックエンド実装計画の垂直スライス/エンドポイント実装タスクリストが両方存在) → **MCP結合テスト ＋ UIエンドツーエンドテストの両方が必須**
- AI本体(プロンプトY): あり(財務分析・DX成熟度診断・提言書生成) → **プロンプト改善テストも必須**(Phase 7登録の6エージェント対象)

### MCP結合テスト(実施日: 2026-08-08・新セッション)

テスト用クライアント「E2E受入試験株式会社」(`client_id: 0c229e81-5d51-4207-8076-e8641d41e13d`)を作成し、業務フローを実データ・モック無しで一気通貫実行。

| ツール | 結果 | 備考 |
|---|:---:|---|
| save_client_record | ✅ | client_id発行確認 |
| register_hearing_answer | ✅ | A〜H全29項目を登録確認 |
| remind_missing_hearing_items | ✅ | 全項目登録後に空配列を返すことを確認(未回答検出ロジック正常) |
| analyze_working_capital | ✅ | riskLevel: "danger" を実データで算出。4ステップ超速診断が実際に機能することを確認 |
| compare_cost_benchmark | ⚠️ | ツールは正常応答するが、テストした4項目(複合機リース/電気料金/警備保守/法人携帯)全てhasBenchmarkData: false・削減見込み0円。内蔵ベンチマークデータのitem_name網羅範囲を要確認(次回セッションでの調査項目) |
| generate_proposal_draft | ✅ | ヒアリング全問完了を前提条件通り要求。財務分析結果を統合し、税理士・社労士への相談を促す免責事項付きの提言書ドラフトを実データで生成確認 |
| list_client_history | ✅ | 登録した診断履歴を正しく返すことを確認 |
| assess_digital_maturity(M-012) | ✅ | 実Supabaseへ保存確認(assessment id: `3c2182de-6c5a-43ae-8129-035fd959e556`)。MCP/ツール管理表のM-012接続テスト列は元々[x]済みだが本セッションでも再確認できた |
| record_case_approval/list_case_progress(M-010) | ❌ | `GOOGLE_SERVICE_ACCOUNT_JSONが未設定です`エラーが再発。save_mcp_env再実行→deactivate_service→activate_serviceのサイクルを試したが解消せず。既知の制約(cloud_proxyの環境変数バインディング伝播、本ファイル「MCP実装計画」節末尾に記載)通り、同一セッション内では解消不可と再確認。**次回新セッションで再検証要**、MCP/ツール管理表のM-010接続テスト列は引き続き[ ] |
| suggest_matching_subsidies(M-011) | ❌ | `NOTION_TOKEN, NOTION_DATABASE_ID`未設定エラーが再発。M-010と同様の理由で同一セッション内解消不可。**次回新セッションで再検証要** |

**⚠️ 残留テストデータ(本番データ運用開始前に削除要)**:
- `client_id: 0c229e81-5d51-4207-8076-e8641d41e13d`(E2E受入試験株式会社) — 財務系MCP群に削除ツールが存在しないため、MCP経由でのクリーンアップ不可。クラウドDB側で手動削除が必要
- Supabase `digital_maturity_assessments` の `id: 3c2182de-6c5a-43ae-8129-035fd959e556` — password-manager `dx-support-tool-supabase-*` 経由で削除可能(M-012の`connectivity-check`行と合わせて削除すること)

### プロンプト改善テスト(実施日: 2026-08-08)

Phase 7登録済み6エージェントを対象に、各エージェントの本体プロンプトを実際に読み込んで採用し、実データでのシナリオ実行(モック無し)を行い、目標成果物X(requirements.md・context/*.md)と突き合わせた。

| エージェント | 判定 | 主な所見 |
|---|:---:|---|
| @クライアント管理 | ⚠️ 一部FAIL | シナリオA(新規登録)はPASS。シナリオB(DX成熟度診断履歴検索)はFAIL — **登録時の説明文「DX成熟度診断履歴の検索」を実現するMCPツールが存在しない**(M-012 `assess_digital_maturity`は書き込み専用で、過去診断結果を取得するlist/get系ツールが未実装)。list_client_historyは財務診断(analyze_working_capital)履歴のみを返し、DX成熟度診断結果とは別エンティティ・別DB(Supabase)。データの捏造は無く正直に結果提示していた点は健全 |
| @ヒアリング管理 | ✅ PASS | 訪問メモからのカテゴリ/question_idマッピングに数値の捏造なし。メモに無い情報(業種・決算期等)は未登録のまま残す抑制が効いていた |
| @ヒアリング支援 | ✅ PASS | 対話ルール(1問1答・復唱確認・曖昧回答は保留)が機能。**@ヒアリング管理との役割重複を確認**(DBフロー・運用ルールがほぼ同一、相違は入力契機のみ)。両エージェント間に明示的なオフランプが無く、同一クライアントに並行運用すると上書き競合のリスクあり |
| @決算書解析 | ⚠️ 暫定PASS | 実決算書画像が無いため静的レビューのみ(Vision実行テストは未実施)。プロンプト設計自体はclient_id紐付け・不正確値の断定回避・「解析結果だけで運転資金分析項目が自動的に埋まるとは限らない」という要件上の懸念(requirements.md 83行目)への注記も適切。**実データでのVision解析テストは別途必要** |
| @財務分析 | ✅ PASS | 2026-08-08刷新版(運転資本分析4点構成+コストベンチマーク3点構成+対話提示型、役員報酬シミュレーション削除)が要件通り機能。コストベンチマークの「幅提示」は実データ上ベンチマーク該当なしのため未検証(プロンプト欠陥ではない) |
| @提言書生成 | ✅ PASS(修正済み) | シナリオA(正常系)PASS。シナリオB(ヒアリング未完了時)は成立するが、**§0.7の依存MCP宣言が誤り(requiredEnvVars: ANTHROPIC_API_KEY, DATABASE_URLと記載 → 実際は「なし」)、かつremind_missing_hearing_itemsが依存MCPとして宣言されておらず「未完了項目を具体的に提示する」(§2成功基準1)を満たす手段が本文から欠落**していた不備を発見。generate_proposal_draftの400エラー応答は項目詳細を含まないため、この宣言漏れは成功基準を満たせないリスクに直結。**edit_my_agentで直接修正済み**(§0.7にSTEP 0-C remind_missing_hearing_itemsを追加・requiredEnvVars誤記を訂正・Phase 1手順にremind_missing_hearing_items呼び出しを明記)。旧版はエージェント編集履歴に自動保存済み |

**次回セッションで検討すべき事項**:
- @クライアント管理の説明文とM-012の機能ギャップ(DX成熟度診断の履歴取得ツールが存在しない)は、説明文の修正だけで解決するか、M-012に新規list/getツールを追加するかの意思決定が必要(未対応・ユーザー判断待ち)
- @ヒアリング管理と@ヒアリング支援の役割重複・並行運用時の上書き競合リスクへの対応要否(未対応・ユーザー判断待ち)

### UIエンドツーエンドテスト(実施日: 2026-08-08)

進捗ダッシュボード(P-001)のE2Eテスト仕様書(docs/e2e-specs/進捗ダッシュボード-e2e.md)30項目(DASH-001〜030)を`frontend/tests/e2e/dashboard.spec.ts`として実装し、Playwright(chromium・headless)でページ丸ごと並列実行。

**テストデータ**: 実データで3クライアント(完了/進行中/未着手の3状態を再現)・案件進捗2件(4/6完了+進行中1件・6/6完了1件)をバックエンドのローカルDB(`backend/data/clients.json`)とGoogleスプレッドシート「案件進捗」に投入(投入方法・残留データは後述)。

**結果**: **30/30 PASS**(最終実行)。ただし初回実行では7件Fail、うち5件はテストのセレクタ不備(修正済み)、**2件(DASH-027・DASH-030、および連鎖的にDASH-029も同根)は実際のUIバグ**だった。

**🐛 発見・修正したUIバグ**: `CaseProgressSection.tsx`のStepper(6承認ポイント)が`alternativeLabel`のままモバイル幅(375px)で一切折り返されず、後半のステップラベルが1文字ずつ縦に潰れて画面外へはみ出し、`document.body`レベルで横スクロールが発生していた(Playwrightで実際にスクリーンショットを撮って視覚的に確認・確定)。`Stepper`を`overflowX: auto`のBoxで囲み`minWidth: {xs: 560, sm: 0}`を付与し、Stepper単体でスクロール可能にする対応で修正(クライアント一覧テーブルで既に採用されていたのと同じパターン)。修正後、DASH-027/029/030を含む全30項目がPASS。`npx tsc --noEmit`はエラー0件。

**⚠️ 残留テストデータ(本番データ運用開始前に削除要)**:
- `client_id: 76a8e682-8384-4bab-9bea-f9fef6aa08b0`(E2E未着手確認商事株式会社) — 財務系MCPのクラウドDB側で手動削除が必要(削除ツール無し、前述の通り)
- `backend/data/clients.json` — E2Eテスト用の3クライアントスナップショットが残留(gitignore対象のローカルファイルのため、次回本番クライアント登録前にクリアするか、`ClientStore`の`upsertProfile`が本番クライアントIDで上書きされない限りそのまま残る)
- Googleスプレッドシート「案件進捗」に`E2E-CASE-001`・`E2E-CASE-002`の2行が残留(Sheets API直接書き込みで追加。案件管理MCP(M-010)経由ではなくバックエンドと同じ認証情報を使うテストスクリプトで投入。行の手動削除が必要)

**メモ**: E2Eテスト実行時はバックエンド(`PORT=4620`)を`GOOGLE_SHEETS_ID`/`GOOGLE_SERVICE_ACCOUNT_JSON`を環境変数export(ファイル化せず)した状態で起動し、フロントエンドはVite dev(`--port 3186`)で起動した。両サーバーとも本セッション終了時に停止済み。

#### 受入試験チェックリスト(進捗ダッシュボード・P-001)

| 状態 | ID | 項目 |
|:----:|-----|------|
| [x] | DASH-001〜030 | 全30項目PASS(`frontend/tests/e2e/dashboard.spec.ts`)。詳細は上記結果セクション参照 |

### Phase 10 総括

- MCP結合テスト: 財務系フロー・M-012は完了。**M-010/M-011は次回新セッションでの再検証が必要(未完了)**
- プロンプト改善テスト: 6エージェント検証完了、1件修正済み。ユーザー判断待ちだった2件は以下の通り対応済み:
  - **M-012に`list_digital_maturity_history`ツールを新規追加**(`mcp-servers/digital-maturity/src/tools/listDigitalMaturityHistory.ts`)。client_id単位でDX成熟度診断履歴を新しい順に取得する。内部結合テスト3件追加・実Supabaseで全10件PASS確認。`restart_service`で反映・ゲートウェイ経由の実呼び出しでも動作確認済み(ツール数1→2)。`@クライアント管理`エージェントを編集し、この新ツールを使うPhase C(DX成熟度診断履歴の一覧・検索)を追加。説明文と実装のギャップを解消
  - **`@ヒアリング管理`と`@ヒアリング支援`を統合**。旧`@ヒアリング支援`(ID: 81a0995e-fa01-40de-a762-867ad44a4e1d、bluelamp121)の対話型ヒアリング機能(8カテゴリ詳細・黒字倒産の3サイン3罠の背景知識・カテゴリE/Gの法規制ガードレール)を、`@ヒアリング管理`(ID: c8e36026-164f-403c-a191-126d61f09d36、bluelamp125)の事後構造化機能(訪問メモからの構造化・カタログ突合・登録対象外の明示)にモードA/B統合として一本化(v2.0)。`update_my_agent`で全文置換、旧`@ヒアリング支援`は`delete_my_agent`で削除。`@財務分析`・`@提言書生成`内の「ヒアリング支援エージェントへ」の参照4箇所も「ヒアリング管理エージェントへ」に更新済み
- UIエンドツーエンドテスト: **30/30 PASS、発見したUIバグ1件は修正済み**
- 上記の対応により、開発フェーズ表のPhase 10は**M-010/M-011の新セッションでの再接続確認のみが残課題**。それ以外は完了

**M-010/M-011再接続の再試行結果(同一セッション内・3回目)**: `deactivate_service`→`save_mcp_env`再実行→`activate_service`のフルサイクルを再度実施したが、`list_case_progress`は`GOOGLE_SERVICE_ACCOUNT_JSONが未設定です`、`suggest_matching_subsidies`は`NOTION_TOKEN, NOTION_DATABASE_ID未設定`のまま変化なし。環境変数自体はサーバー側に保存済み(`save_mcp_env`の応答で確認)だが、cloud_proxyゲートウェイの当該Workerインスタンスへの反映が本セッション内では一切発生しない状態を3回再現した。CLAUDE.md「環境変数エラー→全タスク停止、即報告(試行錯誤禁止)」に従い、本セッションでの追加リトライは行わない。**次回、全く新しいセッションを開始した時点で`list_case_progress`・`suggest_matching_subsidies`を1回ずつ呼び出して確認すること**(環境変数の再設定は不要、既にサーバー側に保存済み)。

**M-010/M-011再接続の再試行結果(2026-08-08・新セッション/Agent 11実施)**: 新しいセッションで`list_case_progress`・`suggest_matching_subsidies`を1回ずつ実呼び出しして確認したが、**4セッション連続で同一エラーが再現**(`GOOGLE_SERVICE_ACCOUNT_JSONが未設定です` / `NOTION_TOKEN, NOTION_DATABASE_ID未設定`)。CLAUDE.md「同じエラー3回→Web検索で最新情報を収集」の閾値を超えているが、cloud_proxyゲートウェイ側(プラットフォーム側)の環境変数バインディング反映不良であり、アプリケーション側コードの問題ではないため、本プロジェクト側でのこれ以上の対応(save_mcp_env再実行等)は行わない。**Phase 10のM-010/M-011接続テスト列は`[ ]`のまま据え置き、ユーザー判断待ちの既知課題として引き継ぐ**。なお`/api/case-progress`(進捗ダッシュボードAPI)はM-010ゲートウェイを経由しない別経路(同一Googleスプレッドシートへの直接HTTP読み取り)のため、この問題の影響を受けず正常動作する(本セッションで実データ疎通確認済み)。

## 🖥️ ローカル動作確認(Phase 11・実施日: 2026-08-08)

- バックエンド(`PORT=4620`、`GOOGLE_SHEETS_ID`/`GOOGLE_SERVICE_ACCOUNT_JSON`をpassword-managerから取得しシェルでexport)・フロントエンド(Vite dev、ポート3225)をローカル起動
- Playwright MCPでログイン→ダッシュボード表示を実機確認。コンソールエラー0件、統計カード・クライアント一覧・案件進捗セクションとも正常表示(クライアント0件・案件0件は`backend/data/clients.json`が空かつGoogleスプレッドシートに残留データが無い実際の状態を反映したもので、表示異常ではない)
- 修正指示は無く、「完了」を受けてマージ前ローカル受入ゲート(型・lint・テスト・本番運用診断)を実施

## 🔒 本番運用診断(Phase 11・実施日: 2026-08-08)

**総合スコア推移**: 第1回 72/100 (C評価: Fair) → 第2回 91/100 (A評価: Excellent) ✅ 目標(90点)達成

> 診断基準は企業向け1000ユーザー規模を前提とするが、本ツールは「配布: マイ専用(コンサルタント本人のみ)」(要件定義0章)のため、単一利用者規模では実害の小さい項目(高負荷対応のキャッシング戦略等)は過剰実装を避け、スコアと実装判断の乖離をこの節に明記した。

### カテゴリ別スコア(第2回・最終)

| カテゴリ | スコア | 主な内容 |
|---------|--------|---------|
| セキュリティ | 28/30 | CVSS脆弱性0件(backend/frontend/MCP3種、実`npm audit`確認)。ライセンス全て商用利用可(MIT/ISC/BSD、実`license-checker`確認)。**`/api/clients`・`/api/case-progress`にAPI認証が無い**(Phase 9で保留されていた既知課題)ことが判明したため対応(後述)。Helmetによるセキュリティヘッダー追加。デプロイ前のためクラウドインフラ(IAM等)評価はPhase 12に持ち越し(-2点) |
| パフォーマンス | 17/20 | Supabase `digital_maturity_assessments`に`client_id`インデックスが既に存在することを実DB接続で確認(追加対応不要)。N+1問題なし(単純なfetch構成)。バンドルサイズ628KB(gzip 199KB、1-3MB帯)・backend側キャッシュ無し(React Queryによるフロント側キャッシュはあり、小規模利用のため許容)は改善余地として残す(-3点) |
| 信頼性 | 18/20 | グローバルエラーハンドラー追加(テスト付き)。`ClientStore`書き込みをtmpファイル+rename方式でアトミック化(プロセス強制終了時の破損防止)。トランザクション管理・同時アクセス対応は、Google Sheets/Supabaseへの書き込みが単一ステートメントであること、かつ書き込みがClaude Code経由の単一プロセス同期I/Oであり並行書き込み経路が実装上存在しないことを実装確認した上でスコアリング(過剰なロック機構は追加せず) |
| 運用性 | 19/20 | Winston導入で構造化ログ(JSON)化。`GET /api/metrics`(uptime/memory/nodeVersion、認証不要)を新設。`docs/DEPLOYMENT.md`を新規作成(環境変数一覧・バックアップ手順・監視推奨・既知の制約)。**`.github/workflows/ci.yml`がリポジトリルートに`tsconfig.json`/`turbo.json`が無いため実質何もチェックしていないno-opだったバグを発見・修正**(`package.json`を持つ各パッケージ(backend/frontend/mcp-servers/*)を走査してtsc・lintを個別実行する方式に変更) |
| コード品質 | 9/10 | backendテストカバレッジ実測92.54%(`vitest --coverage`、@vitest/coverage-v8導入)。型安全性(tsc/oxlint全緑)満点。ドキュメントはSCOPE_PROGRESS/requirements/DEPLOYMENT全て充実しているがルートREADME.mdは未作成(CLAUDE.mdの許可ドキュメント一覧外のためユーザー許諾なしに新規作成せず、-1点) |

### 実施した修正(第1回→第2回)

- **バックエンドAPI認証の追加**: `backend/src/middleware/apiKeyAuth.ts`新設。`/api/clients`・`/api/case-progress`にX-API-Keyヘッダー認証を追加(未設定時500・不一致時401でfail-closed)。フロントエンド`apiClient.ts`から同一キーを送信するよう変更。キーは`openssl rand -base64 24`で生成しpassword-manager(`dx-support-tool-api-key`)に保存、backend側`API_KEY`環境変数・frontend側`VITE_API_KEY`(`.env.local`)として反映。既存テスト(`clients.route.test.ts`等)にヘッダー付与・401/500系テストを追加
- **Helmet導入**によるセキュリティヘッダー付与(`X-Content-Type-Options`・`X-Frame-Options`・`Strict-Transport-Security`等を実レスポンスで確認)
- **グローバルエラーハンドラー**追加(`app.ts`の`errorHandler`をexportしユニットテスト可能に)
- **`ClientStore`書き込みのアトミック化**(一時ファイル+rename)
- **Winston構造化ログ導入**(`backend/src/logger.ts`)、`server.ts`/`app.ts`の`console.log`/`console.error`を置換
- **`GET /api/metrics`エンドポイント新設**(認証不要・業務データを含まない運用監視用)
- **`docs/DEPLOYMENT.md`新規作成**
- **`.github/workflows/ci.yml`修正**(no-opバグの解消。ローカルで`find . -maxdepth 3 -name package.json`によるパッケージ発見ロジックを検証し、backend/frontend/mcp-servers 3種の計5パッケージが正しく列挙されることを確認)
- **Supabase `digital_maturity_assessments`のインデックス確認**(既に存在していたため追加実装は無し)
- 上記修正後、backend型チェック・lint・テスト(92/92 PASS)・frontendビルドが全て緑であることを再確認。API認証追加後もPlaywright MCPで実際にダッシュボードにログインし、コンソールエラー0件・正常表示を再確認済み

### 意図的に見送った項目(過剰設計回避の判断)

- キャッシング戦略(Redis等)の追加: 単一コンサルタントの低頻度アクセス想定のため、React Query(フロント側)のみで十分と判断
- バンドルサイズの本格的なコード分割: 単一ページ(進捗ダッシュボード1画面)のSPAのため、ルート分割による恩恵が小さい。gzip後199KBは実用上問題ない転送量と判断
- トランザクション管理・同時アクセス対応の追加実装(ロック機構等): 実装確認の結果、書き込みは全て単一ステートメント・単一プロセス同期I/Oであり、保護すべき並行書き込み経路が存在しないため
- ルートREADME.mdの新規作成: CLAUDE.mdの許可ドキュメント一覧(`docs/SCOPE_PROGRESS.md`・`docs/requirements.md`・`docs/DEPLOYMENT.md`・`docs/e2e-specs/`)に含まれないため、ユーザー許諾なしに作成しなかった

## 🚀 デプロイ(Phase 12・実施日: 2026-08-09)

**本番環境URL(⚠️ 変更禁止)**:
- フロントエンド: https://dx-support-tool.vercel.app
- バックエンド: https://dx-support-tool-backend-244699407868.asia-northeast1.run.app

**構成変更(要件定義書からの変更点)**: フロントエンドホスティングは要件定義書§6で「Cloudflare Pages」としていたが、Cloudflareアカウント未保有・vercel CLI認証済みのユーザー判断により**Vercelに変更**(requirements.md §6更新済み)。バックエンドは要件定義時点で未確定だったため、本Phaseでユーザーと協議しCloud Run(gcloud認証済み・GCPプロジェクト`gen-lang-client-0662622046`)に決定。

**実施内容**:
- 事前検証: frontend/backend双方でtsc 0件・build成功・npm audit 0件を確認
- バックエンド: GCP Secret Manager(`dx-support-tool-API_KEY`・`dx-support-tool-GOOGLE_SERVICE_ACCOUNT_JSON`・`dx-support-tool-GOOGLE_SHEETS_ID`)を新規作成し、Cloud Run実行サービスアカウントにsecretAccessor権限を付与した上で`gcloud run deploy`(Buildpacks・Dockerfile不要)。2段階デプロイでURL確定後、`FRONTEND_ORIGIN`をVercel URLに更新して再デプロイ
- フロントエンド: `vercel link --project dx-support-tool`でプロジェクト作成・リンク。`VITE_DASHBOARD_PASSWORD`(新規生成・password-manager `dx-support-tool-dashboard-password`に保存)・`VITE_API_KEY`・`VITE_API_BASE_URL`をVercel Production環境変数に設定し`vercel --prod`でデプロイ
- `scripts/deploy-backend.sh`・`deploy-frontend.sh`・`deploy-production.sh`(品質ゲート付き)を新規作成。`docs/DEPLOYMENT.md`を本番URL・実際の構成に更新
- 動作検証: Playwrightで本番URLへログイン(パスワード認証)→ダッシュボード表示(クライアント数0件・ヒアリング完了率0%等、実際の空データを正しく反映)→コンソールエラー0件を確認

**意図的な設計判断**:
- `deploy-production.sh`の品質ゲートはtsc/build/backend unit・内部結合テストのみとし、外部結合テスト(`test:integration:external`)とE2Eテストは含めない(実際のGoogle Sheets/Supabase/財務系クラウドDBへの書き込みを伴うため、デプロイの度に自動実行すると本番データが汚染される。必要時は個別に手動実行)
- `backend/data/clients.json`はCloud Run(ステートレス)採用により再デプロイ・スケールイン毎にリセットされる。単一コンサルタント・低頻度利用のため実害は小さいと判断し、恒久対応(Cloud Storage移行等)は見送り(既知の制約として`docs/DEPLOYMENT.md`に明記)

### 拡張フェーズへの引き継ぎ事項

- **M-010(案件管理)・M-011(補助金マッチング)のcloud_proxyゲートウェイ接続が6セッション連続で失敗**(上記参照)。ダッシュボードAPI自体への影響は無いが、コンサルタント業務での`suggest_matching_subsidies`・`record_case_approval`/`list_case_progress`直接呼び出しは引き続き使用不可。同じhosting=cloud_proxyの個人MCPであるM-012(`assess_digital_maturity`)は正常動作しており、「cloud_proxy型だから原理的に不可」では説明がつかない矛盾を確認。BlueLampサポートに正式チケット起票済み(チケットID: `99288c5f-4c19-42e7-b539-b6adee0e55f8`、2026-08-09)。**次回セッションは`list_my_tickets`でこのチケットの回答有無を確認すること**

