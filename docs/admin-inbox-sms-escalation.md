# Admin Inbox SMS escalation

## Scope and current state

This release adds optional staff SMS escalation for unresolved Admin Inbox conversations. It is off by default. It does not alter the existing Twilio Conversations/live-chat path, Resend, Zoho, or any customer-facing messaging flow. SMS contains only a short alert and a link to the authenticated Inbox; customer name, email, and message text are never included.

Production was inspected read-only. The serving Cloud Run service currently has no SMS-specific Twilio sender, Messaging Service, or encryption-key references. The Twilio credentials previously available in local development belong to a trial account, not a verified production sending setup. No production SMS settings were changed and no SMS was sent. A paid Twilio account, an SMS-capable production sender attached to a Messaging Service, and the corresponding server-side secrets are prerequisites.

The verified production schema includes the Inbox fields used by the migration: `support_conversations.inbox_source`, `inbox_status`, `unread_for_staff`, `updated_at`, and `closed_at`; `support_handoffs.assigned_agent_user_id`; and `support_messages.sender`, `sender_type`, `sender_user_id`, `agent_user_id`, `visibility`, `delivery_status`, `metadata`, and `created_at`. The migration references the existing `cron_locks(name, locked_until)` table. Its SQL was applied twice to a separate synthetic scratch schema to verify safe repeatability. It has **not** been applied to production.

## Behavior

- Staff can enter a phone in the Inbox alert settings UI. The number is E.164-normalized, encrypted at rest with AES-256-GCM, and only its last four digits are returned to the UI. A one-time code is stored as an HMAC digest and expires after ten minutes; verification attempts and code requests are limited. Phone verification does not enable messages by itself.
- Opt-in and enablement are separate and default to false. The default escalation delay is five minutes. Quiet hours are optional and default to `America/Toronto` when enabled.
- A database trigger queues an event only for a new customer-visible guest message after migration installation. Existing conversations are not backfilled. Historical-import markers and sources, staff messages, and internal notes are excluded. A handoff trigger handles support paths that insert the guest message before the handoff row.
- Unclaimed inquiries are queued for eligible opted-in staff. A reply on an assigned conversation is queued only for its current assignee. Additional replies in the same unanswered period coalesce into one queued alert per conversation and recipient.
- At send time the worker rechecks current staff authorization, opt-in, enablement, verified phone, alert type, assignment, open/unanswered state, delay, and quiet hours. Claim, successful staff reply, close, changed assignment, or changed settings cancels or invalidates queued alerts.
- Cloud Scheduler calls a locked worker. A persistent queue and conditional claim prevent overlapping dispatch. A failed provider response is recorded as failed; an ambiguous response becomes `unknown` and is never blindly resent. Twilio callbacks are signature-checked using the Twilio SDK and idempotently update accepted/delivered/failed state. A stored callback is reconciled if it arrives before the API response has been associated with the event.
- Per recipient, a database advisory lock enforces at most one attempt per minute, three per hour, and ten per day. Test texts are sent only by the signed-in, opted-in, enabled user through the explicit “Send test SMS” button.

## Production rollout prerequisites

1. Apply the single forward-only migration in [`admin-inbox-sms-escalation-production.sql`](admin-inbox-sms-escalation-production.sql) in Supabase SQL Editor as one transaction. It creates only SMS queue/preferences/verification/callback tables and triggers; it does not alter or backfill existing conversation or message rows. The copy records only migration version `20261021000001` in Supabase history, with a conflict-safe insert. Do not use `supabase db push` for this change.
2. Reply `success` after the SQL Editor transaction completes. Dependent application code must not be pushed before that confirmation.
3. Prepare a paid Twilio production account, an SMS-capable sender, and a Messaging Service containing that sender. Canada supports long-code and toll-free outbound messaging, but Canadian carriers apply filtering to application-to-person traffic. Twilio recommends toll-free verification or short codes for stronger delivery; toll-free messaging to Canada requires approved verification. The project’s deployment helper uses a Messaging Service SID.
4. Run `python3 scripts/gcp/setup-admin-inbox-sms-secrets.py` from a trusted Mac Terminal after the production SMS setup is ready. It prompts with hidden input for the Twilio Account SID, Auth Token, and Messaging Service SID, generates the phone-encryption key, and installs Secret Manager versions with runtime access. It does not create a Cloud Run revision. Do not place values in shell arguments, chat, or source control.
5. The existing deployment configuration binds the four SMS secrets on the next normal push-triggered release. The SMS feature remains inactive until those secrets are bound and a staff member verifies, opts in, and enables it.
6. Create one Cloud Scheduler job after the code is deployed. It uses the existing verified Zoho reconciliation service account and the same Google-signed OIDC check, but calls the SMS endpoint with its exact URL as audience:

   ```sh
   gcloud scheduler jobs create http hannadvc-admin-inbox-sms-escalation \
     --project=pixiedvc-production \
     --location=us-central1 \
     --schedule='* * * * *' \
     --time-zone=Etc/UTC \
     --uri='https://hannadvc.com/api/cron/admin-inbox-sms' \
     --http-method=POST \
     --oidc-service-account='hanna-zoho-reconcile@pixiedvc-production.iam.gserviceaccount.com' \
     --oidc-token-audience='https://hannadvc.com/api/cron/admin-inbox-sms' \
     --attempt-deadline=180s \
     --max-retry-attempts=0
   ```

   The worker has its own queue/locking/idempotency safeguards; Scheduler retries are disabled to avoid unnecessary duplicate invocations. Failed/unknown sends are retained for inspection and are not resent automatically.

## Twilio callback

Configure the Messaging Service status callback to:

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
- No real SMS was sent. Production migration, Cloud Run bindings, Scheduler job, callback setup, delivery, and user-facing browser settings have not been verified in production.

## Cost and Canada requirements

Twilio currently lists Canada outbound SMS at USD $0.0083 per message segment for long-code and toll-free senders, plus destination-carrier fees currently listed from $0.0064 to $0.0087 per segment. For a single segment, that is roughly USD $0.0147–$0.0170 before taxes or other account charges. Leased numbers currently list at USD $1.15/month for a long code and $2.15/month for toll-free. Prices can change; check the live pricing page before purchasing. Toll-free verification has no separate Twilio fee, but requires an approved verification; free-trial accounts cannot send unrestricted production SMS.

Sources: [Twilio Canada SMS pricing](https://www.twilio.com/en-us/sms/pricing/ca), [Twilio Canada SMS guidelines](https://www.twilio.com/en-us/guidelines/ca/sms), [Twilio toll-free verification console guide](https://www.twilio.com/docs/messaging/compliance/toll-free/console-onboarding), and [Twilio trial limitations](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account).
