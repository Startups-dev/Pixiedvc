# Owner Security Hardening

## Status

Implemented as an application-level hardening pass after the Phase A shell, Phase B overview, Phase C1 operational pages, and Phase C2 secondary pages.

This phase did not change owner business rules, payout calculations, rental statuses, match transitions, Ready Stay pricing, rewards, memberships, authentication rules, or routes.

## Canonical Owner Access Contract

The canonical server-side owner access helper remains `requireOwnerAccess` from `src/lib/owner/access.ts`.

It verifies:

- authenticated Supabase user;
- profile role of `owner`;
- completed owner onboarding;
- existing owner record;
- accepted owner agreement.

The returned access context includes the authenticated user, resolved owner record, and agreement timestamp. Server routes must continue to treat all client-supplied owner IDs and record IDs as untrusted.

Owner routes are not all identical. The repository still has these access categories:

- Owner authenticated: routes that must be reachable before full onboarding or agreement completion.
- Owner onboarding: owner setup, verification, and agreement flows.
- Owner active: dashboard, matches, rentals, memberships, Ready Stays, notifications, resources, rewards.
- Owner financial access: payouts and dashboard earnings views.
- Owner mutations: API routes and server actions that revalidate record ownership before changes.

## Route Access Map

The protected owner shell covers active owner pages, while individual pages and APIs continue to enforce access server-side.

| Area | Access Rule | Ownership Rule | Notes |
| --- | --- | --- | --- |
| `/owner/dashboard` | Active owner | View model resolves authenticated owner | Uses server-owned dashboard model. |
| `/owner/payouts` | Active owner | Ledger rows scoped to authenticated owner | No guest totals or margin exposed. |
| `/owner/rentals` | Active owner | Rentals scoped to authenticated owner | List view redacts guest PII. |
| `/owner/rentals/[id]` | Authenticated owner | Detail loader filters by owner before returning data | Guest details retained only for reservation workflow needs. |
| `/owner/matches` | Active owner | Matches scoped to resolved owner record | List view redacts guest contact data. |
| `/owner/matches/[id]` | Authenticated owner | Detail loader filters by resolved owner record | Pending preview now hides direct guest contact, address, deposit, private notes, and accessibility notes. |
| `/owner/ready-stays` | Active owner | Ready Stay view models are owner scoped | Mutations must revalidate listing owner. |
| `/owner/memberships` | Active owner | Membership rows scoped to owner record | Compatibility API routes now compare against resolved owner record ID. |
| `/owner/rewards` | Active owner | Rewards are scoped to authenticated owner | No reward values are counted as released earnings unless ledger-backed. |
| `/owner/notifications` | Active owner | Notifications are scoped to authenticated user | Mark-read API now updates only authenticated user's notification IDs. |
| `/owner/verification` | Owner onboarding/active | Verification rows use existing repository identifiers | Identifier inconsistency remains documented below. |
| Owner API routes | Authenticated owner | Each mutation must revalidate target record ownership | Navigation visibility is never authorization. |

## Owner Isolation Rules

- List and detail queries must filter by the authenticated owner or by a parent record already proven to belong to that owner.
- Mutations must re-read or revalidate the target record server-side.
- Admin/service-role clients may be used only after owner scoping is known and only for narrow queries or mutations.
- Child rows such as milestones, documents, payout rows, and notifications must be reachable only through owner-owned parents.
- Cross-owner records should return safe `404` or `403` responses without revealing whether the record exists.

## Changes Made

### Notifications

`POST /api/owner/notifications/read` now applies `user_id = authenticated_user.id` before updating notification IDs.

This prevents a user from marking another user's notification as read by submitting its ID.

### Membership Compatibility APIs

The membership `allow-standard` and `fallback-remind` routes now resolve the current `owners.id` record before comparing membership ownership.

This fixes the old mismatch where membership rows used `owner_memberships.owner_id = owners.id`, while the route compared that value to `auth.users.id`.

### Match Confirmation

