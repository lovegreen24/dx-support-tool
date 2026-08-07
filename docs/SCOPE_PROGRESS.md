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
| 6 | バックエンド計画 | Agent 6 | [ ] |
| 7 | エージェント構築 | Agent 7 | [ ] |
| 8 | バックエンド実装 | Agent 8 | [ ] |
| 9 | フロントエンド実装(API統合) | Agent 9 | [ ] |
| 10 | E2Eテスト | Agent 10 | [ ] |
| 11 | ローカル動作確認 | Agent 11 | [ ] |
| 12 | デプロイ | Agent 12 | [ ] |

> アーキ#4(操作者=ClaudeCode・MCP新規開発・フロントUIあり)のため、Phase 3・4・9(フロントエンド)は簡易ダッシュボード分のみ実施。Phase 7(エージェント構築)はAI本体Yありのため実施。

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
