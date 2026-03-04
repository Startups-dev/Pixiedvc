# PixieDVC Staging on Google Cloud Run

This guide deploys the app to Cloud Run staging using Docker buildpacks (`gcloud run deploy --source .`) and Google Secret Manager.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated.
- Access to target GCP project.
- Billing enabled on the project.
- Run all commands from repo root: `/Users/cristianosantos/Projects/pixiedvc`.

## 1) Set project and enable APIs

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

## 2) Export staging secret values locally

```bash
export STAGING_SUPABASE_URL="https://<your-project>.supabase.co"
export STAGING_SUPABASE_ANON_KEY="<your-anon-key>"
export STAGING_SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"
```

## 3) Create/update Secret Manager values

```bash
./scripts/gcp/staging-set-secrets.sh <PROJECT_ID> <REGION>
```

Notes:
- The script creates secrets if missing, otherwise adds a new secret version.
- Secret names used:
  - `STAGING_SUPABASE_URL`
  - `STAGING_SUPABASE_ANON_KEY`
  - `STAGING_SUPABASE_SERVICE_ROLE_KEY`

## 4) Deploy staging service

```bash
./scripts/gcp/deploy-staging.sh <PROJECT_ID> <REGION>
```

Deploy details:
- Service: `pixiedvc-staging`
- Auth: `--allow-unauthenticated`
- Runtime env:
  - `NODE_ENV=production`
  - `PORT=8080`
- Secrets injected as env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## 5) Post-deploy checks

Use the staging URL output by Cloud Run and verify:

1. `GET /api/debug-env` returns `404` in production.
2. Owner onboarding flow still works.
3. Owner verification upload still works (signed upload flow).
4. Renter request submit flow still works.

## Troubleshooting

### Missing permissions

If scripts fail with IAM errors, ensure your user/service account has at least:
- Cloud Run Admin
- Cloud Build Editor
- Artifact Registry Writer
- Secret Manager Admin (for secret creation/versioning)
- Service Account User (for deploy runtime account if required)

### Missing secrets during deploy/runtime

- Re-run:
  ```bash
  ./scripts/gcp/staging-set-secrets.sh <PROJECT_ID> <REGION>
  ```
- Confirm secrets exist:
  ```bash
  gcloud secrets list --project <PROJECT_ID>
  ```

### Service fails to start

- Confirm Cloud Run uses port `8080`.
- Confirm `NODE_ENV=production` and all Supabase env vars are present via secrets.
- Check logs:
  ```bash
  gcloud run services logs read pixiedvc-staging --region <REGION> --project <PROJECT_ID>
  ```

### Cron routes return 500

This is expected if `SUPABASE_SERVICE_ROLE_KEY` or Supabase URL is missing in runtime config. Set/update secrets and redeploy.
