-- Owner lifecycle repair template for TEST ACCOUNTS ONLY.
-- DO NOT RUN AGAINST PRODUCTION DATA WITHOUT MANUAL REVIEW.
-- This script is intentionally conservative and leaves weak inferences commented.

begin;

-- Manual-review staging table. Populate only rows where identity is authoritative.
create temporary table owner_repair_review (
  profile_id uuid primary key,
  recovered_owner_id uuid not null,
  email text,
  display_name text,
  source_evidence text not null,
  manual_reviewed_by text not null,
  manual_reviewed_at timestamptz not null default now()
);

-- Example only. Use the original owner UUID if it is present in authoritative evidence.
-- insert into owner_repair_review (
--   profile_id,
--   recovered_owner_id,
--   email,
--   display_name,
--   source_evidence,
--   manual_reviewed_by
-- )
-- values (
--   'PROFILE_UUID_FROM_AUTH_OR_PROFILE',
--   'ORIGINAL_OWNER_UUID_FROM_AUTHORITATIVE_EVIDENCE',
--   'owner@example.com',
--   'Owner Name',
--   'auth.users.raw_user_meta_data.owner_id matched profile id and email',
--   'YOUR_NAME'
-- );

-- Recreate missing owners rows only from reviewed evidence.
insert into public.owners (
  id,
  user_id,
  email,
  display_name,
  verification,
  lifecycle_status,
  lifecycle_status_reason,
  metadata
)
select
  r.recovered_owner_id,
  r.profile_id,
  r.email,
  r.display_name,
  'pending',
  'deactivated',
  'Recovered test-account owner shell after physical deletion; manual review required before activation.',
  jsonb_build_object(
    'recovery_source', r.source_evidence,
    'manual_reviewed_by', r.manual_reviewed_by,
    'manual_reviewed_at', r.manual_reviewed_at
  )
from owner_repair_review r
join public.profiles p on p.id = r.profile_id
left join public.owners existing on existing.id = r.recovered_owner_id
where existing.id is null;

-- Relink rentals only when the exact owner relationship is authoritative.
-- Never infer from email/name/date alone.
-- update public.rentals r
-- set owner_id = review.recovered_owner_id
-- from owner_repair_review review
-- where r.owner_id is null
--   and r.owner_user_id = review.profile_id
--   and r.id in (
--     select 'RENTAL_UUID_CONFIRMED_BY_MANUAL_REVIEW'::uuid
--   );

-- Relink point liquidation requests only when owner_user_id/profile_id is authoritative.
-- update public.point_liquidation_requests plr
-- set owner_id = review.recovered_owner_id
-- from owner_repair_review review
-- where plr.owner_id is null
--   and plr.owner_user_id = review.profile_id
--   and plr.id in (
--     select 'POINT_LIQUIDATION_REQUEST_UUID_CONFIRMED_BY_MANUAL_REVIEW'::uuid
--   );

-- Do not recreate contracts, payouts, booking_matches, or membership rows unless restored
-- from authoritative backups/logs. Cascaded rows may be unrecoverable from the live DB.

rollback;
