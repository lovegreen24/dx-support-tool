#!/bin/bash
set -e

cd "$(dirname "$0")/../frontend"

if [ ! -f ".vercel/project.json" ]; then
  echo "❌ .vercel/project.json が存在しません"
  echo "先に vercel link --project dx-support-tool を実行してください"
  exit 1
fi

echo "デプロイ先: $(cat .vercel/project.json | grep projectName)"
vercel --prod --yes

echo "✅ フロントエンドデプロイ完了"
