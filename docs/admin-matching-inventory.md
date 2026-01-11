# Admin Matching Inventory (Read-Only)

This document is a safe inventory of matching + milestones behavior based on code references.
Schema sections are pending `information_schema` output from the database (see "Schema Queries Needed").

## Endpoints (Routes)
- `src/app/api/cron/match-bookings/route.ts` — cron matcher execution; runs matching, returns match ids, errors, db counts, debug writePath in dev.
- `src/app/api/cron/run-match-bookings/route.ts` — wrapper that calls `/api/cron/match-bookings` for scheduled runs.
- `src/app/api/debug/match-bookings/route.ts` — debug matcher evaluation without persistence.
- `src/app/api/owner/matches/[matchId]/accept/route.ts` — owner accepts match; creates rental, milestones, updates booking/match.
- `src/app/api/owner/matches/[matchId]/decline/route.ts` — owner declines match; updates booking/match, restores points.
- `src/app/api/owner/matches/[matchId]/expire/route.ts` — expire pending match; updates match/booking/points.
- `src/app/api/owner/matches/[matchId]/confirmation/route.ts` — guest confirmation flow; updates milestones/payouts/match.
- `src/app/api/owner/rentals/route.ts` — owner rentals list (includes rental milestones).
- `src/app/api/owner/rentals/[rentalId]/route.ts` — rental detail (includes milestones, payout ledger, docs).
- `src/app/api/owner/rentals/[rentalId]/approve/route.ts` — owner approval milestone flow.
- `src/app/api/owner/rentals/[rentalId]/confirmation/route.ts` — guest confirmation milestone + payout ledger.
- `src/app/api/owner/rentals/[rentalId]/exceptions/route.ts` — create rental exception entries.
- `src/app/api/admin/rentals/[rentalId]/milestones/route.ts` — admin milestone updates + payout ledger entry.
- `src/app/api/admin/payouts/release/route.ts` — admin payout release and milestone update.
- `src/app/api/admin/matching/[matchId]/route.ts` — admin match detail (GET) + delete (DELETE).
- `src/app/api/admin/matching/[matchId]/expire/route.ts` — admin expire match (POST).

## Matching Logic (Code)
- `src/lib/match-bookings.ts` — core evaluation and execution. Calls `apply_booking_match` RPC, returns match ids.
- `src/lib/match-decisions.ts` — decisions tied to matches and rentals (includes milestone seeding).
- `src/app/api/cron/match-bookings/route.ts` — verifies match persistence + reports errors.
- `supabase/migrations/2026-01-06_create_apply_booking_match_rpc.sql` — RPC definition for match creation.

## Milestones + Payout Logic (Code)
- `src/lib/owner-portal.ts` — milestone sequence + payout stage mapping.
- `src/lib/owner-data.ts` — rental/milestone/payout ledger joins.
- `src/components/owner/MilestoneStepper.tsx` — milestone display.
- `src/components/owner/PayoutTimeline.tsx` — payout timeline display.
- `src/app/admin/rentals/[rentalId]/AdminRentalMilestonesClient.tsx` — admin milestone UI.

## Tables Involved (Code References)
- `booking_requests` — booking request lifecycle and pricing.
- `booking_matches` — provisional owner matches.
- `rentals` — confirmed rentals (linked to booking_matches).
- `rental_milestones` — milestone rows for rentals.
- `payout_ledger` — owner payout stages.
- `affiliate_payouts`, `affiliate_payout_runs`, `affiliate_payout_items` — affiliate payout tracking.

## Date Lens Fields (from code usage, not authoritative)
- Booking requests: `created_at`, `check_in`, `check_out`, `deposit_due`, `deposit_paid`.
- Booking matches: `created_at`, `expires_at`.
- Rentals: `created_at`, `check_in`, `check_out`.
- Rental milestones: `occurred_at`.
- Payout ledger: `eligible_at`, `released_at`, `created_at`.

## Schemas (from information_schema)

### public.booking_matches
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `booking_id` uuid not null
- `owner_id` uuid not null
- `owner_membership_id` bigint null
- `response_token` uuid not null default `gen_random_uuid()`
- `status` text not null default `'pending_owner'`
- `points_reserved` integer not null
- `created_at` timestamptz not null default `now()`
- `responded_at` timestamptz null
- `expires_at` timestamptz null

Constraints:
- PK: `booking_matches_pkey` on `id`
- FK: `booking_matches_booking_id_fkey` → `booking_requests.id`
- FK: `booking_matches_owner_id_fkey` → `owners.id`
- FK: `booking_matches_owner_membership_id_fkey` → `owner_memberships.id`
- CHECK: `booking_matches_status_check` (status)

