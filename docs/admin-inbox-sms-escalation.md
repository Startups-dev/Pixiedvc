# Admin Inbox SMS escalation

## Scope and current state

This release adds optional staff SMS escalation for unresolved Admin Inbox conversations. It is off by default. It does not alter the existing Twilio Conversations/live-chat path, Resend, Zoho, or any customer-facing messaging flow. SMS contains only a short alert and a link to the authenticated Inbox; customer name, email, and message text are never included.

Production setup status as of October 22, 2026:

- The owner confirmed the SMS migration was applied in Supabase SQL Editor. Do not rerun it.
- All four SMS Secret Manager versions are installed, and the Cloud Run runtime service account has Secret Accessor permission. The serving revision at the start of this activation did not yet reference them; the committed deployment script binds them on a normal release when all four are present.
- A read-only Twilio API check confirmed an active paid account, the SMS-capable sender attached to the HannaDVC Staff Alerts Messaging Service, and the staff destination listed as a verified recipient. The Messaging Service delivery callback is configured to the callback URL below.
- Twilio does not expose Messaging Geo Permissions through its API. An account admin must confirm Canada is enabled in Console under **Messaging → Settings → Geo Permissions**. Canadian carriers may filter A2P traffic; Twilio recommends verified toll-free or short-code senders for optimal delivery.
- The OIDC-authenticated Scheduler job `hannadvc-admin-inbox-sms-escalation` is enabled every minute in `us-central1`. Its first scheduled request returned HTTP 200; the worker scanned zero queued alerts and accepted zero messages.
- Staff SMS preferences remain off by default. No verification or test SMS has been sent. The empty activation commit alone did not produce a build, so this content-bearing documentation push is intended to trigger the existing Cloud Build pipeline and bind the installed secrets. Do not manually update Cloud Run.

The verified production schema includes the Inbox fields used by the migration: `support_conversations.inbox_source`, `inbox_status`, `unread_for_staff`, `updated_at`, and `closed_at`; `support_handoffs.assigned_agent_user_id`; and `support_messages.sender`, `sender_type`, `sender_user_id`, `agent_user_id`, `visibility`, `delivery_status`, `metadata`, and `created_at`. The migration references the existing `cron_locks(name, locked_until)` table. Its SQL was applied twice to a separate synthetic scratch schema to verify safe repeatability, and its production application was confirmed by the owner. Do not rerun it.

## Behavior

- Staff can enter a phone in the Inbox alert settings UI. The number is E.164-normalized, encrypted at rest with AES-256-GCM, and only its last four digits are returned to the UI. A one-time code is stored as an HMAC digest and expires after ten minutes; verification attempts and code requests are limited. Phone verification does not enable messages by itself.
- Opt-in and enablement are separate and default to false. The default escalation delay is five minutes. Quiet hours are optional and default to `America/Toronto` when enabled.
- A database trigger queues an event only for a new customer-visible guest message after migration installation. Existing conversations are not backfilled. Historical-import markers and sources, staff messages, and internal notes are excluded. A handoff trigger handles support paths that insert the guest message before the handoff row.
- Unclaimed inquiries are queued for eligible opted-in staff. A reply on an assigned conversation is queued only for its current assignee. Additional replies in the same unanswered period coalesce into one queued alert per conversation and recipient.
- At send time the worker rechecks current staff authorization, opt-in, enablement, verified phone, alert type, assignment, open/unanswered state, delay, and quiet hours. Claim, successful staff reply, close, changed assignment, or changed settings cancels or invalidates queued alerts.
- Cloud Scheduler calls a locked worker. A persistent queue and conditional claim prevent overlapping dispatch. A failed provider response is recorded as failed; an ambiguous response becomes `unknown` and is never blindly resent. Twilio callbacks are signature-checked using the Twilio SDK and idempotently update accepted/delivered/failed state. A stored callback is reconciled if it arrives before the API response has been associated with the event.
- Per recipient, a database advisory lock enforces at most one attempt per minute, three per hour, and ten per day. Test texts are sent only by the signed-in, opted-in, enabled user through the explicit “Send test SMS” button.

## Production setup and staff activation