The match confirmation route now scopes the `booking_matches` lookup by the resolved owner record before calling rental-creation helpers.

This prevents side effects from running against a match owned by another owner.

### Owner Document Upload

Owner document upload now:

- validates document type;
- validates MIME type;
- enforces a 10 MB limit;
- resolves the authenticated owner record;
- stores `owner_documents.owner_id` using the owner record ID;
- sanitizes document insert failures.

The storage path remains under the authenticated user ID to preserve the existing bucket convention.

### Rental Confirmation Documents

The legacy rental confirmation route now rejects optional direct `storage_path` values unless they match:

`owners/{authenticatedUserId}/rental-docs/{rentalId}/...`

The check runs before any rental, milestone, document, payout, notification, contract, or affiliate side effect.

### Pending Match Guest Data

Pending match detail pages now hide direct guest contact details, address, guest roster email/phone, deposit status, private comments, and accessibility notes until the match is accepted, booked, or tied to a rental.

The pending preview still shows the trip fields an owner needs to evaluate the match: resort, room, dates, points, party size, family label, and owner payout estimate.

## Guest-Data Visibility

Match preview:

- Shows travel dates, resort, room, points, party size, and owner-facing payout estimate.
- Does not show direct guest email, phone, address, private comments, accessibility notes, or guest deposit/payment information.

Accepted match or rental-backed workflow:

- May show reservation-relevant guest information required for the owner workflow.
- Should continue to avoid unnecessary guest payment data, admin notes, and private internal fields.

Rental detail:

- Currently retains guest contact and reservation-relevant notes for the active booking workflow.
- This remains a future product/security review area because the exact required booking fields vary by workflow stage.

## Document And Storage Rules

- Signed upload URLs are created server-side.
- Rental document upload start/finalize routes validate owner ownership and owner-scoped object paths.
- Owner document upload validates type and owner record before inserting metadata.
- No private permanent public storage URL should be rendered.
- Raw storage paths should not be shown in owner UI unless required for support diagnostics.

## Financial Privacy

Owner financial pages and dashboard view models must show owner ledger amounts only.

They must not expose:

- guest total;
- platform margin;
- affiliate commission;
- internal admin notes;
- banking details;
- another owner's ledger rows.

This phase did not alter payout calculations or payout status transitions.

## Notification Security

Notifications remain scoped by authenticated user ID. Mark-read now includes owner scoping in the mutation.

Notification links must remain internal owner-safe paths. Notification creation during page render remains prohibited.

Future notification generation should happen from explicit workflow events, database triggers, queues, or scheduled jobs, not passive page rendering.

## Verification And Document Model Findings

The repository currently has two owner document/verification identifier models:

- `owner_documents.owner_id` references `public.owners(id)`.
- `owner_verifications.owner_id` references `public.profiles(id)` / authenticated profile identity in the onboarding flow.

Both appear active in different workflows. This phase preserves the existing model and fixes only ownership validation where routes used the wrong identifier.

Recommended future work:

- Decide the single long-term owner identity key for owner documents and verification.
- Add a reviewed reconciliation or migration plan.
- Avoid mixing `auth.users.id`, `profiles.id`, and `owners.id` in route comparisons without explicit mapping.

## RLS Audit Summary

Observed migration state:

