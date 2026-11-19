# Ready Stay notification release review

Status: release authorized. The owner applied the complete migration in the Supabase SQL Editor. Production function fingerprints, trigger/index/constraint checks, queue fields, RLS and ACLs were verified; version `20261117000001` was then marked applied in migration history without replaying SQL. The queue was empty at verification. Application deployment and scheduler activation follow the sequence below.

## Complete migration

The complete, executable transaction is [20261117000001_ready_stay_submission_notifications.sql](../supabase/migrations/20261117000001_ready_stay_submission_notifications.sql). Apply the entire file, including the outbox table, outbound email queue fields, trigger replacements, worker RPCs and ACLs. It is a one-time migration, not an idempotent repair script for a partially installed schema.

Its Ready Stay alert insert uses the predicate required to infer the partial unique index:

```sql
on conflict (ready_stay_id)
where ready_stay_id is not null
do nothing;
```

Prerequisites are the existing Ready Stay submission fields/test-listing flag, `admin_reservation_request_alerts` and its source check/indexes, reservation SMS preference/event fields, and `outbound_emails` with retry, idempotency and delivery-status fields. The local integration suite runs the complete target migration on real PostgreSQL 17 with the actual predecessor alert, SMS, Ready Stay and email migrations plus synthetic prerequisite tables. It does not claim to validate the entire historical migration chain or inspect the production database schema.

## Persistence and recovery

Previously: reservation/Ready Stay save commits, then the request process calls the notification helper, which creates each outbound email log and sends email before returning HTTP success. A process stop between the save and the helper loses the notification; an immediate retry loop and a manual retry button cannot discover that missing intent.

Now:

1. The Ready Stay insert/update, Admin alert, and `ready_stay_submission_outbox` intent commit in one database transaction. The intent contains a snapshot of owner email and reservation details. A trigger error rolls back the whole statement. The HTTP request returns success only after that database save succeeds, and does no email delivery work.
2. The scheduled worker reads unexpanded intents. It renders the owner and currently configured Admin messages, then calls `expand_ready_stay_submission_emails`. This locks the intent row and atomically persists all recipient email logs, exact provider request bodies, sender, recipient addresses and deterministic idempotency keys before marking the intent expanded. Another expander cannot add duplicates or change the frozen payload. Missing owner email/Admin configuration/app URL keeps the intent pending for a five-minute preparation retry.
3. The worker claims one email at a time with `FOR UPDATE SKIP LOCKED`, a two-minute lease and a random claim token. Requests have a 15-second timeout. An expired/suspended claim cannot be used to start a send; completion writes require the current unexpired token.
4. Provider failures persist the retry state. Backoff is 1, 2, 4, 8, 16, 32, then 60 minutes. There is no fixed three-attempt limit. A crashed process leaves an expiring lease; another scheduled run recovers the same message and provider key. An acknowledged send is no longer eligible. A lost database acknowledgement is retried with the identical frozen provider request/key.
5. Definitive first-attempt HTTP 4xx rejections (excluding 409) clear the uncertainty timer, allowing automatic recovery even after a long outage. Network timeouts, HTTP 5xx, conflicting/in-flight provider requests, and missing provider acknowledgements remain potentially ambiguous. A later rejection never erases an earlier uncertain attempt.

