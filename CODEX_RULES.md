# Codex DB Workflow Rules (PixieDVC)

## Database changes
- Never ask the user to apply SQL manually in the Supabase UI.
- Always create a new file in `supabase/migrations/`.
- After adding a migration, run:
  - `pnpm supabase:migrate`
  - `supabase db query` to verify the expected tables/columns exist.
- Report the verification result in the response.
