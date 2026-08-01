#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <PROJECT_ID> <REGION> [ENV_FILE]"
  echo "Optional: set PIXIEDVC_PRODUCTION_ENV_FILE=/path/to/env file"
  exit 1
fi

PROJECT_ID="$1"
REGION="$2"
ENV_FILE="${PIXIEDVC_PRODUCTION_ENV_FILE:-${3:-}}"
DEPLOY_CONFIG_MODE="${PIXIEDVC_PRODUCTION_CONFIG_MODE:-auto}"
SERVICE_NAME="pixiedvc-production"
AR_REPOSITORY="pixiedvc"
SITE_URL="https://hannadvc.com"
RUNTIME_SERVICE_ACCOUNT="${PIXIEDVC_RUNTIME_SERVICE_ACCOUNT:-pixiedvc-production-runtime@${PROJECT_ID}.iam.gserviceaccount.com}"
IMAGE_TAG="production-$(git rev-parse --short=12 HEAD)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/web:${IMAGE_TAG}"
RUNTIME_ENV_FILE=""

cleanup() {
  if [[ -n "$RUNTIME_ENV_FILE" && -f "$RUNTIME_ENV_FILE" ]]; then
    rm -f "$RUNTIME_ENV_FILE"
  fi
}
trap cleanup EXIT

load_env_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "Production env file not found: ${file}"
    exit 1
  fi

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    local line key value
    line="${raw_line#"${raw_line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"

    [[ -z "$line" || "${line:0:1}" == "#" ]] && continue

    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
    elif [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*):[[:space:]]*(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      value="${BASH_REMATCH[2]}"
    else
      echo "Unsupported env file line: ${raw_line}"
      echo "Use KEY=value or simple YAML KEY: value entries."
      exit 1
    fi

    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "${value:0:1}" == "\"" && "${value: -1}" == "\"" ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "${value:0:1}" == "'" && "${value: -1}" == "'" ]]; then
      value="${value:1:${#value}-2}"
    fi

    export "${key}=${value}"
  done < "$file"
}

secret_exists() {
  local secret="$1"
  gcloud secrets versions access latest \
    --project="$PROJECT_ID" \
    --secret="$secret" >/dev/null 2>&1
}

missing_direct_env=()
required_direct_env=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  RESEND_API_KEY
  RESEND_FROM_EMAIL
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  GOOGLE_PLACES_API_KEY
  OPENAI_API_KEY
  GEMINI_API_KEY
  ADMIN_EMAILS
  NEXT_PUBLIC_ADMIN_EMAILS
  CRON_SECRET
)

required_secret_names=(
  PRODUCTION_SUPABASE_URL
  PRODUCTION_SUPABASE_ANON_KEY
  PRODUCTION_SUPABASE_SERVICE_ROLE_KEY
  PRODUCTION_RESEND_API_KEY
  PRODUCTION_RESEND_FROM_EMAIL
  PRODUCTION_STRIPE_SECRET_KEY
  PRODUCTION_STRIPE_WEBHOOK_SECRET
  PRODUCTION_GOOGLE_PLACES_API_KEY
  PRODUCTION_OPENAI_API_KEY
  PRODUCTION_GEMINI_API_KEY
  PRODUCTION_ADMIN_EMAILS
  PRODUCTION_CRON_SECRET
)

if [[ -n "$ENV_FILE" ]]; then
  load_env_file "$ENV_FILE"
fi

export NODE_ENV="production"
export NEXT_PUBLIC_SITE_URL="$SITE_URL"
export NEXT_PUBLIC_APP_URL="$SITE_URL"
export APP_BASE_URL="$SITE_URL"
export APP_TIMEZONE="${APP_TIMEZONE:-America/New_York}"
export MATCH_USE_YEAR_BUCKETS="${MATCH_USE_YEAR_BUCKETS:-1}"

for name in "${required_direct_env[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing_direct_env+=("$name")
  fi
done

