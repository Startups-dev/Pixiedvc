# Guest Trip Operations

## Purpose

This phase adds a practical trip-management layer beneath the approved `/my-trip/[tripId]` resort hero. It presents trusted trip operations in one place while leaving payment, agreement, traveler, document, booking, Ready Stay, authentication, token, RLS, and database behavior unchanged.

## Source Of Truth

The page first verifies the authenticated guest owns the selected `booking_requests.id` by filtering normal guest access with `renter_id = auth.user.id`. Admin users retain the existing admin preview path.

Custom-request pricing uses stored booking values only:

- `booking_requests.guest_total_cents_final`
- `booking_requests.guest_total_cents`
- latest `contracts.snapshot.summary.totalPayableByGuestCents`

Ready Stay pricing also uses the stored booking/contract values already created by the Ready Stay checkout flow. The trip page does not recalculate Ready Stay listing price or historical booking totals.

Payment history uses `transactions` rows where:

- `direction = in`
- `txn_type` is `deposit`, `booking`, or `checkin`
- the row belongs to the verified booking request or its verified match IDs

Succeeded incoming guest transactions count as paid. Failed, cancelled, refunded, owner payout, tax-remit, payout, and adjustment rows do not count as guest paid amount. Legacy `booking_requests.deposit_paid` is used only when no successful deposit transaction exists.

## Payment Summary

The page shows:

- total trip cost when trusted;
- amount paid;
- remaining balance;
- next payment amount when a trusted balance remains;
- payment status;
- recent payment history.

The page does not create new Stripe sessions or link to the legacy `/pay/[token]` route for `transactions` rows. The old receipt route still reads the removed `payments` table, so transaction receipt links are intentionally not surfaced here.

Unavailable payment data renders as unavailable, never `$0`.

## Agreement Behavior

The latest contract for the booking request provides agreement status and the existing signing/review link:

- `sent` and `pending_payment` become `Ready for signature`;
- `accepted` and `active`, or guest acceptance timestamps, become `Signed`;
- `draft` becomes `Agreement being prepared`;
- voided/cancelled/rejected contracts become `Agreement unavailable`.

The trip page links to `/contracts/[guest_accept_token]` when that existing route is available. It does not regenerate agreements, expose contract tokens as display text, or mark agreements signed during rendering.

## Traveler Behavior

Traveler completion uses `booking_requests.guest_profile_complete_at`. Names are read from `booking_request_guests` for display only. The summary avoids birth dates, addresses, phone numbers, accessibility notes, and private comments.

The existing traveler route remains `/guest/requests/[requestId]#guest-details`.

## Document Access

Documents are summarized from:

- contract availability;
- verified rental document metadata for rentals connected to the guest-owned trip.

The page does not select or render `storage_path`, does not pre-generate signed URLs, and does not expose owner/admin/private documents. Rental documents without an existing guest-safe download route are shown as available through concierge.

## Attention Priority

The page selects one highest-priority trusted action:

1. Payment issue
2. Agreement needs signature
3. Trusted payment action, when one exists
4. Traveler details needed

If no trusted action exists, the page shows a calm next-step state: nothing needs the guest’s attention right now.

## View Model

`src/lib/guest/trip-operations-view-model.ts` owns the server-side display model:

- no raw database rows;
- no owner payout;
- no platform margin;
- no affiliate commission;
- no provider secrets;
- no storage paths;
- no raw status enums;
- money remains integer cents until presentation.

## Header And Footer

The global public marketing header and footer are suppressed for `/my-trip` and `/my-trip/[tripId]`. The dedicated guest trip navigation remains visible. Public routes, payment routes, contract routes, and tokenized routes are unchanged.

## Responsive Behavior

The operational layer uses editorial sections, thin dividers, labeled rows, and a stacked mobile layout. It avoids a four-card payment dashboard and keeps promotional “Enhance your stay” content below the essential trip operations.

## Known Limitations

- Current transaction rows do not have a guest receipt route equivalent to the old `payments` receipt page.
- Direct guest document downloads need a separately reviewed secure download route before they should appear.
- Payment due dates are not shown unless a trusted stored due date is introduced or an existing payment schedule route is approved for guest display.
- The completed guest portal audit referenced by the implementation prompt is not present in `docs`.

## Next Phase

The next safe phase is a dedicated guest operational-page alignment pass for existing payment, contract, traveler, and document workflows, followed by guest security hardening for tokenized and document access.
