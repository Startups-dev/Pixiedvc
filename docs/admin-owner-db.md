# Admin Owner Workspace – Schema & RLS Plan

This document captures the database work needed to power `/admin/owners`.

## 1. Tables & Enums

Create the following enums:

```
owner_status           = ('pending','needs_more_info','verified','rejected')
doc_kind               = ('id_front','id_back','membership_card','contract','other')
doc_review_status      = ('unreviewed','accepted','flagged')
comment_kind           = ('note','system','reminder_sent','status_change')
bulk_action_type       = ('verify','reject','send_reminder')
```

Tables (all timestamps `timestamptz`):

| Table | Key columns |
| --- | --- |
| `owners` | `id uuid pk`, `user_id uuid`, `email citext`, `display_name text`, `home_resort text`, `use_year text`, `member_id_last4 text`, `status owner_status default 'pending'`, `submitted_at`, `verified_at`, `verified_by uuid`, `rejection_reason text`, `metadata jsonb` |
| `owner_documents` | `id uuid pk`, `owner_id uuid fk → owners.id`, `kind doc_kind`, `storage_path text`, `thumbnail_path text`, `uploaded_at`, `review_status doc_review_status default 'unreviewed'`, `notes text` |
| `owner_comments` | `id uuid pk`, `owner_id uuid fk`, `author_id uuid`, `body text`, `kind comment_kind default 'note'`, `created_at` |
| `owner_verification_events` | `id uuid pk`, `owner_id uuid fk`, `old_status owner_status`, `new_status owner_status`, `actor_id uuid`, `context jsonb`, `created_at` |
| `bulk_actions` (optional) | `id uuid pk`, `type bulk_action_type`, `actor_id uuid`, `payload jsonb`, `created_at` |

Recommended indexes:

```
create index owners_status_submitted_idx on owners(status, submitted_at desc);
create index owners_email_idx on owners(email);
create index owner_documents_owner_idx on owner_documents(owner_id);
create index owner_comments_owner_idx on owner_comments(owner_id, created_at desc);
create index owner_verification_events_owner_idx on owner_verification_events(owner_id, created_at desc);
```

## 2. Row-Level Security

Enable RLS on all tables and add policies:

- **owners**
  - admins/concierges: `select/update/insert/delete` (full) based on role.
  - owners: `select` and `update` limited to their own row (`auth.uid() = user_id`) and restricted columns (profile data only).
- **owner_documents**
  - owners can `insert/select` when `auth.uid() = owner_id`.
  - admins/concierges full access.
- **owner_comments**, **owner_verification_events**, **bulk_actions**
  - admins/concierges full access only.

Use Supabase auth (profile table) to determine role, or enforce via email allow-list (`NEXT_PUBLIC_ADMIN_EMAILS`).

## 3. RPCs / Server Actions

Implement RPCs or Supabase functions for atomic operations (used by server actions):

- `rpc_list_owners(status text, query text, limit int, offset int)` – returns queue records enriched with membership/doc counts.
- `rpc_owner_preview(owner_id uuid)` – returns owner w/ memberships, docs (signed URLs), recent comments.
- `rpc_verify_owner(owner_id uuid, actor_id uuid)` – inside transaction: updates status, stamps `verified_at/by`, inserts verification event + comment.
- `rpc_reject_owner(owner_id uuid, actor_id uuid, reason text)` – same pattern, plus email trigger.
- `rpc_request_more_info(owner_id uuid, actor_id uuid, message text)` – sets status, logs event, triggers reminder email.
- `rpc_bulk_action(type bulk_action_type, owner_ids uuid[], actor_id uuid, reason text)` – loops through owners and applies action with logging + per-row result.

Each RPC should check `auth.uid()` and ensure only admins/concierges call them.

## 4. Storage

- Bucket: `owner-docs`
  - Access: authenticated
  - Require signed URLs for previews / downloads
  - Optional: create thumbnail derivative stored at `thumbnail_path`

## 5. Notifications

- Email templates for `verified`, `needs_more_info`, `rejected`
- Edge function or server action that sends email + writes `owner_comments` (kind=`system`) + `owner_verification_events`

## 6. Audit & Analytics

- `owner_verification_events` powers SLA metrics (time-in-state)
- Weekly job aggregates: pending count, avg verification time, reminders sent, etc.
- For compliance, never delete events; append-only.


> **Environment:** If you add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`, the admin queue will query with elevated privileges (until the new RLS policies are ready). If the key is missing, the page falls back to the signed-in session, so make sure your policies allow admins to read the data.

Run the SQL snippets inside Supabase SQL editor (or migration tooling) before enabling the new `/admin/owners` UI.
