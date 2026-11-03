# Proposed guest request visibility correction

Prepared locally only. Production application data, schema, permissions, and
deployment are unchanged. No commit or deployment is part of this proposal.

## Exact database change

New migration: `supabase/migrations/20261103000001_fix_guest_request_owner_policy.sql`.

```sql
begin;
alter policy "Admins manage owners" on public.owners
  using (public.is_admin())
  with check (public.is_admin());
commit;
```

Only this existing policy's two expressions change. Its roles, command, and
permissive/restrictive mode remain intact. A missing policy causes the migration
to fail atomically instead of creating a broader replacement policy.

The restricted `is_admin(uuid)` and the permitted `is_admin()` both read the
Admin profile role. The old expression passes `auth.uid()`; the new helper reads
that same identity internally. No new function execution or table privileges
are granted. Guest ownership policies, matched-owner policies, and Admin
profile-role authorization remain unchanged. The other legacy dependencies on
the restricted helper on unrelated tables are outside this proposal.

## Application behavior

`src/app/guest/page.tsx` retains its authenticated, `renter_id = user.id`, and
submitted-status filters. It does not use a service-role client. Ordinary and
TEST submissions use the existing rendering and TEST label.

A failed query renders an accessible error message asking the guest to refresh,
hides the request count, and does not render the empty state or partial results.
The server logs only the database error code. Raw database error messages,
function names, guest identity, and reservation data are not exposed in the UI.

No test-booking constraints, availability actions, lifecycle transitions,
matching, payments, alerts, or pricing are changed.

## Repeatable isolated validation

```sh
pnpm -s exec vitest run src/app/guest/page.test.tsx
node scripts/test-guest-request-visibility.mjs
pnpm -s exec eslint src/app/guest/page.tsx src/app/guest/page.test.tsx
git diff --check
```

The SQL runner requires Docker and the already-cached image
`public.ecr.aws/supabase/postgres:17.6.1.021`. It starts a fresh container with
`--network=none`, `--pull=never`, no published ports, no host mounts, and no
production credentials or `.env` loading. It removes that container afterward.
It does not connect to or reset either existing local Supabase database.

The fixture contains synthetic accounts/bookings and 43 existing policies from
the relevant production-schema tables, six existing helper functions, and the
existing test-isolation constraint. Policy definitions were taken from the
2026-10-30 schema-only backup; the affected policy and ACL were also confirmed
live during the preceding read-only investigation. Tables are reduced to the
columns needed by the authorization and guest-query tests. This is PostgreSQL
RLS validation, not a full Supabase HTTP/browser or full migration-chain test.

Checks cover the original 42501 failure, ordinary/test/other guests, matched and
unrelated owners, Admins, anonymous callers, exact guest-query ownership scope,
restricted-function ACLs, profile-role authorization, owner policy USING and
WITH CHECK behavior, unchanged test restrictions, repeat application, and exact
catalog restoration on rollback. Synthetic write assertions are rolled back.

The repository's `pnpm supabase:migrate` command is a full local database reset;
it was not used against the existing shared local projects. This focused test
applies the proposed migration in its disposable database and verifies catalogs
with `psql`. The installed Supabase CLI does not provide `supabase db query`.

Validation result: **26 PostgreSQL regression checks passed**, including baseline
failure and rollback reproduction. **15 focused Vitest tests passed** across
the new guest-page suite and the existing allowlist, test-completion, and deposit
isolation suites. Targeted ESLint reported zero errors and the guest page's two
pre-existing unused-variable warnings. `git diff --check` and the runner's Node
syntax check passed. No full production migration chain or deployed browser
session was exercised.

## Production approval and rollback

Nothing should be applied to production without explicit approval. Before a
future approved release, recheck and record the target policy's definition and
both helper definitions/ACLs. Apply only the reviewed change, not an unreviewed
batch of pending migrations.

If a production rollback is approved, use a new rollback migration containing:

```sql
begin;
alter policy "Admins manage owners" on public.owners
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
commit;
```

This restores the original policy without granting restricted-function access,
but also restores the original guest-read failure. No booking data needs
restoring. Revert only the associated guest-page error-handling change if an
application rollback is also required. Do not edit applied migration history or
revert unrelated working-tree changes. The isolated runner tests this inverse
policy change against the exact original catalog.