has_direct_env=false
if [[ ${#missing_direct_env[@]} -eq 0 ]]; then
  has_direct_env=true
fi

missing_secret_names=()
has_secret_manager=false

check_secret_manager_config() {
  local secret
  missing_secret_names=()
  has_secret_manager=true

  for secret in "${required_secret_names[@]}"; do
    if ! secret_exists "$secret"; then
      missing_secret_names+=("$secret")
      has_secret_manager=false
    fi
  done
}

case "$DEPLOY_CONFIG_MODE" in
  auto)
    if [[ "$has_direct_env" == true ]]; then
      DEPLOY_CONFIG_MODE="direct"
    else
      check_secret_manager_config
      if [[ "$has_secret_manager" == true ]]; then
        DEPLOY_CONFIG_MODE="secret-manager"
      else
        echo "Production deployment config is incomplete."
        echo
        echo "Direct env var mode is missing:"
        printf '  - %s\n' "${missing_direct_env[@]}"
        echo
        echo "Secret Manager mode is missing or cannot access:"
        printf '  - %s\n' "${missing_secret_names[@]}"
        echo
        echo "Set the direct env vars in your shell or pass an env file:"
        echo "  PIXIEDVC_PRODUCTION_ENV_FILE=./env-production.local.yaml pnpm deploy:production"
        exit 1
      fi
    fi
    ;;
  direct)
    if [[ "$has_direct_env" != true ]]; then
      echo "Direct production env var mode is missing:"
      printf '  - %s\n' "${missing_direct_env[@]}"
      exit 1
    fi
    ;;
  secret-manager)
    check_secret_manager_config
    if [[ "$has_secret_manager" != true ]]; then
      echo "Secret Manager production mode is missing or cannot access:"
      printf '  - %s\n' "${missing_secret_names[@]}"
      exit 1
    fi
    ;;
  *)
    echo "Invalid PIXIEDVC_PRODUCTION_CONFIG_MODE: ${DEPLOY_CONFIG_MODE}"
    echo "Use auto, direct, or secret-manager."
    exit 1
    ;;
esac

echo "Deploying ${SERVICE_NAME} using ${DEPLOY_CONFIG_MODE} configuration."

if [[ "$DEPLOY_CONFIG_MODE" == "direct" ]]; then
  export SUPABASE_URL="${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}"
  export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"

  BUILD_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
  BUILD_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"
  BUILD_GOOGLE_PLACES_API_KEY="$NEXT_PUBLIC_GOOGLE_PLACES_API_KEY"
  BUILD_INTERCOM_APP_ID="${NEXT_PUBLIC_INTERCOM_APP_ID:-}"

  RUNTIME_ENV_FILE="$(mktemp "${TMPDIR:-/tmp}/pixiedvc-production-env.XXXXXX.yaml")"

  yaml_quote() {
    local escaped
    escaped="$(printf '%s' "$1" | sed "s/'/''/g")"
    printf "'%s'\n" "$escaped"
  }

  write_env_var() {
    local name="$1"
    printf '%s: ' "$name" >> "$RUNTIME_ENV_FILE"
    yaml_quote "${!name:-}" >> "$RUNTIME_ENV_FILE"
  }

  runtime_env_vars=(
    NODE_ENV
    NEXT_PUBLIC_SITE_URL
    NEXT_PUBLIC_APP_URL
    APP_BASE_URL
    APP_TIMEZONE
    MATCH_USE_YEAR_BUCKETS
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_URL
    SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    RESEND_API_KEY
    RESEND_FROM_EMAIL
    STRIPE_SECRET_KEY
    STRIPE_WEBHOOK_SECRET
    NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
    GOOGLE_PLACES_API_KEY
    OPENAI_API_KEY
    GEMINI_API_KEY
    ADMIN_EMAILS
    NEXT_PUBLIC_ADMIN_EMAILS
    CRON_SECRET
  )

  optional_direct_env_vars=(
    NEXT_PUBLIC_INTERCOM_APP_ID
    CONCIERGE_HANDOFF_EMAIL
    SUPPORT_LIVE_GUEST_SECRET
    TWILIO_ACCOUNT_SID
    TWILIO_AUTH_TOKEN
    TWILIO_API_KEY_SID
    TWILIO_API_KEY_SECRET
    TWILIO_CONVERSATIONS_SERVICE_SID
    WELCOME_SEQUENCE_DAY_0_HERO_IMAGE_URL
    WELCOME_SEQUENCE_DAY_0_SECONDARY_IMAGE_URL
    FOUNDING_OWNER_LAUNCH_ENABLED
    ABANDONED_BOOKING_DELAY_MINUTES
    OWNER_MATCH_REMINDER_HOURS
    UNSIGNED_AGREEMENT_REMINDER_HOURS
  )

  for name in "${runtime_env_vars[@]}"; do
    write_env_var "$name"
  done

  for name in "${optional_direct_env_vars[@]}"; do
    if [[ -n "${!name:-}" ]]; then
      write_env_var "$name"
    fi
  done
