# Single guest TEST booking

The server allowlist contains only Supabase Auth UUID `4de38521-9534-4b81-b54e-81e6b7c58539`. It never uses an email or client flag. The existing service-role-only `app_settings` table supplies a live enable switch. A missing, disabled, or mismatched setting fails closed.

## Release order

1. Review and apply `supabase/migrations/20261027000001_single_guest_test_booking.sql` in the SQL Editor as one transaction. Confirm SQL success before releasing dependent code.
2. Release the scoped code through the normal automatic deployment. The migration creates the switch in the disabled state, so deployment alone cannot activate the bypass.
3. After approval, enable the switch by setting `app_settings.value.enabled` to `true` for `single_guest_test_booking_enabled`. Keep `auth_user_id` equal to the designated UUID. The server reads the setting on every eligibility, create, and completion request.

To disable the bypass immediately, set that row's `enabled` value to `false` in the SQL Editor. No application deployment is needed. In-flight requests that already passed an authorization check remain a brief residual risk; new checks fail closed.

The designated guest sees **Complete Test Booking — No Charge** only at the $99 deposit step. A TEST request is submitted with `deposit_paid = 0`, `deposit_status = 'test_bypassed'`, no accepted payment authorization, and no owner match. The request is visible as TEST in the admin request list and detail view. It is absent from real matching and My Vacation listings. This tests the guest submission path, not a real reservation or owner fulfillment.

## Cleanup

An authorized admin can inspect the number of eligible records with `GET /api/admin/testing/guest-bookings-cleanup`. `POST` to the same route with JSON `{ "confirm": "DELETE_TEST_BOOKINGS" }` deletes only TEST bookings whose `renter_id` matches the designated UUID, plus their test guest roster and request activity. The database function refuses cleanup if any real match, payment, contract, Ready Stay, affiliate, or other financial link is present. Neither endpoint changes a real booking.

Do not run cleanup for a live booking. The endpoint does not remove the Auth account or any non-TEST record.
