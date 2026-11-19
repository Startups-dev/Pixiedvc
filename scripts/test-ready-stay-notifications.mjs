// Isolated, network-disabled PostgreSQL 17. Runs the COMPLETE target migration
// plus actual predecessor Ready Stay, outbound-email, alert and SMS migrations.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const image = 'public.ecr.aws/supabase/postgres:17.6.1.021';
const container = `hannadvc-ready-notifications-${process.pid}`;
const read = name => readFileSync(new URL(name, import.meta.url), 'utf8');
const migration = read('../supabase/migrations/20261117000001_ready_stay_submission_notifications.sql');
const docker = (args, options = {}) => spawnSync('docker', args, { encoding: 'utf8', timeout: 30_000, ...options });
const sqlArgs = ['exec', '-i', container, 'psql', '-X', '-qAt', '-h', '/tmp', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose'];
function sql(query, errorCode) {
  const result = docker(sqlArgs, { input: query });
  if (errorCode) { assert.notEqual(result.status, 0); assert.match(result.stderr, new RegExp(`ERROR:\\s+${errorCode}:`)); }
  else assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}
function sqlAsync(query) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', sqlArgs, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', x => out += x); child.stderr.on('data', x => err += x);
    child.on('error', reject); child.on('close', code => code === 0 ? resolve(out.trim()) : reject(new Error(err)));
    child.stdin.end(query);
  });
}
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
async function checkAsync(name, fn) { await fn(); passed++; console.log(`PASS ${name}`); }
const id = n => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, '0')}`;
const stay = (n, status = 'proof_uploaded', submitted = 'now()', test = false) => `select public.fixture_stay('${id(n)}', '${status}', ${submitted}, ${test});`;
const messages = n => JSON.stringify(['owner', 'admin'].map(audience => ({
  templateKey: audience === 'owner' ? 'ready_stay_owner_submission_confirmation' : 'ready_stay_admin_submission_alert',
  recipientUserId: audience === 'owner' ? '11111111-1111-4111-8111-111111111111' : null,
  audience, idempotencyKey: `fixture:${n}:${audience}`,
  request: { from: 'sender@example.test', to: `${audience}@example.test`, subject: 'Frozen subject', text: 'Frozen payload' },
})));
const expand = n => `select public.expand_ready_stay_submission_emails('${id(n)}', '${messages(n)}'::jsonb);`;
const claim = `select row_to_json(e) from public.claim_ready_stay_submission_email() e;`;
const finish = (row, error = null) => `select public.finish_ready_stay_submission_email('${row.id}', '${row.queue_claim_token}', ${error ? 'null' : "'provider-fixture'"}, ${error ? "'temporary failure'" : 'null'});`;
let started = false;
try {
  const run = docker(['run', '--detach', '--rm', '--pull=never', '--network=none', '--name', container,
    '--user', 'postgres', '--entrypoint', 'sh', image, '-c',
    "initdb -D /tmp/notification-db -A trust --no-instructions >/tmp/init.log && exec postgres -D /tmp/notification-db -c listen_addresses='' -c unix_socket_directories=/tmp -c shared_preload_libraries=''"]);
  assert.equal(run.status, 0, run.stderr); started = true;
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (docker(['exec', container, 'pg_isready', '-h', '/tmp', '-U', 'postgres']).status === 0) { ready = true; break; }
    await new Promise(r => setTimeout(r, 100));
  }
  assert.ok(ready, 'PostgreSQL startup');
  sql(read('./tests/ready-stay-notifications.fixture.sql'));
  for (const name of ['20260212000001_create_ready_stays.sql', '20260501000001_ready_stays_owner_submission_review.sql',
    '20260502000001_create_outbound_emails.sql', '20260503000001_outbound_emails_retry_fields.sql',
    '20261021000001_admin_inbox_sms_escalation.sql', '20261024000001_admin_reservation_request_alerts.sql',
    '20261102000001_admin_test_reservation_alerts.sql']) sql(read(`../supabase/migrations/${name}`));
  // Later pre-release schema fields used by the trigger (exact current checks).
  sql(`alter table public.ready_stays add column is_test_listing boolean not null default false;
    alter table public.ready_stays drop constraint ready_stays_verification_status_check;
    alter table public.ready_stays add constraint ready_stays_verification_status_check check (verification_status in ('not_submitted','proof_uploaded','submitted','approved','rejected'));
    alter table public.outbound_emails add column idempotency_key text, add column provider_delivery_status text not null default 'unknown';
    create unique index outbound_emails_idempotency_key_uidx on public.outbound_emails(idempotency_key) where idempotency_key is not null;
    create function public.fixture_stay(p_id uuid, p_status text, p_submitted timestamptz, p_test boolean) returns void language plpgsql as $$ begin
      insert into public.rentals(id) values(p_id);
      insert into public.rental_milestones values(p_id, 'disney_confirmation_uploaded', 'completed');
      insert into public.ready_stays(id, owner_id, rental_id, resort_id, check_in, check_out, points, room_type, season_type, owner_price_per_point_cents, guest_price_per_point_cents, verification_status, verification_submitted_at, is_test_listing)
      values(p_id, '11111111-1111-4111-8111-111111111111', p_id, '33333333-3333-4333-8333-333333333333', '2027-01-18', '2027-01-20', 26, 'Studio', 'normal', 2100, 2800, p_status, p_submitted, p_test);
    end; $$;
    ${stay(99)}
    insert into public.outbound_emails(template_key, recipient_email, subject, status, provider) values('historical', 'historical@example.test', 'Historical', 'failed', 'resend');`);
  sql(migration);
  check('complete migration applies; historical submissions/emails are not backfilled', () => {
    assert.equal(sql('select count(*) from public.ready_stay_submission_outbox'), '0');
    assert.equal(sql(claim), '');
    sql(`update public.ready_stays set verification_status = verification_status, verification_submitted_at = verification_submitted_at where id='${id(99)}'`);
    assert.equal(sql('select count(*) from public.admin_reservation_request_alerts'), '0');
  });
  const trigger = migration.match(/create or replace function public\.alert_on_ready_stay_submission\(\)[\s\S]*?\n\$\$;/)[0];
  check('reproduces original partial-index conflict failure on PostgreSQL (42P10)', () => {
    sql(trigger.replace(/on conflict \(ready_stay_id\)\s+where ready_stay_id is not null/i, 'on conflict (ready_stay_id)'));
    sql(stay(1), '42P10');
    assert.equal(sql(`select count(*) from public.ready_stays where id='${id(1)}'`), '0');
    sql(trigger);
  });
  check('submitted Ready Stay commits exactly one alert and durable email intent', () => {
    sql(stay(1));
    assert.equal(sql(`select count(*) from public.admin_reservation_request_alerts where ready_stay_id='${id(1)}'`), '1');
    assert.equal(sql(`select details->>'ownerEmail' from public.ready_stay_submission_outbox where ready_stay_id='${id(1)}'`), 'owner@example.test');
    assert.equal(sql('select count(*) from public.outbound_emails where queue_request is not null'), '0');
  });
  check('repeat updates and re-entry into submitted status never duplicate alert/intent', () => {
    sql(`update public.ready_stays set verification_status='submitted' where id='${id(1)}';
      update public.ready_stays set verification_status='approved' where id='${id(1)}';
      update public.ready_stays set verification_status='submitted' where id='${id(1)}';`);
    assert.equal(sql('select count(*) from public.admin_reservation_request_alerts'), '1');
    assert.equal(sql('select count(*) from public.ready_stay_submission_outbox'), '1');
  });
  check('unsubmitted draft, missing timestamp and test listings create no alert or intent', () => {
    sql(stay(2, 'not_submitted', 'null') + stay(3, 'proof_uploaded', 'null') + stay(4, 'submitted', 'now()', true));
    assert.equal(sql('select count(*) from public.ready_stay_submission_outbox'), '1');
    assert.equal(sql('select count(*) from public.admin_reservation_request_alerts'), '1');
  });
  check('draft-to-submitted update queues exactly once', () => {
    sql(`update public.ready_stays set verification_status='submitted', verification_submitted_at=now() where id='${id(2)}'`);
    assert.equal(sql(`select count(*) from public.admin_reservation_request_alerts where ready_stay_id='${id(2)}'`), '1');
  });
  check('guest booking/renter alerts and opted-in SMS still queue, Ready Stay does not queue SMS', () => {
    sql(`insert into public.admin_inbox_sms_preferences(user_id, phone_ciphertext, phone_verified_at, reservation_opted_in, reservation_enabled)
      values('22222222-2222-4222-8222-222222222222','synthetic-encrypted-phone',now(),true,true);
      insert into public.booking_requests(id, status, accepted_terms) values('${id(20)}','submitted',true);
      update public.booking_requests set status='submitted' where id='${id(20)}';
      insert into public.renter_requests(status) values('submitted');
      insert into public.booking_requests(id, status, is_test_booking) values('${id(21)}','submitted',true);
      ${stay(5)}
      insert into public.booking_requests(id) values('${id(22)}');
      update public.booking_requests set status='submitted', accepted_terms=true where id='${id(22)}';`);
    assert.equal(sql('select count(*) from public.admin_inbox_sms_events'), '4');
    assert.equal(sql('select count(*) from public.admin_inbox_sms_events e join public.admin_reservation_request_alerts a on a.id=e.reservation_alert_id where a.ready_stay_id is not null'), '0');
  });
  check('trigger failure aborts submission, alert and intent; a corrected retry succeeds', () => {
    sql(`create function public.fixture_fail() returns trigger language plpgsql as $$ begin raise exception 'injected outbox failure'; end; $$;
      create trigger fixture_fail before insert on public.ready_stay_submission_outbox for each row execute function public.fixture_fail();`);
    sql(stay(6), 'P0001');
    assert.equal(sql(`select count(*) from public.ready_stays where id='${id(6)}'`), '0');
    assert.equal(sql(`select count(*) from public.admin_reservation_request_alerts where ready_stay_id='${id(6)}'`), '0');
    sql('drop trigger fixture_fail on public.ready_stay_submission_outbox;');
    sql(stay(6));
  });
  check('authenticated inserts can invoke the trigger without direct access to auth users or outbox', () => {
    sql(`grant insert on public.rentals, public.rental_milestones, public.ready_stays to authenticated;
      grant select on public.rentals, public.rental_milestones, public.booking_matches, public.booking_requests to authenticated;
      set role authenticated; ${stay(7)} reset role;`);
    assert.equal(sql(`select count(*) from public.ready_stay_submission_outbox where ready_stay_id='${id(7)}'`), '1');
    sql('set role authenticated; select * from auth.users;', '42501');
  });
  check('crash after submission commit: a later worker atomically creates owner/Admin email rows', () => {
    sql(expand(1));
    sql(expand(1));
    assert.equal(sql(`select count(*) from public.outbound_emails where related_entity_id='${id(1)}'`), '2');
    assert.equal(sql(`select expanded_at is not null from public.ready_stay_submission_outbox where ready_stay_id='${id(1)}'`), 't');
  });
  check('failed recipient expansion rolls back all email rows and leaves intent recoverable', () => {
    const broken = JSON.parse(messages(2)); delete broken[1].request.subject;
    sql(`select public.expand_ready_stay_submission_emails('${id(2)}', '${JSON.stringify(broken)}');`, '23502');
    assert.equal(sql(`select count(*) from public.outbound_emails where related_entity_id='${id(2)}'`), '0');
    assert.equal(sql(`select expanded_at is null from public.ready_stay_submission_outbox where ready_stay_id='${id(2)}'`), 't');
  });
  await checkAsync('concurrent expansion is idempotent', async () => {
    await Promise.all([sqlAsync(expand(2)), sqlAsync(expand(2))]);
    assert.equal(sql(`select count(*) from public.outbound_emails where related_entity_id='${id(2)}'`), '2');
  });
  let first, second;
  await checkAsync('concurrent workers claim distinct messages with SKIP LOCKED', async () => {
    [first, second] = (await Promise.all([sqlAsync(claim), sqlAsync(claim)])).map(JSON.parse);
    assert.notEqual(first.id, second.id);
    assert.notEqual(first.queue_claim_token, second.queue_claim_token);
  });
  check('live leases cannot be reclaimed; crash recovery retains the provider key and frozen payload', () => {
    // Keep remaining messages out of this focused lease test.
    sql(`update public.outbound_emails set queue_next_attempt_at=now()+interval '1 day' where id not in ('${first.id}','${second.id}');`);
    assert.equal(sql(claim), '');
    sql(`update public.outbound_emails set queue_locked_until=now()-interval '1 second' where id='${first.id}';`);
    const recovered = JSON.parse(sql(claim));
    assert.equal(recovered.id, first.id);
    assert.notEqual(recovered.queue_claim_token, first.queue_claim_token);
    assert.equal(recovered.idempotency_key, first.idempotency_key);
    assert.deepEqual(recovered.queue_request, first.queue_request);
    assert.equal(sql(finish(first)), 'f');
    first = recovered;
  });
  check('failed delivery schedules backoff and sent deliveries cannot be reclaimed', () => {
    assert.equal(sql(finish(first, 'temporary')), 't');
    assert.equal(sql(`select queue_next_attempt_at > now() and queue_locked_until is null from public.outbound_emails where id='${first.id}'`), 't');
    assert.equal(sql(claim), '');
    sql(`update public.outbound_emails set queue_next_attempt_at=now() where id='${first.id}';`);
    const retry = JSON.parse(sql(claim));
    assert.equal(retry.retry_count, 3);
    assert.equal(sql(finish(retry)), 't');
    assert.equal(sql(claim), '');
    assert.equal(sql(`select status from public.outbound_emails where id='${first.id}'`), 'sent');
  });
  check('ambiguous retries stop before provider idempotency expires, with visible review state', () => {
    sql(`update public.outbound_emails set queue_first_attempt_at=now()-interval '24 hours', queue_locked_until=now()-interval '1 minute' where id='${second.id}';`);
    assert.equal(sql(claim), '');
    assert.equal(sql(`select status='failed' and queue_next_attempt_at is null and error_message like 'Idempotency window expired%' from public.outbound_emails where id='${second.id}'`), 't');
  });
  check('definitive rejection retries can recover automatically beyond 24 hours', () => {
    sql(expand(5));
    const row = JSON.parse(sql(claim));
    assert.equal(sql(`select public.finish_ready_stay_submission_email('${row.id}', '${row.queue_claim_token}', null, 'Resend HTTP 429', true)`), 't');
    assert.equal(sql(`select queue_first_attempt_at is null and queue_next_attempt_at is not null from public.outbound_emails where id='${row.id}'`), 't');
    sql(`update public.outbound_emails set queue_next_attempt_at=now()+interval '1 day' where related_entity_id='${id(5)}' and id<>'${row.id}';
      update public.outbound_emails set queue_next_attempt_at=now(), created_at=now()-interval '2 days' where id='${row.id}';`);
    const retry = JSON.parse(sql(claim));
    assert.equal(retry.id, row.id);
    assert.equal(sql(finish(retry)), 't');
  });
  check('queue tables/functions are inaccessible to anon/authenticated', () => {
    for (const role of ['anon', 'authenticated']) {
      sql(`set role ${role}; select * from public.ready_stay_submission_outbox;`, '42501');
      sql(`set role ${role}; select * from public.claim_ready_stay_submission_email();`, '42501');
      sql(`set role ${role}; select public.expand_ready_stay_submission_emails('${id(1)}', '[]');`, '42501');
      sql(`set role ${role}; select public.finish_ready_stay_submission_email('${first.id}', '${first.queue_claim_token}', null, null);`, '42501');
    }
    assert.equal(sql("select has_function_privilege('service_role','public.claim_ready_stay_submission_email()','execute')"), 't');
  });
  console.log(`\n${passed} PostgreSQL integration checks passed; no emails or SMS sent.`);
} finally {
  if (started) docker(['stop', container]);
}
