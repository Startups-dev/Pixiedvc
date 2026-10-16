# Isolated founders-e2e migration repair log

Scratch only: `project_id = pixiedvc-founders-e2e`; API 64321, PostgreSQL 64322, Studio 64323. No production or main local DB used.

The scratch Supabase project was confirmed stopped before modifications. Its empty isolated database may be rebuilt. Original `supabase/migrations` in the repository is not edited.

Changes applied to copied migrations:
- rename `2025-03-13_owner_match_guest_policy.sql` -> `20250313000007_owner_match_guest_policy.sql` to give the date-less migration a unique valid version after inspecting existing 20250313 versions.
- rename `2026-01-06_create_apply_booking_match_rpc.sql` -> `20260106000001_create_apply_booking_match_rpc.sql`.
- rename `20260302_critical_hardening_phase1.sql` -> `20260302000001_critical_hardening_phase1.sql`.
- rename duplicate `20260306000001_support_conversation_metadata.sql` -> `20260306000003_support_conversation_metadata.sql`; rename existing duplicate-version migration `20250315000001_support_handoff_agents.sql` -> `20250315000005_support_handoff_agents.sql`.
- RPC now returns named composite preserving output columns; avoids duplicate parameter/output name
- sequence initialization uses setval(1,false) for empty table and max,true otherwise
- 20260205000002 branches on existing canonical date; does not add redundant contract_year
- 20260205000003 conditionally renames legacy integer without replacing existing date
- 20260205000004 converts only non-date legacy values; preserves canonical date
- payment_splits and transaction_splits owner_id foreign keys use uuid matching owner_memberships.id

Additional bootstrap issues will be appended here. `migration_repair.patch` is a complete recursive unified diff between the original repository migrations and this scratch migration directory. Rebuild it with `diff -ruN supabase/migrations /private/tmp/founders-e2e/supabase/migrations > /private/tmp/founders-e2e/migration_repair.patch` from the repository root; the nonzero diff exit code means differences were found.
- Resort dedupe dry-run selects canonical UUID with ordered `array_agg(...)[1]` because PostgreSQL does not define `max(uuid)`; ranking order remains unchanged.
- Kidani resort seed now supplies the required `canonical_slug` through the migration’s normalization helper and updates it on slug conflict.
- `concierge_liquidation_intents.owner_membership_id` and `owner_membership_use_year_points.owner_membership_id` now use UUID to match `owner_memberships.id`. App call sites were inspected; some legacy UI logic still coerces these identifiers numerically and should be corrected in a separate repository follow-up.
- Split the affiliate tiered-onboarding migration in the scratch copy: 04 adds enum labels only; new 05 applies the data/default/index changes after that enum migration commits. PostgreSQL forbids using a newly added enum label within the same transaction. No step is skipped.
- The booking reset RPC expands its OUT row from 4 to 13 columns. PostgreSQL cannot replace a function with a changed return row type, so the temp migration explicitly drops the earlier RPC after inspection found no dependent DB objects; the migration recreates it and reapplies the service-role grant. The application only invokes it by RPC name.
- Split Ready Stay `test` enum label addition into migration 20260607160000, then apply columns/indexes/RLS in a new 20260607160001 migration after the enum label commits; PostgreSQL forbids use of newly added enum labels in the same transaction.
- Added scratch-only `20260824000003_owner_newsletter_consent.sql`: `completeOnboarding` upserts `newsletter_opt_in`, `_at`, and `_source` on `owners`, but no checked-in migration defines those columns. The migration adds them with opt-out default and refreshes PostgREST schema. This is a repository migration-chain gap, not an isolated Docker configuration problem.
- Added scratch-only `20260824000004_booking_matches_updated_at.sql` after the actual `ensureRentalForMatch` path failed because `booking_matches.updated_at` is absent from the migrated schema. The app writes this timestamp while persisting match payout fields. This is a schema/app mismatch in the checked-in migration chain; the disposable scratch DB received only this column.

## Follow-up repository migration

The confirmed `booking_matches.updated_at` gap is addressed by the independent forward migration `supabase/migrations/20261015000001_add_booking_matches_updated_at.sql`. It adds/backfills the column and attaches the shared timestamp trigger if one is not already present. This single repository migration is separate from the scratch repair patch above; the scratch patch must not be applied to a deployment database.
