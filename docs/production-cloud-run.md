# HannaDVC production deployment

This creates a separate Cloud Run service named `pixiedvc-production`. It does
not update `pixiedvc-web-staging`, its image tag, its environment variables, or
any DNS record.

## 1. One-time Google Cloud preparation

Set the target project and region. Use the same region as staging if possible;
`us-central1` supports Cloud Run domain mappings.

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com
gcloud artifacts repositories describe pixiedvc --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create pixiedvc --location="$REGION" --repository-format=docker
```

Create a dedicated runtime service account. The production deploy script uses
this identity by default. Override it only by setting
`PIXIEDVC_RUNTIME_SERVICE_ACCOUNT` to another prepared service account.

```bash
RUNTIME_SA="pixiedvc-production-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$RUNTIME_SA" >/dev/null 2>&1 || \
  gcloud iam service-accounts create pixiedvc-production-runtime \
    --display-name="HannaDVC production Cloud Run"
```

## 2. Production environment configuration

The production deploy script supports two configuration modes:

- Direct env var mode for launch: values come from your local shell or an env
  file and are written directly to Cloud Run.
- Secret Manager mode for the longer-term setup: values come from
  `PRODUCTION_*` Secret Manager secrets.

The script auto-selects direct env var mode when all required direct production
variables are present. If they are not present, it falls back to Secret Manager
when all required production secrets exist. You can force a mode with
`PIXIEDVC_PRODUCTION_CONFIG_MODE=direct` or
`PIXIEDVC_PRODUCTION_CONFIG_MODE=secret-manager`.

### Direct env var mode

Copy the example file and fill it with production values:

```bash
cp env-production.example.yaml env-production.local.yaml
```

Required direct production values:

```text
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
```

The deployment script always sets these production URL values itself:

```text
NEXT_PUBLIC_SITE_URL=https://hannadvc.com
NEXT_PUBLIC_APP_URL=https://hannadvc.com
APP_BASE_URL=https://hannadvc.com
```

Run production deploy with the env file:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
PIXIEDVC_PRODUCTION_ENV_FILE=./env-production.local.yaml pnpm deploy:production
```

Equivalent command using shell-exported variables instead of a file:

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
export NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PRODUCTION_PROJECT.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
export SUPABASE_SERVICE_ROLE_KEY="..."
export RESEND_API_KEY="..."
export RESEND_FROM_EMAIL="..."
export STRIPE_SECRET_KEY="..."
export STRIPE_WEBHOOK_SECRET="..."
export NEXT_PUBLIC_GOOGLE_PLACES_API_KEY="..."
export GOOGLE_PLACES_API_KEY="..."
export OPENAI_API_KEY="..."
export GEMINI_API_KEY="..."
export ADMIN_EMAILS="admin@example.com"
export NEXT_PUBLIC_ADMIN_EMAILS="admin@example.com"
export CRON_SECRET="..."
pnpm deploy:production
```

### Secret Manager mode

Secret Manager remains supported. Create these production-only secrets if you
want the deployed Cloud Run service to bind secrets instead of direct env vars.
Never reuse the `STAGING_*` values:

```text
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
```

Optional separate public secrets are also supported:

```text
PRODUCTION_NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
PRODUCTION_NEXT_PUBLIC_ADMIN_EMAILS
```

If those optional public secrets do not exist, Secret Manager mode maps
`NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` from `PRODUCTION_GOOGLE_PLACES_API_KEY` and
`NEXT_PUBLIC_ADMIN_EMAILS` from `PRODUCTION_ADMIN_EMAILS`.

Create each secret and add its value without putting the value in shell
history. Example:

```bash
gcloud secrets create PRODUCTION_SUPABASE_URL --replication-policy=automatic
printf '%s' 'PASTE_VALUE' | gcloud secrets versions add PRODUCTION_SUPABASE_URL --data-file=-
```

Grant the production runtime service account access to those secrets:

```bash
RUNTIME_SA="pixiedvc-production-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
for secret in \
  PRODUCTION_SUPABASE_URL PRODUCTION_SUPABASE_ANON_KEY \
  PRODUCTION_SUPABASE_SERVICE_ROLE_KEY PRODUCTION_RESEND_API_KEY \
  PRODUCTION_RESEND_FROM_EMAIL PRODUCTION_STRIPE_SECRET_KEY \
  PRODUCTION_STRIPE_WEBHOOK_SECRET PRODUCTION_GOOGLE_PLACES_API_KEY \
  PRODUCTION_OPENAI_API_KEY PRODUCTION_GEMINI_API_KEY \
  PRODUCTION_ADMIN_EMAILS PRODUCTION_CRON_SECRET; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor"
