# HannaDVC Owner Operational Subpages

## Phase C1 Status

Phase C1 aligns `/owner/payouts`, `/owner/rentals`, and `/owner/matches` with the Phase A shell and Phase B dashboard visual system. The work is presentational and view-model focused only. It does not merge routes, change payout calculations, change rental or match statuses, alter booking flows, modify Ready Stay logic, create migrations, or change owner access rules.

## Current Route Separation

| Route | Role | Phase C1 behavior |
| --- | --- | --- |
| `/owner/payouts` | Owner payout ledger | Shows ledger-backed payout rows with owner-facing status labels and total/pending summaries. |
| `/owner/rentals` | Active and historical reservation workflows | Shows owner-safe reservation cards grouped as active, completed, cancelled, or all. |
| `/owner/matches` | Incoming match inbox | Shows booking matches before or after owner response without merging them into rentals. |

Matches and rentals remain separate routes. Accepted matches that already have a rental may link to the rental detail where existing owner-filtered rental data supports it.

## Page Architecture

The pages keep their existing server-side authentication checks and existing owner data loaders:

- `getOwnerPayouts`
- `getOwnerRentals`
- `getOwnerMatches`

Phase C1 adds `src/lib/owner/operational-subpages.ts` as a narrow server-owned presentation mapper. The mapper produces list-safe records for these pages and excludes guest contact data, admin notes, banking fields, guest pricing, and internal margin data.

Shared presentation components live under `src/components/owner/shared`:

- `OwnerPageHeader`
- `OwnerFilterTabs`
- `OwnerRecordStatusBadge`
- `OwnerEmptyState`

These components do not query Supabase and do not contain business rules.

## Status Vocabulary

`src/lib/owner/status-labels.ts` remains the shared owner-facing source for observed statuses.

Payout statuses:

- `pending` -> Pending
- `eligible` -> Ready for payout
- `released` -> Paid
- `failed` -> Payment issue

Match statuses:

- `pending_owner` -> Awaiting your response
- `accepted` -> Accepted
- `declined` -> Declined
- `booked` -> Reservation created

Unknown statuses render as “Status unavailable.” Raw database enum labels should not appear in these list views.

## Payout Presentation

`/owner/payouts` uses `payout_ledger` as the source of truth. Amounts come from `amount_cents`; no owner payout amount is recomputed in the page. The overview includes two safe summaries using the Phase B financial summary utility:

- Total earned: released payout rows only.
- Pending payout: pending or eligible payout rows only.

The table/card rows show reservation reference, payout stage, amount, owner-facing status, eligible date, released date, and a reservation detail link.

## Rentals Presentation

`/owner/rentals` presents reservations as owner workflows. List cards show resort/stay label, travel dates, points, owner-facing status, milestone progress, next action, and a detail link.

List cards intentionally do not show:

- guest name;
- guest email;
- guest phone;
- guest address;
- accessibility notes;
- private comments;
- guest pricing.

Detail pages remain unchanged for existing workflows.

## Matches Presentation

`/owner/matches` remains the owner match inbox. It shows resort, dates, points, received date, response deadline, status, and review/view action. Guest contact data and private comments are not shown in the list view.

Accepted matches with an existing linked rental use the rental detail link. Otherwise, matches continue to link to the existing match detail page.

## Filters

Payout filters:

- All
- Pending
- Ready for payout
- Paid
- Payment issue

Rental filters:

- Active
- Completed
- Cancelled
- All

Legacy rental status query values continue to land in the closest owner-facing group.

Match filters:

- Awaiting response
- Accepted
- Declined
- All

The accepted filter includes accepted matches and matches with created reservations.

## Privacy And Redaction

Phase C1 view models avoid exposing raw database rows to client components. List-view models exclude guest PII, banking data, admin notes, private comments, hidden financial values, guest totals, platform margin, affiliate commission, and raw owner IDs.

Route protection remains server-side. Navigation and list filtering are not authorization mechanisms.

## Responsive Behavior

The pages use the owner shell canvas and stack cards on mobile. Payouts use a desktop table and mobile labelled cards. Rentals and matches use responsive operational cards with visible labels and touch-friendly actions.

## Preserved Actions

Existing owner detail and workflow routes remain the action surface:

- payout rows link to the existing reservation detail route;
- rentals link to `/owner/rentals/[rentalId]`;
- matches link to `/owner/matches/[matchId]` unless an existing rental is available;
- accept, decline, confirmation upload, agreement, and booking-package actions are unchanged.

## Known Limitations

- Full detail-page privacy review is deferred.
- Matches and rentals remain intentionally separate.
- Payout detail pages do not exist; payout rows link to the related reservation detail.
- No new pagination or export behavior was added.
- Broader owner route protection inconsistencies from the audit remain future hardening work.

## Future Route Consolidation

Future Phase C work may align Ready Stay, memberships/account, rewards, and notification pages. Route merging should remain a later product decision after all subpages share the same owner-facing vocabulary and shell structure.

Phase C2 now covers those remaining secondary subpages. See `docs/owner-secondary-subpages.md`.
