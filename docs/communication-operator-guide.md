# HannaDVC communication operator guide

Audit date: 2026-10-17. The journey map and production evidence below are the read-only audit snapshot from that date. The Phase 1 addendum dated 2026-10-18 records subsequent local development work; it is not evidence of deployment or production operation.

## How to read the findings

- **Verified in code** means the repository contains a trigger, destination, and implementation path.
- **Verified in service configuration or records** means read-only production metadata corroborated configuration or recorded execution. A recorded API send is not proof of inbox delivery.
- **Implemented, not operationally verified** means code exists, but available production evidence does not show that the workflow is scheduled or successfully delivering.
- **Manual** means a staff member must act in an admin page, dashboard, or external channel.
- **Missing** means there is no functional path in the inspected app.
- **Unknown** means the relevant provider configuration or records were unavailable.

No credentials, recipient addresses, message bodies, or personal data are included here.

## Executive summary

HannaDVC sends email through Resend in `src/lib/email.ts`. The app records each attempt in `outbound_emails`; a `sent` status means Resend accepted the API request, not that the mailbox delivered it. The inspected code has no Resend event webhook to record delivery, bounce, complaint, or suppression events. Some authentication emails are sent by Supabase Auth and are outside the app's Resend log.

The production Cloud Run service `pixiedvc-production` was serving 100% of traffic on 2026-10-17. Its runtime had mail, support, payment, and cron-related configuration variable names set. Values were not read or recorded. Cloud Scheduler could not be inspected because its API is disabled in the project. The repository's `vercel.json` configures only the match-booking cron. Production `automation_runs` records establish that owner-match reminders and unsigned-agreement reminders are being invoked; they do not identify the invoker. The newsletter campaign, welcome sequence, and abandoned request recovery had no production run records in the inspected table.

The production `outbound_emails` table contained eight rows at inspection: seven Resend-accepted sends (two welcome day 0, one welcome day 3, one abandoned-request recovery, two newsletter campaign tests, and one support escalation) and one failed Ready Stay rejection send. These are limited log records, not a complete provider history. The latest recorded sends were between May and August 2026. No production evidence in this snapshot proves inbox delivery.

At the 2026-10-17 audit snapshot, `/contact` had no submit handler, incoming mail was not connected to the app, and offline support could not be answered from one workspace. Phase 1 now implements the contact and support workspace locally; it has not been deployed or verified in production. The remaining automation schedule and lifecycle communication gaps below remain as observed in the original audit.

## Phase 1: Unified Inbox (local implementation, 2026-10-18)

**Deployment state:** the code and migration are in the repository but have not been deployed. The migration has been applied and exercised against the separate `pixiedvc-founders-e2e` local Supabase project (loopback port 64322); the default `pixiedvc-app` local database and production were not changed. The scratch database was not reset. No production feature behavior should be inferred from these local checks.

### What the local code now does

- Admin navigation points to one Inbox at `/admin/inbox`. The former handoff and concierge pages route there instead of presenting duplicate queues. Views are Needs reply (default), Assigned to me, Waiting on customer, and Closed.
- The list shows last activity, unread state, assignment, source, and audience. An Owner/Affiliate/Guest label comes from an exact authenticated profile/owner/affiliate relationship or is marked self-reported when chosen on the public contact form. Record links use exact user IDs and existing booking/owner/affiliate IDs; names are never used to join records.
- The message thread and customer context panel collapse into a list/thread flow on narrow screens. Assign/unassign, mark read, and status actions require admin or an active SupportAgent record. Status is separate from unread and assignment.
- Customer-visible replies use Twilio Conversations when a conversation SID exists; otherwise they use the existing Resend email sender when a customer email exists. The UI says a provider accepted the send only after the transport reports acceptance; errors remain failed, and no available channel is shown as unavailable. Provider acceptance is not mailbox delivery.
- Twilio/live-chat messages and local transcript rows are separate systems. Existing guest live-message routes first persist a local `support_messages` row, then call Twilio; Inbox staff replies likewise persist locally before calling Twilio. There is no Twilio event webhook mirroring provider delivery receipts or arbitrary provider-side messages into the local table. Therefore a stored row with no delivery status is only a transcript record, not proof Twilio accepted it; reply rows set `pending` and then `sent`/`failed` from the transport call. The Inbox selects Twilio when a conversation SID exists and email otherwise. It does not merge live chat into ordinary AI-only conversations unless staff handoff already exists.
- Internal notes are stored with `visibility=internal` and `delivery_status=not_applicable`; the route exits before either email or Twilio is called. Public transcript reads filter internal notes (including legacy `[Internal note]` messages), and AI reply-draft context excludes them.
- Public `/contact` now validates name/email/audience/message, includes a hidden honeypot, applies a database-backed five-submission/15-minute per-IP limit using a hashed IP fingerprint, and deduplicates matching email+message submissions within a rolling ten-minute window. It stores a contact conversation, message, and handoff before attempting acknowledgement and staff-alert emails. Each result is saved separately; email failure does not erase the inquiry. A duplicate inquiry does not resend either notification. The endpoint uses the existing Resend sender configuration and falls back to the staff inbox address already used by the app.
- The schema migration adds Inbox source/status/unread fields, message visibility/delivery state, the contact dedupe key, notification status, a persistent contact abuse-limit table, and a trigger that reopens a closed handoff when a customer replies. It leaves the existing support message/conversation records as the single source of truth.
- Attachments are not implemented in this Inbox. The existing app support store is text-based for these paths.

