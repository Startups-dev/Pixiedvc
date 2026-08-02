# HannaDVC Owner Secondary Subpages

## Phase C2 Status

Phase C2 aligns the remaining owner subpages with the Phase A owner shell, Phase B overview, and Phase C1 operational page system. It is presentation and view-model focused. Existing routes, actions, queries, mutations, pricing rules, payout rules, reward rules, membership rules, Ready Stay rules, notification routes, verification routes, and authentication behavior are preserved.

## Routes Covered

| Route | Behavior |
| --- | --- |
| `/owner/ready-stays` | Owner Ready Stay inventory, metrics, transfer actions, active listing rows, completed sales. |
| `/owner/ready-stays/new` | Existing Ready Stay submission flow for an eligible rental. |
| `/owner/ready-stays/[id]` | Existing Ready Stay detail and owner payout-per-point edit flow. |
| `/owner/ready-stays/faq` | Existing Ready Stay owner FAQ/resource page. |
| `/owner/memberships` | Existing membership matching-preference forms. |
| `/owner/rewards` | Existing Pixie Preferred owner rewards summary. |
| `/owner/notifications` | Existing notification list and mark-read actions. |
| `/owner/verification` | Existing client-side owner verification upload workflow. |

Onboarding and agreement flows remain functionally unchanged. They are still account-facing workflows and can be visually aligned further in a later pass.

## Shared Page Pattern

Phase C2 reuses the Phase C1 shared components:

- `OwnerPageHeader`
- `OwnerRecordStatusBadge`
- `OwnerEmptyState`
- existing white-card owner workspace styling

Route-level loading skeletons were added for:

- Ready Stays
- Memberships
- Rewards
- Notifications

## View Models

`src/lib/owner/secondary-subpages.ts` provides narrow mappers:

- `OwnerReadyStayListItem`
- `OwnerMembershipListItem`
- `OwnerRewardSummary`
- `OwnerNotificationListItem`

The mappers format dates, points, owner payout labels, reward summaries, notification links, and owner-facing statuses without passing raw database rows into presentation components.

## Status Vocabulary

`src/lib/owner/status-labels.ts` now includes owner-facing mappings for:

Ready Stay statuses:

- `draft` -> Draft
- `active` -> Active
- `paused` -> Pending review
- `sold` -> Booked
- `expired` -> Inactive
- `removed` -> Inactive
- `test` -> Test listing

Ready Stay verification statuses:

- `proof_uploaded` -> Submitted for review
- `submitted` -> Submitted for review
- `rejected` -> Needs info

Owner verification statuses:

- `not_started` -> Not started
- `submitted` -> Submitted
- `approved` -> Approved
- `rejected` -> Needs review

Reward statuses:

- `enrolled` -> Enrolled
- `not_enrolled` -> Not enrolled yet
- `enrollment_closed` -> Enrollment closed

Unknown values return “Status unavailable.”

## Ready Stay Behavior

The Ready Stay list continues using the existing admin-filtered owner query and existing transfer action. Phase C2 removes guest names from the transfer summary, removes guest price from the owner list query, and presents owner payout values only as owner payout context.

Existing actions preserved:

- submit Ready Stay;
- view/edit Ready Stay;
- update owner payout per point;
- confirm transfer complete;
- view booking package route;
- expiring-points route link.

## Membership Behavior

The membership page preserves the existing `updateOwnerMembershipMatchingPreferences` server action and displays existing membership fields:

- resort;
- use year;
- total points;
- available points;
- expiration date when present;
- matching mode.

No point totals are recomputed differently in Phase C2.

## Rewards Behavior

The rewards page continues using existing reward utilities:

- `getOwnerPreferredTier`
- `getOwnerPreferredBonusCents`
- `owner_rewards_stats`
- profile enrollment timestamp
- promotions enrollment flag

Reward bonus is shown as a reward rate, not as released owner earnings.

## Notifications Behavior

The notifications page now only reads notifications during render. It no longer creates expiring-points or approval notifications during page render. Existing mark-all-read, fallback prompt, allow-standard, remind-later, and safe owner link behavior remain.

Notification text is passed through a small redaction layer for email addresses and phone numbers. Non-owner links are dropped from the list view.

## Account And Verification Behavior

The verification page keeps the existing client-side upload and finalize workflow. It now uses the owner page header and shared status badge for owner-facing status wording. Sensitive file paths are not exposed beyond the existing proof-file display behavior.

## Privacy And Redaction

Phase C2 list and summary views avoid showing:

- guest contact details;
- guest price as owner earnings;
- internal Ready Stay data not needed for the owner list;
- private notification links outside owner routes;
- raw status enum labels;
- banking or tax fields;
- admin notes.

## Responsive Behavior

Pages use the owner shell canvas and responsive owner card patterns. Long resort names and status labels are allowed to wrap. Loading skeletons preserve page rhythm.

## Preserved Actions

No mutation action was replaced or added. Existing forms and buttons still call the same actions/API routes.

## Known Limitations

- Full route consolidation is still deferred.
- Onboarding and agreement pages remain mostly workflow-specific client experiences.
- Ready Stay booking-package detail still displays guest details because it is an action/detail workflow, not a list-summary view.
- Notification creation should move to cron, trigger, or explicit workflow events rather than page render.
- Broader owner access and RLS hardening from the audit remains future work.

## Future Consolidation

After Phase C2, route consolidation and owner security hardening can begin as separate workstreams. They should not be mixed with additional visual-only alignment.