Resend stores idempotency keys for 24 hours ([official documentation](https://resend.com/changelog/idempotency-keys)). An uncertain email is automatically retried for at most 23 hours from its first potentially accepted attempt. After that, it remains visibly failed with no next attempt and an explicit reconciliation error; the cron response reports `needsReview` and HTTP 503. This avoids blindly sending a duplicate after the provider forgets the key. Reconcile provider acceptance before authorizing recovery; do not clear the timer or rotate the key merely to force a send. This is the exceptional ambiguity limit, not a substitute for the durable automatic retry worker.

Manual Admin retry rejects worker-managed rows with HTTP 409 so it cannot bypass claims or race automatic delivery. Other existing email retries remain unchanged.

Existing submissions are not scanned/backfilled, and existing outbound emails have NULL queue fields and cannot be picked up by this worker. A new explicit draft-to-submitted transition can create a new intent. Ready Stay test listings are excluded. Ready Stay alerts do not enter the guest reservation SMS path; booking/renter alerts continue to queue their existing opted-in SMS events.

## Worker and configuration requirements

After release authorization, configure an external scheduler to POST `https://hannadvc.com/api/cron/ready-stay-submission-emails` every minute, authenticated with `Authorization: Bearer <CRON_SECRET>`. GET is not a trigger. Allow at least a 120-second scheduler attempt deadline. Overlapping invocations are safe; database claims coordinate all instances.

Runtime requirements:

- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (the existing `SUPABASE_SERVICE_ROLE` fallback is also supported).
- `RESEND_API_KEY` and the existing `RESEND_FROM_EMAIL`.
- A valid app base URL, resolved by the existing `APP_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_URL` fallback chain.
- At least one configured Admin email and an owner email in the submission intent.
- `CRON_SECRET` for the protected worker endpoint. Never put the secret in a URL or commit its value.

Each invocation prepares up to 25 intents and delivers up to 25 messages, stopping new claims after 40 seconds. Watch pending intent age, due email age, worker HTTP failures, `preparationFailed`, `failed` and `needsReview`. Successful worker summaries log counts only. Preparation errors defer affected intents so one bad submission cannot permanently block newer ones.

A missing scheduler means notifications remain durably pending; the HTTP route deliberately has no synchronous delivery fallback. Creating/enabling the production scheduler is therefore a release requirement. It will send queued post-migration submissions once enabled, including submissions saved while the old application revision was still serving. Do not enable or invoke it until real email delivery is authorized.

## Read-only production verification

Cloud Run was inspected read-only on 2026-11-18. The serving revision is `pixiedvc-production-00150-db8` at 100% traffic. Its image digest is `sha256:6746925e0caff775cdf41d52253972f1fd117aabebbec0518438f7a4547daabf`. Cloud Build `fae98d09-6e90-4844-8e8a-45b69e1f4c06` reports that digest and commit `e7ca092fb342eb3420dbb8ac48a973e6f63c27db`.

Configured values:

| Setting | Value |
| --- | --- |
| `ADMIN_EMAILS` | Configured; verified read-only |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Same configured address; verified read-only |
| `RESEND_FROM_EMAIL` | `HannaDVC <hello@hannadvc.com>` |
| `APP_BASE_URL` | `https://hannadvc.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://hannadvc.com` |
| `CRON_SECRET` | Present; value not retrieved or printed |

`adminEmails()` uses `ADMIN_EMAILS ?? NEXT_PUBLIC_ADMIN_EMAILS ?? ''`, splits on commas, trims and lowercases addresses. An explicitly empty or whitespace-only `ADMIN_EMAILS` suppresses the public fallback. An absent server setting uses the public setting; both absent produce no recipients. The new worker deduplicates the resulting list and retains the intent if it is empty. No recipients were changed and no addresses were tested by sending email.

## Migration-before-deployment sequence

These are release instructions, not actions executed during this review.

Release reconciliation: the installed function bodies matched the checked-in migration exactly (MD5 fingerprints of PostgreSQL `prosrc`). The existing partial unique index, source check, four Ready Stay/guest/SMS triggers, queue indexes/columns and security restrictions passed verification. The history repair inserted only version `20261117000001`, name `ready_stay_submission_notifications`, with an empty statements array, matching a marked-applied repair. No schema SQL or historical notification backfill was replayed. PostgREST was notified to reload its schema.

1. Resolve the repository's separate release-check failures, select the intended notification changes without including unrelated local work, and confirm the prerequisite migration/schema state through the release process. Take the normal backup. Keep the new scheduler disabled/absent.
2. Apply the COMPLETE migration file as one transaction before deploying the notification application changes. If any statement fails, abort and inspect; do not continue with fragments of the file. Confirm PostgREST has reloaded its schema before deploying the worker/RPC callers.
3. The currently serving commit `e7ca092` does not call the new email helper or RPCs and does not require the new columns. The migration adds fields/tables, expands the alert source constraint, and preserves booking/renter triggers and SMS semantics. Its existing Ready Stay save automatically runs the new trigger and queues durable intent without changing the request payload. Existing alert queries select their old columns, so they still execute. During this short interval their unread badge can count a Ready Stay alert but their mapper cannot render it or produce its Ready Stay review link; the new application supplies that UI support. Avoid a long migration/deployment gap.
4. Deploy the notification application code, including the Ready Stay-aware Admin alert UI/read API changes already in the worktree, the submission error handling, protected worker route and manual-retry guard. Deploying the code does not itself invoke the email worker.
5. Verify the deployed revision and configuration read-only; verify submission and worker behavior in the isolated/local environment. Do not create a real production submission or invoke the production worker merely as a release check without authorization to send notifications.
6. Once real delivery is authorized, enable the minute scheduler and monitor its first runs. Only post-installation notification intents can be processed. The migration itself never resends historical submissions.

If the application deployment is rolled back to `e7ca092`, retain the additive migration and durable queue. The old application can still save submissions and queue intents. Disable the new scheduler if necessary; keep pending state for the corrected worker. Dropping queue fields/tables after they contain intents would lose recovery state and is not a safe rollback.

## Verification

Run the actual migration/trigger tests with:

```sh
node scripts/test-ready-stay-notifications.mjs
```

The script uses a fresh cached Supabase PostgreSQL 17 image with `--network=none`, no host volumes, no published ports and no env files. It stops/removes only its own test container. Test records and provider identities are synthetic. No real emails or SMS are sent.

Focused application verification covers the worker, protected cron route, owner submission route, manual retry guard, Admin recipients/fallback, reservation alert API/UI, and SMS provider/dispatcher. The focused type check covers the new worker/cron code and tests; lint covers the touched implementation/tests.

Results: 18 real PostgreSQL integration checks passed. All 68 focused application tests passed across 11 files. The focused worker/cron type check and scoped ESLint check passed. These checks send no real messages.

The expanded `src/lib/email.test.ts` run has five pre-existing branding failures: committed templates emit HannaDVC while the committed assertions expect PixieDVC. Those assertions/templates were not changed in this review. The full repository `tsc --noEmit --incremental false` also fails on unrelated existing Next route parameter types, React/calculator types, missing test globals, resort types and other files. These broader release checks are not green and should not be represented as such.
