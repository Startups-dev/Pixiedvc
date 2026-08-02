# HannaDVC Owner Dashboard Overview

## Phase B Status

Phase B replaces the `/owner/dashboard` overview composition with a premium owner operations dashboard inside the Phase A owner shell. It uses existing trusted data only and does not change routes, authentication, payout calculations, reservation statuses, matching logic, Ready Stay booking, RLS, or database schema.

## Architecture

The dashboard page continues to enforce the existing owner access flow in `src/app/owner/dashboard/page.tsx`. The page loads the same owner data sources it already used, then builds a server-owned view model through `src/lib/owner/dashboard-view-model.ts`.

Leaf dashboard components receive the view model and render sanitized presentation data. They do not query Supabase, calculate payout rates, expose raw database rows, or read guest private fields.

## Data Sources

| Area | Source | Notes |
| --- | --- | --- |
| Owner identity | `owners`, joined `profiles` through existing owner loader | Used for display name and status label. |
| Total earned | `payout_ledger` | Authoritative owner payout rows only. |
| Pending payout | `payout_ledger` | Authoritative owner payout rows only. |
| Active reservations | `rentals`, `booking_matches` | Active rentals plus active matches without a linked rental. |
| Confirmed stays | `rentals`, `rental_milestones` | Confirmation milestone, confirmation number, or confirmed workflow status. |
| Needs attention | `booking_matches`, `rentals`, `notifications`, Ready Stay transfer query already used by the page | Read-only; no notification creation during render. |
| Recent payouts | `payout_ledger`, with rental labels only where safe | No recomputation. |
| Reservation pipeline | `booking_matches`, `rentals`, `rental_milestones`, `payout_ledger` | Owner-facing normalized stage labels. |
| Recent activity | Existing `notifications` rows | Titles and owner-safe links only. |

## KPI Definitions

### Total Earned

Source: `payout_ledger`.

Included statuses: `released`.

Excluded statuses: `pending`, `eligible`, `failed`, unknown.

The repository schema verifies `pending`, `eligible`, `released`, and `failed`. There is no verified separate `paid` status, so the dashboard does not treat any unverified status as earned.

### Pending Payout

Source: `payout_ledger`.

Included statuses: `pending`, `eligible`.

Excluded statuses: `released`, `failed`, unknown.

### Active Reservations

Source: `rentals` and `booking_matches`.

Includes active, non-cancelled rental workflows plus active matches that do not already have a linked rental.

Excluded rental statuses include `cancelled`, `completed`, and `paid_balance`.

Excluded match statuses include `declined`, `expired`, and `rematched`.

### Confirmed Stays

Source: `rentals` and `rental_milestones`.

A stay is treated as confirmed when a trusted Disney confirmation exists through:

- completed `disney_confirmation_uploaded` milestone;
- `dvc_confirmation_number` or `disney_confirmation_number`;
- confirmed workflow statuses such as `booked`, `stay_in_progress`, `paid_70`, `checked_out`, `paid_balance`, or `completed`.

## Financial Status Mapping

Verified payout statuses:

- `pending` -> Pending
- `eligible` -> Ready for payout
- `released` -> Paid
- `failed` -> Payment issue

Unknown statuses are not displayed raw. They produce partial-data warnings and are not included in financial totals.

## Reservation Pipeline Mapping

The overview uses compact owner-facing stages:

- Awaiting owner response
- Booking details ready
- Owner confirmation needed
- Reservation confirmed
- First payout scheduled
- First payout released
- Stay completed
- Final payout paid

Only stages backed by existing match, rental, milestone, or ledger data are shown. The dashboard does not create fake progress percentages and does not mark a stage complete without trusted data.

## Attention Logic

Supported attention items:

- pending owner match response;
- missing Disney confirmation after owner approval;
- Ready Stay transfer needed from existing sold-listing transfer data;
- unread owner notification.

Items are deduplicated and capped in the overview. No guest names, emails, phone numbers, addresses, private comments, or admin notes are included.

## View Model Shape

`OwnerDashboardViewModel` contains:

- `owner`
- `metrics`
- `attentionItems`
- `recentPayouts`
- `reservationPipeline`
- `recentActivity`
- `dataStatus`

Money values use integer cents and display labels are derived after calculation. Raw Supabase rows are not passed to overview components.

## Privacy And Redaction

The overview does not expose:

- guest email;
- guest phone;
- guest address;
- guest comments;
- accessibility notes;
- banking data;
- admin notes;
- owner IDs;
- guest pricing;
- platform margin;
- affiliate commissions.

## Loading, Empty, Partial, And Error States

The dashboard route now has a loading skeleton for the overview. Empty states are explicit:

- no released payouts;
- no active reservations;
- no recent activity;
- all caught up for attention.

Partial financial data is shown with a compact warning. Unknown statuses are not guessed.

## Mobile Behavior

The overview uses responsive grids:

- KPIs stack on narrow screens and become a four-card row on wide screens;
- recent payouts can scroll horizontally on small widths;
- pipeline items are stacked cards;
- attention actions remain touch-friendly.

## Known Limitations

- The full dashboard still contains legacy non-overview tabs for existing workflows.
- `/owner/payouts` still displays raw payout status labels and should be aligned in Phase C.
- Current owner route protection remains inconsistent across some subpages from the audit; Phase B does not change access behavior.
- Recent activity uses notifications only because no broader safe activity stream exists.
- Distributed owner analytics and realtime updates are not implemented.

## Phase C1 Subpage Alignment

Phase C1 aligns `/owner/payouts`, `/owner/rentals`, and `/owner/matches` with the owner shell and the status vocabulary above. The pages now use owner-safe list view models and do not show raw payout, rental, or match enum values in list views.

See `docs/owner-operational-subpages.md` for the Phase C1 contract.

## Next Phase

The remaining Phase C work can align additional owner subpages with the shell and status vocabulary:

- Ready Stay owner pages;
- memberships/account page.

Phase C should keep business logic unchanged and focus on page-level presentation, terminology, and privacy hardening.