else
  PUBLIC_GOOGLE_PLACES_SECRET="PRODUCTION_GOOGLE_PLACES_API_KEY"
  if secret_exists PRODUCTION_NEXT_PUBLIC_GOOGLE_PLACES_API_KEY; then
    PUBLIC_GOOGLE_PLACES_SECRET="PRODUCTION_NEXT_PUBLIC_GOOGLE_PLACES_API_KEY"
  fi

  PUBLIC_ADMIN_EMAILS_SECRET="PRODUCTION_ADMIN_EMAILS"
  if secret_exists PRODUCTION_NEXT_PUBLIC_ADMIN_EMAILS; then
    PUBLIC_ADMIN_EMAILS_SECRET="PRODUCTION_NEXT_PUBLIC_ADMIN_EMAILS"
  fi

  BUILD_SUPABASE_URL="$(gcloud secrets versions access latest --project="$PROJECT_ID" --secret=PRODUCTION_SUPABASE_URL)"
  BUILD_SUPABASE_ANON_KEY="$(gcloud secrets versions access latest --project="$PROJECT_ID" --secret=PRODUCTION_SUPABASE_ANON_KEY)"
  BUILD_GOOGLE_PLACES_API_KEY="$(gcloud secrets versions access latest --project="$PROJECT_ID" --secret="$PUBLIC_GOOGLE_PLACES_SECRET")"
  BUILD_INTERCOM_APP_ID="${NEXT_PUBLIC_INTERCOM_APP_ID:-}"

  SECRET_MANAGER_BINDINGS="NEXT_PUBLIC_SUPABASE_URL=PRODUCTION_SUPABASE_URL:latest,NEXT_PUBLIC_SUPABASE_ANON_KEY=PRODUCTION_SUPABASE_ANON_KEY:latest,SUPABASE_URL=PRODUCTION_SUPABASE_URL:latest,SUPABASE_ANON_KEY=PRODUCTION_SUPABASE_ANON_KEY:latest,SUPABASE_SERVICE_ROLE_KEY=PRODUCTION_SUPABASE_SERVICE_ROLE_KEY:latest,RESEND_API_KEY=PRODUCTION_RESEND_API_KEY:latest,RESEND_FROM_EMAIL=PRODUCTION_RESEND_FROM_EMAIL:latest,STRIPE_SECRET_KEY=PRODUCTION_STRIPE_SECRET_KEY:latest,STRIPE_WEBHOOK_SECRET=PRODUCTION_STRIPE_WEBHOOK_SECRET:latest,NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=${PUBLIC_GOOGLE_PLACES_SECRET}:latest,GOOGLE_PLACES_API_KEY=PRODUCTION_GOOGLE_PLACES_API_KEY:latest,OPENAI_API_KEY=PRODUCTION_OPENAI_API_KEY:latest,GEMINI_API_KEY=PRODUCTION_GEMINI_API_KEY:latest,ADMIN_EMAILS=PRODUCTION_ADMIN_EMAILS:latest,NEXT_PUBLIC_ADMIN_EMAILS=${PUBLIC_ADMIN_EMAILS_SECRET}:latest,CRON_SECRET=PRODUCTION_CRON_SECRET:latest"
fi

gcloud builds submit . \
  --project="$PROJECT_ID" \
  --config=cloudbuild.production.yaml \
  --substitutions="_REGION=${REGION},_AR_REPOSITORY=${AR_REPOSITORY},_IMAGE_TAG=${IMAGE_TAG},_NEXT_PUBLIC_SITE_URL=${SITE_URL},_NEXT_PUBLIC_APP_URL=${SITE_URL},_NEXT_PUBLIC_SUPABASE_URL=${BUILD_SUPABASE_URL},_NEXT_PUBLIC_SUPABASE_ANON_KEY=${BUILD_SUPABASE_ANON_KEY},_NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=${BUILD_GOOGLE_PLACES_API_KEY},_NEXT_PUBLIC_INTERCOM_APP_ID=${BUILD_INTERCOM_APP_ID}"

deploy_args=(
  "$SERVICE_NAME"
  "--project=$PROJECT_ID"
  "--region=$REGION"
  "--image=$IMAGE"
  "--service-account=$RUNTIME_SERVICE_ACCOUNT"
  "--allow-unauthenticated"
  "--memory=1Gi"
  "--cpu=1"
  "--max-instances=3"
  "--port=8080"
)

if [[ "$DEPLOY_CONFIG_MODE" == "direct" ]]; then
  deploy_args+=("--env-vars-file=$RUNTIME_ENV_FILE")
else
  deploy_args+=(
    "--set-env-vars=NODE_ENV=production,NEXT_PUBLIC_SITE_URL=${SITE_URL},NEXT_PUBLIC_APP_URL=${SITE_URL},APP_BASE_URL=${SITE_URL},APP_TIMEZONE=America/New_York,MATCH_USE_YEAR_BUCKETS=1"
    "--set-secrets=$SECRET_MANAGER_BINDINGS"
  )
fi

gcloud run deploy "${deploy_args[@]}"

echo "Cloud Run production deploy complete: ${SERVICE_NAME} (${REGION})"
echo "Image: ${IMAGE}"
