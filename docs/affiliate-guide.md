# Affiliate Guide (Admin + Partner)

## Admin setup
1) Run the Supabase migrations `2025-03-01_create_affiliates.sql` and `2025-03-10_create_affiliate_payout_runs.sql`.
2) In `/admin/affiliates`, create an affiliate:
   - Set display name, email, slug, and commission rate (0.07 or 0.08).
   - If the partner already has a Supabase auth user, paste their `auth_user_id` to link the dashboard.
3) Share the referral link: `/r/<slug>` (or use `?ref=<referral_code>` on any page).

## Affiliate login
- Affiliates use `/affiliate/login` to request a magic link.
- Once logged in, the dashboard shows referral links, payout summaries, and payout history.

## Referral + payout flow (manual)
1) Guests land through affiliate links (`?ref=` or `/r/<slug>`). First-touch wins for 90 days.
2) Booking requests store the referral_code during submission.
3) In `/admin/affiliates/payouts`, create a payout run for a monthly period.
   - Totals are grouped by referral_code and matched to affiliates (referral_code or slug).
   - Payouts are manual: export CSV, pay via PayPal/Wise, then mark items as paid.

## Notes
- No guest PII is shown in affiliate dashboards.
- Tracking is first-touch for 90 days and does not overwrite an existing referral.
- Payouts are processed manually on a monthly schedule.

## Runbook (Manual Payouts)
### How to run tests
```
pnpm test src/lib/affiliate-commissions.test.ts
```

### Verify (Admin + Affiliate)
1) Create an affiliate with a `referral_code` and set a payout email in `/affiliate/dashboard`.
2) Submit a booking request using `?ref=<referral_code>` so `booking_requests.referral_code` is set.
3) As admin, generate a payout run in `/admin/affiliates/payouts` for the booking window.
4) Confirm the payout items appear, export the CSV, and mark items paid.
5) Confirm the affiliate sees the payout in `/affiliate/dashboard`.

### Commission amount source (current repo)
- Booking amounts are read from `booking_requests.<amount_field>` where `<amount_field>` is the first existing column in:
  `booking_amount_usd`, `total_amount_usd`, `total_usd`, `amount_usd`.
- In this repo, `booking_requests` does not include any of those columns, so `<amount_field>` is missing.
- Result when missing: the payouts page shows a warning banner, amount owed is set to `0`, and bookings are still counted.