done
```

To force Secret Manager mode:

```bash
PIXIEDVC_PRODUCTION_CONFIG_MODE=secret-manager pnpm deploy:production
```

## 3. Supabase production auth configuration

In the production Supabase project, open Authentication > URL Configuration:

- Site URL: `https://hannadvc.com`
- Exact redirect allow-list entries:
  - `https://hannadvc.com/auth/callback`
  - `https://www.hannadvc.com/auth/callback`

Keep the staging Cloud Run callback URL in the staging Supabase project. Do not
put the staging URL in the production Supabase project unless a controlled
cross-environment login flow explicitly requires it.

For OAuth providers, also update the provider's authorized origins/redirect
configuration to use the production Supabase callback URL shown by Supabase.

## 4. Deploy production

```bash
export PROJECT_ID="YOUR_GCP_PROJECT_ID"
export REGION="us-central1"
PIXIEDVC_PRODUCTION_ENV_FILE=./env-production.local.yaml pnpm deploy:production
```

Equivalent direct command:

```bash
bash ./scripts/gcp/deploy-production.sh "$PROJECT_ID" "$REGION" ./env-production.local.yaml
```

The script builds a production-tagged image and deploys only
`pixiedvc-production`. It does not change staging. Test the returned `run.app`
URL before creating any domain mapping.

## 5. Domain mapping and DNS (manual go-live step)

Google recommends a global external Application Load Balancer for production.
Cloud Run's direct domain mapping is Preview and is not recommended for
production due to latency and feature limitations. For the simplest cutover in
a supported region, the direct mapping commands are:

```bash
gcloud domains list-user-verified
gcloud domains verify hannadvc.com

gcloud beta run domain-mappings create \
  --project="$PROJECT_ID" --region="$REGION" \
  --service=pixiedvc-production --domain=hannadvc.com

gcloud beta run domain-mappings create \
  --project="$PROJECT_ID" --region="$REGION" \
  --service=pixiedvc-production --domain=www.hannadvc.com

gcloud beta run domain-mappings describe \
  --project="$PROJECT_ID" --region="$REGION" --domain=hannadvc.com
gcloud beta run domain-mappings describe \
  --project="$PROJECT_ID" --region="$REGION" --domain=www.hannadvc.com
```

Do not run the mapping commands until the production `run.app` URL passes the
smoke test. At the DNS provider, add every `resourceRecords` value returned by
the two describe commands (`@` for the apex and `www` for the subdomain). Do
not guess A/AAAA/CNAME targets and do not delete the existing staging DNS
record. Certificate provisioning can take up to 24 hours.

For the recommended load-balancer route, configure a serverless NEG pointing
to `pixiedvc-production`, attach it to a global external Application Load
Balancer, add a Google-managed certificate for both domains, and use the load
balancer's reserved global IP for the apex A/AAAA records. Point `www` at the
same frontend or redirect it canonically to the apex.

## 6. Pre-DNS smoke test

- Open the production `run.app` URL and verify public navigation.
- Create a production test user and verify confirmation, login, logout, and
  password-reset callbacks stay on `hannadvc.com`.
- Verify owner and guest dashboards read only production Supabase data.
- Run a Stripe test-mode checkout first; switch to live keys only after webhook
  delivery is confirmed at `https://hannadvc.com/api/stripe/webhook`.
- Send a Resend message and verify sender-domain authentication, reply/contact
  routing, and unsubscribe links.
- Invoke protected cron endpoints with the production `CRON_SECRET`.
- Confirm PayPal is disabled: `src/lib/payments/paypal.ts` is currently a stub
  that returns `https://paypal.test/checkout`; Stripe is the implemented path.
- Confirm staging still serves its original URL and reads staging Supabase.

## 7. Hardcoded URL audit

- No non-test application file contains the staging Cloud Run hostname.
- The Dockerfile previously contained staging Supabase defaults. Those defaults
  were removed; every deployment must now pass its own public Supabase values.
- `src/lib/app-url.ts`, `src/lib/referral.ts`, payment routes, and contract
  actions contain localhost development fallbacks. Production sets
  `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL`, and `APP_BASE_URL`, and
  `src/lib/app-url.ts` explicitly rejects localhost URLs in production.
- The affiliate resource builder adds localhost origins only when
  `NODE_ENV !== "production"`.
- `src/lib/payments/paypal.ts` contains a `paypal.test` placeholder. Do not
  expose PayPal as a production payment option until that adapter is replaced.