| Table | RLS State | Owner Policy Summary | Gap |
| --- | --- | --- | --- |
| `owners` | Enabled | Owner self-select/update via `user_id = auth.uid()` plus admin policy | None found in this pass. |
| `owner_memberships` | Enabled | Owner select/insert/update through `owners.user_id = auth.uid()` | None found in this pass. |
| `owner_documents` | Enabled | Admin select policy observed | Owner insert/select policies were not found in migrations reviewed. |
| `owner_verifications` | Enabled | Owner policies use profile/auth identifier | Identifier differs from `owner_documents`. |
| `booking_matches` | Enabled | Owners can view matches through `owners.user_id = auth.uid()` | Mutations still rely on application checks/admin clients. |
| `booking_request_guests` | Enabled | Owners can view guests for matched bookings | Application stage-gating is still needed to avoid premature PII. |
| `rentals` | Enabled | Owners can view rentals by owner relationship | Application checks still required. |
| `rental_milestones` | Enabled | Owner view/insert policies through owned rental | None found in this pass. |
| `rental_documents` | Enabled | Owner view/upload policies through owned rental | Storage bucket policy still needs separate verification. |
| `payout_ledger` | Enabled | Owners can view own payout ledger | None found in this pass. |
| `notifications` | Enabled | Owner view/update and self-insert policies | Application mark-read now owner-scoped. |
| `ready_stays` | Enabled | Owner view/insert/update policies observed | Public showcase policies must remain read-only. |
| `owner_rewards_stats` | Enabled | Owner read and service-role policies observed | Rewards profile policies should be reviewed separately. |
| `point_liquidation_requests` | Not fully audited | Related owner liquidation policies observed in concierge intents | Needs deeper RLS review if used by owner pages. |

## Critical RLS Gaps

No migration was created in this phase.

Potential gaps requiring a separate reviewed migration prompt:

- `owner_documents` appears to have admin-only RLS in migrations reviewed, while owner upload now uses an admin insert after application ownership validation.
- Storage bucket policies for owner verification/document buckets are not fully represented in migrations reviewed.
- `owner_verifications` and `owner_documents` use different owner identifier conventions.
- Owner access still relies on a mixture of `requireOwnerAccess`, raw auth checks plus scoped loaders, and route-specific owner lookups.

## Admin-Client Usage Retained

Admin/service-role usage remains where the repository already needs privileged access for:

- resolving owner records across legacy identifier shapes;
- writing owner document metadata where RLS owner insert policy was not found;
- match confirmation side effects;
- rental confirmation side effects;
- contract and affiliate conversion helpers;
- Ready Stay and rewards workflows that already use admin-backed utilities.

Each retained use should stay narrowly scoped by authenticated owner context before row mutation.

## Safe Error Behavior

Owner-facing errors should:

- return sign-in for unauthenticated users;
- return access denied or not found for forbidden records;
- avoid confirming whether another owner's record exists;
- avoid raw Supabase messages for sensitive mutation failures;
- avoid owner IDs, guest IDs, storage paths, SQL, policy names, stack traces, signed URLs, and service-role details.

This phase sanitized owner document insert failures and kept cross-owner mutation failures generic.

## Audit Logging Findings

Existing audit coverage remains incomplete for owner-sensitive workflows.

Point-status confirmation actions reuse `owner_points_events` for narrow audit metadata. Banked, expired, still-available, and remind-later actions record the owner membership, action type, timestamp, source, and resulting point amount where applicable. They do not log banking credentials, guest data, signed URLs, or full owner records.

Recommended future audit events:

- match accept/decline;
- match confirmation;
- Ready Stay create/update/submit/hide/cancel;
- rental confirmation upload;
- owner document upload;
- verification upload;
- agreement acceptance;
- notification mark-read;
- payout setup changes.

Logs must not contain signed URLs, banking data, guest contact data, full documents, private comments, or API keys.

## Tests

Security regression coverage added for:

- owner-scoped notification mark-read;
- membership owner-record ownership comparison;
- cross-owner match confirmation prevention;
- owner document upload owner-record insertion and MIME rejection;
- rental confirmation storage-path ownership rejection before mutation;
- shared match guest-contact visibility and rental document path helpers.

## Remaining Risks

- Full route-by-route migration to `requireOwnerAccess` is still incomplete.
- RLS policy gaps need database review before public scale.
- Match and rental detail guest-data visibility should be product-reviewed stage by stage.
- Storage bucket policies should be verified directly in Supabase configuration.
- Owner audit logging needs a dedicated implementation phase.

## Next Phase

Route consolidation is not blocked by this application-level pass, but owner security should receive a dedicated RLS/storage-policy migration review before broad public owner-portal launch.
