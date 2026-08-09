#!/bin/bash
set -e

PROJECT_ID="gen-lang-client-0662622046"
SERVICE_NAME="dx-support-tool-backend"
REGION="asia-northeast1"
FRONTEND_URL="https://dx-support-tool.vercel.app"

gcloud run deploy "$SERVICE_NAME" \
  --source ./backend \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --allow-unauthenticated \
  --max-instances=2 \
  --set-env-vars="NODE_ENV=production,FRONTEND_ORIGIN=${FRONTEND_URL}" \
  --set-secrets="API_KEY=dx-support-tool-API_KEY:latest,GOOGLE_SERVICE_ACCOUNT_JSON=dx-support-tool-GOOGLE_SERVICE_ACCOUNT_JSON:latest,GOOGLE_SHEETS_ID=dx-support-tool-GOOGLE_SHEETS_ID:latest"

echo "✅ バックエンドデプロイ完了"
gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format="value(status.url)"
