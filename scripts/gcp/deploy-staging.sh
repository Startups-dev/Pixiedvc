#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <PROJECT_ID> <REGION>"
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"
SERVICE_NAME="pixiedvc-staging"

gcloud run deploy "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --source . \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --max-instances=3 \
  --port=8080 \
  --set-env-vars="NODE_ENV=production,PORT=8080" \
  --set-secrets="NEXT_PUBLIC_SUPABASE_URL=STAGING_SUPABASE_URL:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=STAGING_SUPABASE_ANON_KEY:latest,SUPABASE_URL=STAGING_SUPABASE_URL:latest,SUPABASE_ANON_KEY=STAGING_SUPABASE_ANON_KEY:latest,SUPABASE_SERVICE_ROLE_KEY=STAGING_SUPABASE_SERVICE_ROLE_KEY:latest"

echo "Cloud Run staging deploy complete: ${SERVICE_NAME} (${REGION})"