### Transcript access finding

The original audit flagged `/api/support/conversation` because it could be queried with a conversation ID without verifying the requester. The Phase 1 code now requires an admin/active support agent, the matching authenticated guest user, or a valid signed anonymous live-chat token. `includeClosed=1` is staff-only. Route tests pass; in the isolated local environment an unauthenticated Inbox transcript request returned 401, anonymous and authenticated database roles saw zero rows for the synthetic transcript, and a signed guest transcript omitted the internal note. This remains local validation only; production has not been checked or changed.

### Local checks and known dependencies

The focused route tests pass (six tests total). On isolated local Supabase, a synthetic contact submission persisted before both disabled email notifications reported failure; a matching repeat was deduplicated. An already-onboarded synthetic staff account successfully read the Inbox, assigned a conversation, marked it read, changed status, and added an internal note. The staff transcript included the note while the signed guest transcript excluded it. With Resend/Twilio credentials blank, a customer reply correctly returned a failed delivery result; inserting a customer message reopened a closed conversation and set it unread. Synthetic inquiry, message, rate-limit, and staff-account records were removed after verification. Changed-file ESLint and `git diff --check` pass. `pnpm build` passes and includes `/admin/inbox`; build skips type validation and linting. Repository-wide TypeScript still reports existing errors in generated route validators and unrelated files; no changed Inbox file errors were found. The local Next server starts at `http://127.0.0.1:3107` against the scratch database. Browser access was unavailable, so desktop/mobile visual inspection and screenshots remain outstanding. The migration and code are not deployed; production Inbox behavior is unverified.

Real email and Twilio delivery were disabled for local checks. Production `RESEND_FROM_EMAIL`, `RESEND_API_KEY`, and staff-alert destination behavior remain unverified. Staff may use the production Inbox only after the migration and app code are deployed together and staff authorization is provisioned.

### Zoho Mail integration recommendation (Phase 2, not configured)

