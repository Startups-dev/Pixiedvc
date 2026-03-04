#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <PROJECT_ID> <REGION>"
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"

# REGION is accepted to keep script signatures consistent with deploy script.
# Secret Manager is global, so REGION is not used directly here.
if [[ -z "$REGION" ]]; then
  echo "REGION is required"
  exit 1
fi

required_vars=(
  STAGING_SUPABASE_URL
  STAGING_SUPABASE_ANON_KEY
  STAGING_SUPABASE_SERVICE_ROLE_KEY
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required env var: ${var_name}"
    exit 1
  fi
done

upsert_secret() {
  local secret_name="$1"
  local secret_value="$2"

  if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    printf "%s" "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=- --project="$PROJECT_ID" >/dev/null
    echo "Updated secret version: $secret_name"
  else
    printf "%s" "$secret_value" | gcloud secrets create "$secret_name" \
      --project="$PROJECT_ID" \
      --replication-policy="automatic" \
      --data-file=- >/dev/null
    echo "Created secret: $secret_name"
  fi
}

upsert_secret "STAGING_SUPABASE_URL" "$STAGING_SUPABASE_URL"
upsert_secret "STAGING_SUPABASE_ANON_KEY" "$STAGING_SUPABASE_ANON_KEY"
upsert_secret "STAGING_SUPABASE_SERVICE_ROLE_KEY" "$STAGING_SUPABASE_SERVICE_ROLE_KEY"

echo "Staging secrets are set for project: $PROJECT_ID"
