#!/bin/bash
set -e

echo "========================================="
echo "  品質ゲート + 本番デプロイ"
echo "========================================="

# 注: 外部結合テスト(test:integration:external)とE2Eテストは実際のGoogle Sheets/Supabase/
# 財務系クラウドDBに書き込むため、デプロイの度に自動実行しない(本番データ汚染防止)。
# 必要な場合は手動で `npm run test:integration:external` / E2E仕様書のテストを個別に実行すること。

echo ""
echo ">>> [1/3] TypeCheck + Build(frontend)..."
cd frontend
npx tsc --noEmit
npm run build
cd ..

echo ">>> [2/3] TypeCheck + Build(backend)..."
cd backend
npx tsc --noEmit
npm run build

echo ">>> [3/3] Unit/内部結合テスト(backend)..."
npm test
cd ..

echo ""
echo "✅ 品質ゲート全通過"
echo ""

# ===== デプロイ =====
echo ">>> バックエンドデプロイ中..."
./scripts/deploy-backend.sh

echo ">>> フロントエンドデプロイ中..."
./scripts/deploy-frontend.sh

echo ""
echo "========================================="
echo "  ✅ 本番デプロイ完了"
echo "========================================="
