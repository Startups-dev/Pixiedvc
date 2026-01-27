# Production Launch Guide

## Cron Matcher (Required)

Matching does not run unless the cron is configured.

### Vercel Cron
- Ensure `vercel.json` contains a cron for `/api/cron/run-match-bookings` (every 5 minutes).
- Set env vars:
  - `CRON_SECRET` (random 32+ chars)
  - `NEXT_PUBLIC_SITE_URL` (https://yourdomain.com)

### Security
- `/api/cron/match-bookings` requires header `x-cron-secret` = `CRON_SECRET`.
- `/api/cron/run-match-bookings` is the only public route Vercel cron hits; it forwards the secret internally.
- Cron is protected by a DB lock (prevents concurrent runs).
- Owners must be verified (owner_verifications.status = approved or legacy owners.verification = verified) and have a payout email before matching.

### Verification
1) In prod, visit `/api/cron/run-match-bookings`.
2) Confirm `booking_requests` move into `booking_matches` (and rentals once owners accept).

### Local Dev
- Set `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` in `.env.local`.
- Restart `pnpm dev`.
- Visit `http://localhost:3005/api/cron/run-match-bookings`.

## Debugging Matching

If matching returns `matchesCreated: 0`, use the debug endpoint to see why a booking did not match.

- Visit `/api/debug/match-bookings?bookingId=<booking-id>`
- The response includes `eligibleBookings` plus `evaluatedBookings` with per-candidate reject reasons.
- Key signals:
  - `no_membership_for_resort` → no memberships for the requested resort
  - `insufficient_points` → points_available too low (or reserved)
  - `contract_year_mismatch` / `use_year_out_of_range` → date filters blocked eligibility
  - `already_pending_owner` → booking is already matched

### SQL helper
- See `docs/match-debug.sql` for read-only queries.
