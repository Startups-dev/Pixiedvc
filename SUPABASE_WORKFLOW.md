# Supabase Workflow (PixieDVC)

## Environments
- Local Supabase = safe sandbox (Docker on your machine).
- Hosted Supabase = real production/staging project.

They are not connected automatically. Local changes never affect hosted unless you explicitly push.

## Daily dev flow
1) `supabase start`
2) `pnpm db:local`
3) `pnpm dev`

## Before deploy
1) `pnpm db:prod`
2) Deploy the app

## Rules
- All schema changes must be new files in `supabase/migrations/`.
- Never apply SQL in the Supabase dashboard.
- Test locally first, then push to hosted only when ready.