The current implementation has no incoming-email transport or Zoho thread identifiers. Use a Zoho Mail outgoing webhook as the inbound event source, then ingest the message into `support_conversations`/`support_messages` through a dedicated authenticated server endpoint. Verify Zoho's `X-Hook-Signature` using HMAC-SHA256 over the raw request body and stored `X-Hook-Secret`, deduplicate by Zoho message ID, and retain a mapping of Zoho message/thread IDs to the Inbox conversation. Do not use email address or display name alone to attach a message to a booking/customer record. Zoho's API supports replying to an existing message by message ID, which is the preferred thread-preserving outbound path. [Webhook setup and signature verification](https://www.zoho.com/mail/help/dev-platform/webhook.html), [message reply API](https://www.zoho.com/mail/help/api/email-api.html).

Use the Canadian regional service endpoints: Mail API `https://mail.zohocloud.ca` and OAuth Accounts `https://accounts.zohocloud.ca`. The exact account may return an API domain during OAuth; honor that returned regional domain. Create a server-based OAuth client in the Canada data center, grant only message read/create and account read scopes needed to fetch the mailbox account and reply (`ZohoMail.messages.READ`, `ZohoMail.messages.CREATE`, `ZohoMail.accounts.READ`), request offline access for refresh, and keep the client secret and refresh token in the server secret store. Zoho documents Canada endpoints and the server-based OAuth flow. [Regional API endpoints](https://www.zoho.com/mail/help/api/getting-started-with-api.html), [OAuth data-center endpoints and flow](https://www.zoho.com/developer/oauth/multi-dc-support.html), [message list/read and reply endpoints](https://www.zoho.com/mail/help/api/get-emails-list.html), [email message API](https://www.zoho.com/mail/help/api/email-api.html).

Zoho's webhook can send full message data or a limited summary. Full data includes a stable `messageId` needed for idempotency and reply threading, so configure full data only after the signed endpoint is ready; store only normalized message fields and required provider IDs, sanitize HTML, and initially leave attachments out. The outgoing webhook can be filtered and may disable itself after an extended period of unresponsive endpoint behavior, so monitor webhook health and add reconciliation polling for missed events. Webhooks are documented in Zoho Mail's Developer Space. The current Mail Lite pricing page lists Developer Space as a Mail Lite capability; no additional Zoho user/license is expected for this one mailbox, but confirm webhook/API entitlement on this specific account. Cloud endpoint execution, secret storage, database storage, and monitoring may add hosting cost; current amounts depend on HannaDVC's cloud plan and are not verified here. [Mail Lite capabilities](https://www.zoho.com/mail/zohomail-pricing.html).

Recommended setup sequence after the Phase 1 release:

1. Sign into Zoho Mail's Canadian account and register a **Server-based Application** in the Zoho API Console while using the Canada data center. Set a HannaDVC HTTPS OAuth callback. Request `ZohoMail.accounts.READ`, `ZohoMail.messages.READ`, and `ZohoMail.messages.CREATE` with offline access. Use `https://accounts.zohocloud.ca/oauth/v2/auth` for authorization and the Canada Accounts token endpoint for the authorization-code and refresh-token exchanges. Keep the client secret and refresh token in the server secret manager.
2. Resolve the single mailbox's `accountId` using `GET https://mail.zohocloud.ca/api/accounts` with the regional Zoho token. Use that account ID for reads and replies. Store the incoming Zoho `messageId` and `threadId` with the Inbox conversation mapping; call Zoho's reply endpoint for a specific message when staff replies so the email remains threaded.
3. Deploy the webhook receiver before configuring Zoho. It must accept the POST body as raw bytes, verify `X-Hook-Signature` against the stored first-request `X-Hook-Secret` using HMAC-SHA256/base64, reject invalid requests, deduplicate by mailbox plus message ID, and return HTTP 200 promptly after durable event acceptance. Avoid logging raw bodies, token values, or message content in application logs.
4. In Zoho Mail open **Settings → Integrations → Developer Space → Outgoing Webhooks → Add new configuration**. Name it, use the deployed receiver URL, select **Mail**, choose the incoming-message event/condition with the narrowest relevant mailbox filter, and save. Zoho sends an initial POST to validate the endpoint; the receiver must be ready to verify and acknowledge it. Use the documented signature headers and keep the webhook secret private.
5. Initially exclude attachments and limit ingestion to `hello@hannadvc.com`. Test one controlled external inbound email, one deduplicated retry, one exact-thread reply, and a failed endpoint/recovery. Confirm messages appear once in the Inbox and remain in Zoho. Monitor webhook state; add periodic reconciliation using read-only `messages.READ` calls before relying on the webhook as a complete archive.

Zoho Mail's OAuth documentation has multiple server-based authorization flows; use the Canadian Accounts host rather than the default US examples in its Mail API guide. Confirm the exact consent URL/API domain shown for HannaDVC's Canada organization in the API Console before storing any credentials.

### Consolidated setup checklist

1. Review and apply only `supabase/migrations/20261018000002_unified_communication_inbox.sql` to an isolated local or staging database first; verify the new columns, indexes, trigger, and `contact_submission_attempts` table. Do not apply the migration to production as part of Phase 1 local development.
2. Validate the database-backed contact/reopen/assignment paths against that isolated database, then deploy the corresponding app code and migration through HannaDVC's normal release process. Confirm admin and active SupportAgent roles can open `/admin/inbox`; unrelated authenticated users and anonymous users cannot access transcripts.
3. Verify production Resend sender configuration and the intended staff alert recipient without exposing secrets. Use a dedicated non-customer test identity for a contact submission; inspect saved conversation/message, both notification statuses, and the Inbox view.
4. Verify Twilio and email reply routes in a non-production environment. Confirm provider-accepted replies become `sent`/Waiting on customer; forced failures stay failed/Needs reply; internal notes never call either transport.
5. For Zoho Phase 2, confirm Mail Lite API/webhook availability, register a server OAuth client in Canada, prepare and secure the HMAC-verified ingestion endpoint and Zoho message-ID mapping, then configure an incoming-mail webhook in Zoho Mail Settings → Integrations → Developer Space → Outgoing Webhooks. Start with an agreed narrow filter, validate one controlled external message and one threaded reply, and monitor webhook delivery before expanding scope. Do not change MX records or forwarding; the existing mailbox remains the inbound destination.

## Communication system and operator consoles

### Email sending and retry

`src/lib/email.ts` sends through Resend (`POST /emails`), uses the configured sender address, and records template key, recipient, entity context, provider response ID, and pending/sent/failed status in `outbound_emails`. Most email paths execute inline in a route/action rather than through a durable queue. If logging cannot be performed, the send path may still proceed; therefore this table is not guaranteed to contain every attempt.

Operators can inspect `/admin/emails`, filter logged attempts, and retry eligible failures through `/api/admin/emails/[id]/retry`. Retry is a new send attempt; check the associated record and external provider before using it to avoid duplicate messages. `/admin/automation` shows run records and selected automation email logs. Its “healthy” status describes the recorded run status, not recipient delivery.

**Production evidence:** the app's email log records Resend acceptance as `sent`. There was no Resend event receiver in the inspected routes. Provider delivery, opens, bounce/complaint handling, and inbox placement are **unknown** from the available app records.

### Authentication email

`src/app/login/LoginClient.tsx` calls Supabase Auth for signup, password reset, and OAuth. `/auth/callback` handles the auth callback/verification exchange. These emails, when enabled, are generated by Supabase Auth, not the app's Resend templates. The checked-in `supabase/config.toml` is local configuration and disables email confirmation locally; it does not establish production Auth settings. Production confirmation, SMTP, rate limits, and delivery status are **unknown** because the Supabase Auth configuration and logs were not available.

## Journey map

### Accounts and onboarding

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Guest or owner signup | Supabase Auth from login/signup UI; callback at `/auth/callback` | **Verified in code.** Confirmation email behavior and delivery are **unknown** in production. |
| Password reset | Supabase Auth `resetPasswordForEmail` from login UI; affiliate password reset also uses Supabase Auth via `/api/affiliate/password-reset` | **Verified in code.** Provider delivery is **unknown**. |
| Owner onboarding | Profile/owner record updates in `src/app/onboarding/actions.ts`; owner agreement acceptance in `/api/owner/agreement/accept` | **Verified in code.** No separate onboarding completion email found. Agreement acceptance calls the Founding Owner grant helper when promotion rules are active; this is automatic enrollment in code, not a communication. |
| Incomplete owner onboarding | No recurring incomplete-onboarding reminder path found | **Missing** as an automated communication. Staff can review owner onboarding/admin queues. |
| Incomplete guest booking request | `src/lib/abandoned-booking-requests.ts`, invoked by `/api/cron/abandoned-booking-requests` and wrapper `/api/cron/run-abandoned-booking-requests` | **Implemented, not operationally verified.** Code selects eligible abandoned drafts and deduplicates recovery email. No production `automation_runs` rows were found for it. |

### Guests and booking lifecycle

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Inquiry/custom request | Guest request/stay-builder routes and `booking_requests`; `/admin/requests` and `/admin/guests` are staff work queues | Intake is **verified in code**. Most follow-up, clarification, status changes, and matching management are **manual/dashboard**. The public `/contact` form is **missing** a submission handler. |
| Expiring points request | `/api/expiring-point-requests` stores the request, sends a request-received confirmation to the owner, and sends a new-request alert to the configured admin recipient | **Verified in code.** This is a routed contact intake distinct from the unconnected `/contact` form. Production delivery was not specifically verified. |
| Booking request submitted | `src/app/stay-builder/actions.ts` sends `guest_booking_confirmation` to the lead guest | **Verified in code.** This is a request-received confirmation; it is not proof a reservation is confirmed. The email is inline through Resend. |
| Deposit checkout | `/api/booking/deposit` creates a Stripe Checkout session; payment success updates request state and affiliate conversion | **Verified in code.** Guest is redirected to the app; no app email receipt/reminder was found in this path. Stripe's own receipt settings and delivery are **unknown**. |
| Search/match status | Match engine `src/lib/match-bookings.ts`; cron routes under `/api/cron/match-bookings` and `/api/cron/run-match-bookings`; owner match email is sent when an owner opportunity is created | **Verified in code.** Repository cron config runs `/api/cron/run-match-bookings` every five minutes. Production invocation frequency was not inspected in scheduler metadata. Staff can monitor requests and owners in admin queues. |
| Owner opportunity response | Tokenized owner accept/decline endpoints under `/api/matches/[token]` | **Verified in code.** The owner response updates match state; no separate guest email on each response was found. Matching and guest update communications are mainly dashboard/staff processes. |
| Agreement creation | Admin owner actions and `src/server/contracts.ts` send agreement emails to owner and guest with secure contract links | **Verified in code; staff initiated.** See `/admin/requests` and owner/request workstations. |
| Agreement acceptance | `/contracts/[token]/actions.ts` records signatures; signed-copy email to guest and owner notification are sent from this path, with guest copy deduplicated by `signed_copy_emailed_at` | **Verified in code.** Resend acceptance is logged; delivery is not independently verified. |
| Unsigned agreements | `src/lib/unsigned-agreement-reminders.ts` and cron route/wrapper send owner and guest reminders | **Verified in code and production execution records.** The 500 most recent production run records included completed `unsigned_agreement_reminders` runs through 2026-10-17, with the latest run recording zero sends and zero errors. This establishes execution, not a delivered reminder. |
| Payment request/reminder | Admin request/payment workflow and Stripe checkout routes | Payment request creation is **manual/admin initiated**. No general guest payment reminder email automation was found. Stripe payment link/receipt behavior is **unknown**. |
| Reservation confirmation tasks | Owner rental confirmation endpoints update rental/booking records; Ready Stay purchase webhook sends a booking package to the owner | The task flow is **verified in code**. Owner task notices are chiefly in-app. No broad guest reservation-confirmation email template/callsite was found beyond booking/request confirmations and Ready Stay-specific messages. |
| Ready Stay guest package/linking | Stripe webhook sends `ready_stay_booking_package` to owner after purchase. Owner confirmation action sends `ready_stay_link_ready` email and in-app notification to guest when confirmation is ready | **Verified in code.** These are Ready Stay-specific communications. |
| Pre-arrival | My Trip and booking records expose trip/confirmation details; no scheduled pre-arrival email sender was found | **Missing** as an automated email journey in the inspected repository. Staff can follow up manually. |
| Reservation-name changes | Owner Ready Stay transfer/confirmation workflow records the Disney confirmation and notifies the guest when it is ready to link | **Verified for Ready Stay linking only.** A general reservation-name-change email workflow was not found. |
| Guest changes, cancellation, refund, post-stay | Booking/admin pages and Stripe/payment paths manage state; no consistent lifecycle email sequence or post-stay follow-up callsite found | Primarily **manual/dashboard**; automated email is **missing** in inspected paths. Stripe refund/receipt emails may be provider-managed; configuration **unknown**. |
| Human questions | Support widget or concierge intake (see support section) | Handoff email goes to staff, but there is no verified automatic visitor follow-up email. |

The payment and reservation paths can depend on Stripe-hosted receipts and payment notices. Those are external provider features and were not verified from Stripe configuration or event delivery metadata during this audit.

### Owners and Founding Owners

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Owner agreement/onboarding | Owner accepts through `/api/owner/agreement/accept`; `maybeGrantFoundingOwnerBonus` checks the configured promotion and preserves existing benefits | **Verified in code.** This performs Founding Owner enrollment during an active promotion after owner agreement acceptance. It does not send a Founding Owner welcome email in this path. Promotion configuration must be reviewed in Admin → Promotions → Founders Launch. |
| Point listing/status and fallback prompts | Owner portal and point-status service; `/api/cron/owner-fallback-prompts` inserts `notifications` records | **Dashboard-only.** Notification rows are in-app, not emails. Scheduler execution for fallback prompts was not established. |
| Booking opportunities | Match engine sends owner match email (`owner_match_waiting`) and owner dashboard surfaces the opportunity | **Verified in code.** Production `automation_runs` showed 500 completed `owner_match_reminders` runs, latest 2026-10-17 with zero sends and zero errors. Matching email send logs exist in code; production aggregate email log snapshot did not contain a match email. |
| Accept/reject and deadlines | Owner response API updates matching state; reminder automation sends `owner_match_waiting_reminder` | Response is **verified in code**; reminder is **verified in production run records**, though latest had zero sends. No guest notification for every accept/reject/deadline transition was found. |
| Reservation creation/confirmation and guest changes | Owner rental/confirmation endpoints; dashboard task states and admin rentals tools | Primarily **dashboard/manual**. Ready Stay has the emails described above. No general automated owner/guest change/cancellation email was found. |
| Owner payout schedule/status | Booking/rental payout ledger and admin release route. Releasing a 70% or 30% stage inserts an in-app `payout_released` notification for the owner | **Verified in code; dashboard-only.** No owner payout email is sent by this release path. Failed/late payout review is in admin payouts and rental milestone work; owner contact is manual. The configured payment processor's transfer notices are **unknown**. |
| Benefits and expiration | Benefit dates and Founding Owner status are stored on owner record by enrollment helper; promo admin UI controls campaign schedule/visibility | Enrollment mechanics are **verified in code**. The audit found no automated benefit-expiration email or member notice. Existing members' benefit terms are retained by the grant helper; operators should use owner record dates for an individual's benefit window. |

### Ready Stays

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Owner submission | Owner Ready Stay actions/API create or update listing records; owner dashboard displays status | **Verified in code; dashboard workflow.** No submission acknowledgment email found. |
| Admin approval/publication | `/api/admin/ready-stays/[id]/approve` validates proof and owner state, then makes listing active | **Manual admin action.** Approval route does not send an owner email. |
| Rejection | `/api/admin/ready-stays/[id]/reject` sends `ready_stay_rejected` to owner | **Verified in code.** Production log snapshot had one failed record for this template. Check `/admin/emails` before assuming delivery; retry after reviewing provider state. |
| Purchase | Stripe webhook updates purchase/booking state, sends `ready_stay_booking_package` to owner | **Verified in code.** Mail API acceptance is recorded; delivery is not proven. |
| Guest reservation name/link update | Owner confirms Disney transfer; `ready_stay_link_ready` sends guest the confirmation number/My Trip instructions and creates an in-app notice | **Verified in code.** Update is guarded by `guest_link_ready_notified_at` to avoid repeating the email. |
| Expiration, withdrawal, cancellation | Listing status/expiration and admin history are managed in Ready Stay pages and records | Mainly **dashboard/manual**. No separate expiration/withdrawal/cancellation email callsite was found. Expired/sold visibility is a listing-state/UI concern, not a communication notification. |

### Affiliates

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Application | `/api/affiliate/apply` stores `affiliate_applications` in pending state | **Verified in code.** No applicant acknowledgment email callsite found. |
| Approval | Admin Applications page invokes `/api/admin/affiliates/applications`; approval creates/invites a Supabase Auth user and creates/updates affiliate/profile records | **Manual admin action; code verified.** Auth invite is a Supabase Auth email. No separate approval/onboarding email was found. Production Auth delivery is **unknown**. |
| Rejection | Admin route changes application status and requires an admin reason | **Manual only.** Route returns success after updating status; it does not notify the applicant. This is a confirmed communication gap. |
| Referral links/attribution | Affiliate dashboard and referral tracking endpoints; `/api/affiliates/track` records visits/attribution; booking conversion code attaches conversions | **Verified in code.** The affiliate dashboard is the status surface. No referral-link email is automatically sent. |
| Commission earned/pending/approved/reversed | Conversion status and commission calculations in affiliate conversion code and admin conversion tools | **Dashboard/admin records.** No commission lifecycle emails found. Confirm/reverse actions are staff controlled. |
| Affiliate payout | `/admin/affiliates/payouts` prepares date-range runs and items from approved conversions; admin marks each item paid with method/reference/notes. Affiliate guides describe manual PayPal/Wise payment | **Manual external transfer plus dashboard record.** No payout notice or failure notice email found. Failed/voided items require admin follow-up. |
| Payout method/questions/disputes | Affiliate account and payout email setup routes, affiliate dashboard, and support | **Dashboard/manual support.** No dedicated affiliate email or dispute workflow found. |

### AI support and human handoff

1. The support panel calls `/api/support/chat`. Messages are persisted in `support_conversations` and `support_messages` when the server can persist them; the panel also keeps current messages in browser state. The route attempts Gemini responses with keyword-based support KB fallback. Semantic retrieval is currently disabled in the inspected implementation. If the model path is unavailable, the route may return a fallback response; AI answer quality is not independently monitored by the app.
2. Authenticated visitors are identified by Supabase user ID plus profile details and a generic authenticated guest type. Anonymous chats have no auth ID and may be identified only if they complete the handoff form. Conversations do not attach to an owner or affiliate business record ID. Thus a support agent may need to correlate the user manually.
3. Escalation routes create/update a conversation and support handoff, attempt assignment through the support assignment RPC, and use Twilio Conversations for live chat if configured and an agent is online. The guest polls for live messages. Twilio configuration/delivery was not available for independent production verification.
4. If live agent handoff is unavailable, the user is prompted for contact details and a message. `/api/concierge/request` stores the request/transcript and attempts to assign it; Resend sends a `support_escalation`/`concierge_handoff` email to the configured staff destination. Production metadata includes one Resend-accepted support escalation record (2026-07-02); that proves API acceptance only.
5. At the audit snapshot, agents used `/admin/support/handoffs` or `/support/agent`. These routes now redirect to the unified `/admin/inbox` in local code; the Inbox addendum below describes its replies and status behavior. Production remains on the deployed version until the code and schema migration are deployed together.
6. The audit snapshot did not have a distinct unread state. The local Phase 1 migration adds one; it is currently pending and has not changed production.

**Security note for operators:** the transcript authorization gap found in the audit was corrected in local code and covered by a mocked test. Production remains on its deployed authorization behavior until the corresponding code is deployed; continue treating transcript IDs and contents as sensitive.

### Newsletter and marketing email

| Event | Implementation and destination | Status / operator notes |
|---|---|---|
| Subscription sources | `/api/email-leads` plus homepage capture and deal/liquidation unlock flows call `src/lib/email-subscribers.ts`; owner lead flows also record consent fields | **Verified in code.** Subscriber records include source, tags, preferences, status, and events. Signup behavior varies by source and explicit consent. |
| Welcome series | `src/lib/welcome-sequence.ts` supports day 0, 3, 7, 14, 21, and 30; cron route `/api/cron/welcome-sequence` and wrapper `/api/cron/run-welcome-sequence` | **Implemented, not operationally verified.** Production run table had no welcome-sequence records. Production email logs showed two day-0 and one day-3 Resend-accepted messages from June; this is limited historical evidence that some sends were attempted, not proof the scheduled flow currently runs. |
| Campaigns/audience | Admin `/admin/campaigns`; `src/lib/newsletter-campaign-send.ts` filters subscribed, unsuppressed, marketing-consented subscribers by segment and adds per-subscriber unsubscribe URL | Campaign authoring and send code are **verified**. Scheduled delivery route exists, but production run records were empty. Manual/test sends are possible. The actual campaign execution schedule is **unknown**. Production logs showed two newsletter test sends, not a delivered campaign. |
| Unsubscribe | `/unsubscribe/[token]` hashes/validates tokens and marks subscriber unsubscribed; event is recorded | **Verified in code.** Marketing campaign selection excludes unsubscribed/suppressed records. |
| Bounce/complaint suppression | Subscriber schema tracks bounce fields and suppression state; no provider event webhook/caller for `suppressSubscriberMarketing` was found | **Missing automated provider feedback path** in inspected app. Operators cannot infer current suppression completeness from the app. |
| Marketing opt-out vs operational mail | Marketing campaigns check subscriber consent/status; transactional sends use Resend directly and do not consult newsletter subscription | Marketing opt-out suppresses **marketing sends**, not operational booking/account/support communications. This behavior is **verified in code**. |

## Scheduled and event-driven automation

| Job | Trigger/code | Production evidence available on 2026-10-17 |
|---|---|---|
| Match booking | Vercel cron `/api/cron/run-match-bookings`, every 5 minutes; match engine sends owner opportunities | Schedule is **verified in repository config**. Production scheduler invocation source and recent counts are **unknown**. |
| Owner match reminders | `/api/cron/owner-match-reminders` plus run wrapper | **500 completed production runs**, latest at 2026-10-17 16:00 UTC, latest sent 0/errors 0. Scheduler identity/source unknown. |
| Unsigned agreement reminders | `/api/cron/unsigned-agreement-reminders` plus run wrapper | **500 completed production runs**, latest at 2026-10-17 16:00 UTC, latest sent 0/errors 0. Scheduler identity/source unknown. |
| Abandoned guest booking recovery | `/api/cron/abandoned-booking-requests` plus wrapper | Code exists; **no production run rows** found. |
| Welcome sequence | `/api/cron/welcome-sequence` plus wrapper | Code exists; **no production run rows** found. Some historical send logs exist. |
| Scheduled newsletter campaign | `/api/cron/newsletter-campaigns` plus wrapper | Code exists; **no production run rows** found. |
| Owner fallback prompts | `/api/cron/owner-fallback-prompts` writes in-app notifications | Scheduler not identified; production execution not independently verified. |

The jobs commonly check a cron secret and use a wrapper route to call the protected route. Checked-in Vercel config schedules only matching. GCP Cloud Scheduler could not be listed because the API is disabled; no attempt was made to enable it. Therefore a production schedule might exist elsewhere, but it is **unknown** from inspected metadata. Cloud Run service being live does not prove a job is scheduled.

## Internal operations checklist

### Start of day

1. Open `/admin/requests` and `/admin/guests` for new, waiting, overdue, or stalled guest requests. Contact guests through the approved manual channel when no automated message is logged.
2. Open `/admin/owners` and `/admin/owners/verifications` for onboarding, verification, or owner action queues.
3. After Phase 1 is deployed with its migration, open `/admin/inbox` for unassigned, waiting, and closed conversations. Until then, use the currently deployed support handoff queue and do not assume the local contact form or unread states are active in production.
4. Open `/admin/ready-stays` for submissions needing review, failed publication, expiry, and transfer tasks.
5. Open `/admin/payouts` and rental milestone views for due/released/failed owner stages. Release actions create an in-app owner notification, not an email.
6. Open `/admin/affiliates/applications`, conversions, and payouts for pending review, commission status, payout-run errors, and manual transfer reconciliation. Notify applicants/affiliates manually because lifecycle email is absent.
7. Review `/admin/emails` failed sends and `/admin/automation` runs. Treat `sent` as provider API acceptance only. Verify state at Resend/provider if delivery matters, then retry only after checking for duplicates.

### Failure and escalation handling

- **Email failure:** inspect failed record and entity status in `/admin/emails`; avoid retrying if another channel or later attempt may already have reached the recipient. No provider delivery webhook is available in app records.
- **Automation failure or stale runs:** check `/admin/automation`, then inspect the corresponding entity queue. The UI reports run rows but does not establish that every production cron is scheduled.
- **Stripe/payment issue:** use the booking/admin state and Stripe dashboard/webhook records available to authorized operators; provider settings and its notification delivery were outside this audit.
- **Unassigned support:** inspect handoff queue; use configured staff email as an alert path, not a guaranteed delivery channel. Follow up with the visitor manually using collected contact details.
- **Affiliate payout:** compare payout run/item status with the external PayPal/Wise transfer record; update the admin record after the actual transfer. No automated affiliate payout notice exists.

## Production evidence and limits

Evidence was collected read-only on 2026-10-17 from Cloud Run service metadata, enabled service metadata, and aggregate Supabase app records. The production database query returned only grouped template/status counts and automation-key run counts. No credentials, recipient values, message bodies, or test data were read into this guide.

The available production automation rows showed 500 latest retained completed runs each for owner match reminders and unsigned agreement reminders, with the latest run of each recording 0 sent and 0 errors. Other three tracked automation keys had no rows. The outbound email table had eight rows: seven status `sent` (Resend accepted) and one failed. Since the table was sparse and lacks provider event updates, it is not a full delivery archive.

Cloud Scheduler API was disabled, so the audit could not verify the actual production scheduler. Supabase Auth email settings, Resend domain/provider event configuration, Stripe receipt settings, Twilio live support configuration, and mailbox monitoring were not available for read-only inspection. These remain **unknown**. Do not interpret absence of app records as proof that a separate external system has no communication activity.

## Key source locations

- Email transport/logging: `src/lib/email.ts`; templates: `src/lib/email/templates/`
- Admin email retry/log: `src/app/admin/emails/`, `src/app/api/admin/emails/[id]/retry/route.ts`
- Automation monitor: `src/app/admin/automation/page.tsx`
- Supabase Auth UI/callback: `src/app/login/LoginClient.tsx`, `src/app/auth/callback/`
- Guest request submission: `src/app/stay-builder/actions.ts`; request admin: `src/app/admin/requests/`
- Matching: `src/lib/match-bookings.ts`; owner reminder: `src/lib/owner-match-reminders.ts`
- Contracts: `src/server/contracts.ts`, `src/app/contracts/[token]/actions.ts`, `src/lib/unsigned-agreement-reminders.ts`
- Founder enrollment: `src/app/api/owner/agreement/accept/route.ts`, `src/lib/founding-owner-bonus.ts`
- Ready Stays: `src/app/owner/ready-stays/actions.ts`, `src/app/api/admin/ready-stays/`, `src/app/api/stripe/webhook/route.ts`
- Owner notifications/payout release: `src/app/api/admin/payouts/release/route.ts`, `src/app/owner/notifications/`
- Support: `src/app/api/support/`, `src/app/api/concierge/request/route.ts`, `src/app/admin/support/handoffs/`
- Affiliates: `src/app/api/affiliate/`, `src/app/api/admin/affiliates/`, `src/lib/affiliate-conversions.ts`, `src/lib/affiliates/payouts.ts`
- Newsletter: `src/lib/email-subscribers.ts`, `src/lib/welcome-sequence.ts`, `src/lib/newsletter-campaign-send.ts`, `src/app/api/cron/`
- Checked-in schedule: `vercel.json`
- Public contact page: `src/app/(public)/contact/page.tsx`