### public.booking_requests
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `renter_id` uuid null
- `status` booking_status not null default `'draft'`
- `check_in` date null
- `check_out` date null
- `nights` integer null
- `primary_resort_id` uuid null
- `primary_room` text null
- `requires_accessibility` boolean null
- `secondary_resort_id` uuid null
- `secondary_room` text null
- `tertiary_resort_id` uuid null
- `tertiary_room` text null
- `adults` integer null
- `youths` integer null
- `marketing_source` text null
- `comments` text null
- `phone` text null
- `address_line1` text null
- `address_line2` text null
- `city` text null
- `state` text null
- `postal_code` text null
- `country` text null
- `lead_guest_name` text null
- `lead_guest_email` text null
- `lead_guest_phone` text null
- `deposit_due` numeric null
- `deposit_paid` numeric null
- `deposit_currency` text null default `'USD'`
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`
- `primary_view` text null
- `accepted_terms` boolean null default `false`
- `accepted_insurance` boolean null default `false`
- `total_points` integer null
- `referral_code` text null
- `referral_set_at` timestamptz null
- `referral_landing` text null
- `max_price_per_point` numeric null
- `est_cash` numeric null
- `guest_rate_per_point_cents` integer null
- `guest_total_cents` integer null

Constraints:
- PK: `booking_requests_pkey` on `id`
- FK: `booking_requests_primary_resort_id_fkey` → `resorts.id`
- FK: `booking_requests_renter_id_fkey` (target table not returned by information_schema output)

### public.rentals
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `owner_user_id` uuid not null
- `guest_user_id` uuid null
- `resort_code` text not null
- `room_type` text null
- `check_in` date null
- `check_out` date null
- `points_required` integer null
- `rental_amount_cents` integer null
- `status` text not null default `'matched'`
- `created_at` timestamptz not null default `now()`
- `updated_at` timestamptz not null default `now()`
- `adults` integer null
- `youths` integer null
- `booking_package` jsonb not null default `'{}'`
- `disney_confirmation_number` text null
- `match_id` uuid null
- `owner_id` uuid null
- `guest_id` uuid null
- `dvc_confirmation_number` text null

Constraints:
- PK: `rentals_pkey` on `id`
- FK: `rentals_match_id_fkey` → `booking_matches.id`
- FK: `rentals_owner_id_fkey` → `owners.id`
- FK: `rentals_guest_id_fkey` (target table not returned by information_schema output)
- FK: `rentals_guest_user_id_fkey` (target table not returned by information_schema output)
- FK: `rentals_owner_user_id_fkey` (target table not returned by information_schema output)
- CHECK: `rentals_status_check` (status)

### public.rental_milestones
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `rental_id` uuid not null
- `code` text not null
- `status` text not null default `'pending'`
- `occurred_at` timestamptz null
- `meta` jsonb null
- `created_at` timestamptz not null default `now()`

Constraints:
- PK: `rental_milestones_pkey` on `id`
- FK: `rental_milestones_rental_id_fkey` → `rentals.id`
- UNIQUE: `rental_milestones_rental_id_code_key` on `(rental_id, code)`
- CHECK: `rental_milestones_code_check` (code)
- CHECK: `rental_milestones_status_check` (status)

### public.payout_ledger
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `rental_id` uuid not null
- `owner_user_id` uuid not null
- `stage` integer not null
- `amount_cents` integer not null default `0`
- `status` text not null default `'pending'`
- `eligible_at` timestamptz null
- `released_at` timestamptz null
- `created_at` timestamptz not null default `now()`

Constraints:
- PK: `payout_ledger_pkey` on `id`
- FK: `payout_ledger_rental_id_fkey` → `rentals.id`
- FK: `payout_ledger_owner_user_id_fkey` (target table not returned by information_schema output)
- UNIQUE: `payout_ledger_rental_id_stage_key` on `(rental_id, stage)`
- CHECK: `payout_ledger_stage_check` (stage)
- CHECK: `payout_ledger_status_check` (status)

### public.affiliate_payouts
Columns:
- `id` uuid not null default `gen_random_uuid()`
- `affiliate_id` uuid not null
- `period_start` date not null
- `period_end` date not null
- `status` affiliate_payout_status not null default `'scheduled'`
- `total_amount_usd` numeric not null default `0`
- `paypal_reference` text null
- `created_at` timestamptz not null default `now()`
- `paid_at` timestamptz null

Constraints:
- PK: `affiliate_payouts_pkey` on `id`
- FK: `affiliate_payouts_affiliate_id_fkey` → `affiliates.id`

### public.affiliate_payout_runs / public.affiliate_payout_items
Not present in the provided information_schema output; rerun the columns/constraints queries if these tables are required for the inventory.

## Gaps / Open Items
- Missing table target details for some FKs (e.g., `booking_requests_renter_id_fkey`, `payout_ledger_owner_user_id_fkey`, `rentals_*_user_id_fkey`) because the constraint output did not include `foreign_table` for those entries.
- `affiliate_payout_runs` and `affiliate_payout_items` columns/constraints not supplied yet.
