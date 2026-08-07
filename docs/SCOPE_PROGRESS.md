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
| 2 | Git管理 | Agent 2 | [ ] |
| 3 | フロントエンド基盤 | Agent 3 | [ ] |
| 4 | ページ実装 | Agent 4 | [ ] |
| 5 | 環境構築 | Agent 5 | [ ] |
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
| M-009 | OCR抽出 | 既存利用(要接続) | local | なし | [ ] | [ ] |
| M-010 | 案件管理MCP | 既存利用(要接続) | 要確認 | Google認証情報(要確認) | [ ] | [ ] |
| M-011 | 補助金マッチング | 新規開発 | cloud_proxy | NOTION_TOKEN, NOTION_DATABASE_ID | [ ] | [ ] |
| M-012 | assess_digital_maturity(DX成熟度診断) | 新規開発 | cloud_proxy | なし | [ ] | [ ] |

## ページ管理表

| ID | ページ名 | ルート | 権限 | 着手 | 完了 |
|----|---------|-------|------|------|------|
| P-001 | 進捗ダッシュボード | / | 本人のみ(簡易パスワード保護) | [ ] | [ ] |

## 外部アカウント準備状況

| サービス | アカウント | APIキー | セットアップ |
|---------|-----------|---------|------------|
| Notion | [x] | [ ] | [ ] NOTION_TOKEN・NOTION_DATABASE_IDの確認・引き継ぎ |
| Google Sheets | [x] | [ ] | [ ] 案件管理MCPの認証情報確認 |