1. The migration, paid Twilio account, sender, Messaging Service, Secret Manager versions, Scheduler job, and delivery callback are configured. Before relying on Canadian delivery, confirm Canada is enabled in Twilio **Messaging → Settings → Geo Permissions**. This setting cannot be inspected or changed through Twilio's API.
2. The deployment pipeline binds the four SMS secrets to Cloud Run on a normal content-bearing release. Do not create a separate revision manually. Verify the serving revision lists `ADMIN_INBOX_SMS_ENCRYPTION_KEY`, `TWILIO_SMS_ACCOUNT_SID`, `TWILIO_SMS_AUTH_TOKEN`, and `TWILIO_SMS_MESSAGING_SERVICE_SID` as Secret Manager references, without reading or printing secret values.
3. The existing Scheduler job uses the Zoho reconciliation service account and the exact OIDC audience `https://hannadvc.com/api/cron/admin-inbox-sms`. It runs every minute with retries disabled; its database queue, lock, and idempotency safeguards prevent duplicate dispatch. Failed or unknown sends are retained and never resent automatically.
4. Staff preferences remain disabled until a staff member verifies their number, explicitly opts in, and enables SMS in the Admin Inbox.

## Twilio callback

The Messaging Service status callback is configured to:

`https://hannadvc.com/api/webhooks/twilio/sms-status`

Twilio signs callbacks with the account Auth Token. The handler validates the signature against the canonical public URL and request parameters. It stores provider identifiers/status codes only, not message contents or phone numbers. Keep the callback URL and auth token server-side; do not disable signature validation.

## Settings and staff verification

After migration, deployment, secret binding, and Scheduler setup:

1. Sign in with an authorized HannaDVC admin/support account and open `/admin/inbox`.
2. Open **Alerts → SMS escalation**. If Twilio is not configured, the panel explains that sending is unavailable.
3. Enter your own mobile number with `+1` country code and select **Send verification code**. This button explicitly sends one real SMS. Enter its six-digit code and select **Verify phone**.
4. Check the operational-text opt-in, enable SMS escalation, configure the delay and optional quiet hours, then save.
5. Select **Send test SMS** to send one explicit test to your verified phone. Confirm it contains only an Inbox link and no customer details.
6. For escalation testing, create a synthetic new inquiry and leave it unclaimed beyond the saved delay, or reply as a customer on a synthetic conversation assigned to you. Confirm only the intended recipient gets a minimal SMS. Claim, reply, or close before the delay to verify cancellation. Do not test with a real customer conversation.

## Local validation record

- Forward migration applied twice against the isolated `hanna_sms_validation_20261021` scratch database, preserving pre-existing synthetic backlog; no existing database was reset.
- Synthetic SQL checks verified no historical events were backfilled, new contact inquiries queue at the configured delay, repeated customer messages coalesce, only the assignee is selected for assigned replies, staff claim/reply/close cancel pending work, and internal notes do not create events.
- Unit tests cover eligibility and cancellation, assigned replies, encrypted phone/verification digest, quiet hours, signed callback validation/status mapping, no automatic retry on ambiguous sends, scheduler OIDC rejection, and settings authorization.
- No real SMS was sent. Production SQL application is based on the owner's confirmation. At the start of activation, the serving revision lacked the SMS secret references. The Scheduler's first production request returned HTTP 200 with no queued alerts. Twilio's API confirmed the callback, but Canada Geo Permission remains a Console-only check. Phone verification and user-facing SMS delivery remain untested.

## Cost and Canada requirements

Twilio currently lists Canada outbound SMS at USD $0.0083 per message segment for long-code and toll-free senders, plus destination-carrier fees currently listed from $0.0064 to $0.0087 per segment. For a single segment, that is roughly USD $0.0147–$0.0170 before taxes or other account charges. Leased numbers currently list at USD $1.15/month for a long code and $2.15/month for toll-free. Prices can change; check the live pricing page before purchasing. Toll-free verification has no separate Twilio fee, but requires an approved verification; free-trial accounts cannot send unrestricted production SMS.

Sources: [Twilio Canada SMS pricing](https://www.twilio.com/en-us/sms/pricing/ca), [Twilio Canada SMS guidelines](https://www.twilio.com/en-us/guidelines/ca/sms), [Twilio toll-free verification console guide](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding), and [Twilio trial limitations](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).
