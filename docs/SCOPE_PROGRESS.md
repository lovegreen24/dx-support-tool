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
| 7 | エージェント構築 | Agent 7 | [ ] |
| 8 | バックエンド実装 | Agent 8 | [ ] |
| 9 | フロントエンド実装(API統合) | Agent 9 | [ ] |
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
| 1.1 | /api/health | GET | [ ] | [ ] | - | - | [ ] | [ ] |

#### スライス2-A: クライアント一覧集計
| タスク | エンドポイント | メソッド | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|--------------|---------|:----:|:----:|:----:|:----:|:----:|:------:|
| 2.1 | /api/clients | GET | [ ] | [ ] | [ ]（list_client_history連携） | - | [ ] | [ ] |

#### スライス2-B: 案件進捗集計
| タスク | エンドポイント | メソッド | 実装 | Unit | 内部 | 外部 | 品質 | FE統合 |
|--------|--------------|---------|:----:|:----:|:----:|:----:|:----:|:------:|
| 2.2 | /api/case-progress | GET | [ ] | [ ] | [ ]（案件管理MCP/M-010連携） | - | [ ] | [ ] |

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
| M-011 | 補助金マッチング(suggest_matching_subsidies) | 1 | [ ] | [ ] | [ ] | [ ] |
| M-012 | assess_digital_maturity | 1 | [ ] | [ ] | [ ] | [ ] |
| M-010 | 案件管理MCP(進捗記録・取得) | 2 | [ ] | [ ] | [ ] | [ ] |

**凡例**: 実装=MCPサーバー実装 / Unit=ツール単体テスト / 結合=MCP間結合テスト(案件管理MCPは他6MCPの完了イベントとの整合性を含む) / 接続テスト=`claude mcp list`でConnected確認

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
| M-010 | 案件管理MCP | 新規開発(Phase 5でMCPストアの同名ツールは別プロジェクト(漫画電子書籍パイプライン)用と判明したため方針変更) | cloud_proxy想定 | Google認証情報(新規発行が必要・Phase 6-8で対応) | [ ] | [ ] |
| M-011 | 補助金マッチング | 新規開発 | cloud_proxy | NOTION_TOKEN, NOTION_DATABASE_ID(取得済・password-manager保存済) | [ ] | [ ] |
| M-012 | assess_digital_maturity(DX成熟度診断) | 新規開発 | cloud_proxy | なし | [ ] | [ ] |

## ページ管理表

| ID | ページ名 | ルート | 権限 | 着手 | 完了 |
|----|---------|-------|------|------|------|
| P-001 | 進捗ダッシュボード | / | 本人のみ(簡易パスワード保護) | [x] | [x] |

## 外部アカウント準備状況

| サービス | アカウント | APIキー | セットアップ |
|---------|-----------|---------|------------|
| Notion | [x] | [x] | [x] 補助金台帳データベースを新規作成し、インテグレーション「DX伴走支援ツール-補助金マッチング」を接続済み。NOTION_TOKEN・NOTION_DATABASE_IDはpassword-manager(`dx-support-tool-notion-token` / `dx-support-tool-notion-database-id`)に保存済み。M-011実装時にsave_mcp_envで反映する |
| Google Sheets | [ ] | [ ] | [ ] 案件管理MCP(M-010)を新規開発する方針に変更したため、専用のGoogleサービスアカウント・スプレッドシートをPhase 6-8で新規発行する(既存の`GOOGLE_SHEETS_ID`/`GOOGLE_SERVICE_ACCOUNT_JSON`は別プロジェクト(漫画電子書籍パイプライン)用のため流用不可) |

## 環境構築メモ(Phase 5)

- フロントエンド`.env.local`(`VITE_DASHBOARD_PASSWORD`)は設定済み。`frontend/src/config/index.ts`に集約し、`AuthContext.tsx`から参照するよう修正
- OCR抽出MCP: ストア上の登録(`mcp-1785090666404-0fc42f06`)がWindows環境(lghid)向けパスのままでこのWSL2環境からは起動不可だったため、`~/.claude/mcp-servers/ocr-extract`にTesseract.js製MCPを再実装し、個人MCP`mcp-1786122220988-b095244a`として新規登録・always_on化・動作確認済み
- MCPストアの「案件管理MCP」(`mcp-1783864325728-105c9565`)は実体が別プロジェクト(漫画電子書籍自動化パイプライン)用のスキーマ(theme/cover/manuscript/kdp_submission等)であることが判明。DX支援ツールのクライアント案件・6承認ポイント管理とは別物のため流用せず、M-010は新規開発方針に変更(ユーザー確認済み)
