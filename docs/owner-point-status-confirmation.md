# Owner Point Status Confirmation

## Purpose

HannaDVC can detect that membership points are approaching a banking deadline or expiration date, but the platform must not assume the real Disney status without owner confirmation. This workflow asks the owner to confirm whether points were banked, expired, or remain available.

No database migration was added in this phase.

## Source Of Truth

Membership point state continues to live on `owner_memberships`:

- `points_available`
- `points_reserved`
- `points_rented`
- `use_year_start`
- `use_year_end`
- `points_expiration_date`
- `banked_assumed_at`
- `banked_points_amount`
- `banked_assumed_reason`
- `expired_assumed_at`

The current available amount for a confirmation action is derived server-side as:

`points_available - points_reserved - points_rented - banked_points_amount`

The browser cannot submit an arbitrary point quantity.

## Detection Versus Confirmation

Detection creates notifications only. It does not update `banked_assumed_at`, `banked_points_amount`, or `expired_assumed_at`.

Owner confirmation is required before HannaDVC records points as banked or expired.

## Notification Conditions

The point-status generator creates owner notifications for:

- banking deadline within 60 days;
- expiration within 60 days;
- expiration date already passed while points are still represented as available.

Notifications are not generated when:

- no eligible points remain;
- points are already marked banked;
- points are already marked expired;
- a matching unresolved notification already exists;
- a recent still-available or remind-later event suppresses the reminder.

## Generation Location

Notification generation is run from existing matching workflow entry points through `expireMembershipBuckets()`. That function no longer marks memberships expired automatically; it now creates owner-confirmation notifications.

Notifications are not created during owner page rendering.

## Dedupe

Unresolved notification dedupe uses:

- owner user ID;
- notification type;
- notification link containing membership ID and condition.

Reminder suppression uses `owner_points_events`:

- `point_status_still_available` suppresses repeats for 14 days;
- `point_status_remind_later` suppresses repeats until the recorded `remind_after` timestamp.

Because the current notification schema has no metadata, resolved state, or snooze columns, `owner_points_events` is the supported audit/suppression store for this phase.

## Owner Actions

Eligible point-status notifications can show:

- Mark as banked;
- Mark as expired;
- Still available;
- Review membership;
- Remind me later.

All actions are server-validated by authenticated owner, owned membership, owned notification, notification type, notification link, current membership state, and server-derived point quantity.

## Mark As Banked

The owner action updates the owned membership:

- sets `banked_assumed_at`;
- sets `banked_assumed_reason` to owner-notification confirmation;
- sets `banked_points_amount` to the server-derived eligible amount;
- clears `expired_assumed_at`;
- marks the triggering notification read;
- records an `owner_points_events` row.

Double banking is rejected safely.

## Mark As Expired

The owner action updates the owned membership:

- sets `expired_assumed_at`;
- clears banked fields;
- marks the triggering notification read;
- records an `owner_points_events` row.

The platform does not automatically mark points expired just because a date passed.

## Still Available

Still available records an owner assertion in `owner_points_events` and marks the notification read. It does not extend expiration dates, create a new use year, invent availability, or modify Disney records.

## Remind Later

Remind later records `point_status_remind_later` in `owner_points_events` with a bounded `remind_after` timestamp. The notification is marked read, and future generation suppresses reminders until the recorded date.

No fake snooze state is written to unrelated notification columns.

## Matching Effect

Existing matching logic already excludes memberships where `banked_assumed_at` or `expired_assumed_at` is set. Once an owner confirms banked or expired points, those memberships no longer contribute to matching availability according to the existing rules.

Still-available does not change matching availability.

## Security

The action route:

- requires an authenticated owner;
- resolves the owner on the server;
- verifies the membership belongs to that owner;
- verifies the notification belongs to the authenticated owner;
- verifies the notification link belongs to the membership;
- rejects arbitrary client-supplied point amounts;
- avoids raw Supabase errors in responses.

## UI

The notifications page now renders point-status action controls for eligible notifications. Banked and expired actions require browser confirmation and explain that HannaDVC records the owner confirmation without changing Disney records.

The memberships page shows a compact status cue for banked, expired, banking-deadline, or expiring-soon memberships. It does not create a second mutation path.

## Limitations

- The notification table has no metadata, resolved, snooze, or dedupe-key columns.
- Reminder suppression uses `owner_points_events` until a richer notification workflow exists.
- Still-available after a passed expiration records the assertion only; it does not extend dates or reset point buckets.
- Partial banking is not introduced. The current notification action uses the server-derived eligible amount.
- A future Disney data integration could improve verification, but this phase intentionally uses owner confirmation only.
