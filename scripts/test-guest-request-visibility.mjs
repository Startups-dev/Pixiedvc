// Runs only in a fresh, network-disabled container from a cached PostgreSQL image.
// No .env files, host volumes, published ports, or remote database URLs are used.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const image = "public.ecr.aws/supabase/postgres:17.6.1.021";
const container = `hannadvc-guest-requests-${process.pid}`;
const migration = readFileSync(new URL("../supabase/migrations/20261103000001_fix_guest_request_owner_policy.sql", import.meta.url), "utf8");
const fixture = readFileSync(new URL("./tests/guest-request-visibility.fixture.sql", import.meta.url), "utf8");
const rollback = `alter policy "Admins manage owners" on public.owners
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));`;
const ids = [1, 2, 3, 4, 5].map(n => `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`);
const ownerIds = ["66666666-6666-4666-8666-666666666666", "77777777-7777-4777-8777-777777777777"];
const actors = {
  ordinary: "11111111-1111-4111-8111-111111111111",
  other: "22222222-2222-4222-8222-222222222222",
  test: "4de38521-9534-4b81-b54e-81e6b7c58539",
  owner: "33333333-3333-4333-8333-333333333333",
  unrelatedOwner: "44444444-4444-4444-8444-444444444444",
  admin: "55555555-5555-4555-8555-555555555555",
};
let passed = 0;
let started = false;

function docker(args, options = {}) {
  return spawnSync("docker", args, { encoding: "utf8", timeout: 30_000, ...options });
}
function sql(query, errorCode) {
  const result = docker(["exec", "-i", container, "psql", "-X", "-qAt", "-h", "/tmp", "-U", "postgres", "-d", "postgres",
    "-v", "ON_ERROR_STOP=1", "-v", "VERBOSITY=verbose"], { input: query });
  if (errorCode) {
    assert.notEqual(result.status, 0, "Expected database rejection");
    assert.match(result.stderr ?? "", new RegExp(`ERROR:\\s+${errorCode}:`));
  } else {
    assert.equal(result.status, 0, result.stderr || result.error?.message);
  }
  return result.stdout?.trim();
}
function asActor(actor, statement, { errorCode, write = false, claims = {} } = {}) {
  const role = actor === "anon" || actor === "service_role" ? actor : "authenticated";
  const jwt = JSON.stringify({ sub: actors[actor] ?? null, role, ...claims });
  // All writes below are synthetic security assertions and always rolled back.
  return sql(`begin${write ? "" : " read only"};
    set local role ${role};
    set local request.jwt.claims = '${jwt}';
    ${statement}; rollback;`, errorCode);
}
function visible(actor, table = "booking_requests", predicate = "true") {
  return JSON.parse(asActor(actor, `select coalesce(jsonb_agg(id order by id), '[]') from public.${table} where ${predicate}`));
}
function page(actor) {
  return JSON.parse(asActor(actor, `select coalesce(jsonb_agg(q.id order by q.id), '[]') from (
    select b.id, b.status, b.is_test_booking, b.created_at, b.check_in, b.check_out,
      b.primary_room as room_type, b.adults, b.youths, b.total_points, r.name
    from public.booking_requests b left join public.resorts r on r.id=b.primary_resort_id
    where b.renter_id=auth.uid()
      and b.status in ('submitted','pending_match','pending_owner','matched','confirmed','cancelled')
    order by b.created_at desc) q`));
}
function check(name, callback) {
  callback();
  passed++;
  console.log(`PASS ${name}`);
}
function catalog() {
  return JSON.parse(sql(`select jsonb_build_object(
    'policies', (select jsonb_agg(jsonb_build_object('table', tablename, 'name', policyname,
      'roles', roles, 'cmd', cmd, 'mode', permissive, 'using', qual, 'check', with_check)
      order by tablename, policyname) from pg_policies where schemaname='public'),
    'functions', (select jsonb_agg(jsonb_build_object('name', p.oid::regprocedure::text,
      'acl', p.proacl::text, 'definition', pg_get_functiondef(p.oid)) order by p.oid)
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','auth')),
    'tables', (select jsonb_agg(jsonb_build_object('name', relname, 'acl', relacl::text,
      'rls', relrowsecurity, 'forced', relforcerowsecurity) order by relname)
      from pg_class where relnamespace='public'::regnamespace and relkind='r'),
    'constraints', (select jsonb_agg(pg_get_constraintdef(oid) order by oid)
      from pg_constraint where connamespace='public'::regnamespace))`));
}

try {
  const run = docker(["run", "--detach", "--rm", "--pull=never", "--network=none", "--name", container,
    "--user", "postgres", "--entrypoint", "sh", image, "-c",
    "initdb -D /tmp/guest-requests-db -A trust --no-instructions >/tmp/init.log && exec postgres -D /tmp/guest-requests-db -c listen_addresses='' -c unix_socket_directories=/tmp -c shared_preload_libraries=''"]);
  assert.equal(run.status, 0, run.stderr || run.error?.message);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (docker(["exec", container, "pg_isready", "-h", "/tmp", "-U", "postgres"]).status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error(`PostgreSQL did not become ready: ${docker(["logs", container]).stdout}`);
  sql(fixture);
  const before = catalog();
  for (const actor of ["ordinary", "test"]) {
    check(`baseline reproduces 42501 for ${actor} guest`, () => asActor(actor,
      "select id from public.booking_requests where renter_id=auth.uid()", { errorCode: "42501" }));
  }

  sql(migration);
  const after = catalog();
  check("only the two expressions on the existing owner admin policy change", () => {
    const target = p => p.table === "owners" && p.name === "Admins manage owners";
    assert.deepEqual(after.policies.filter(p => !target(p)), before.policies.filter(p => !target(p)));
    const original = before.policies.find(target);
    const updated = after.policies.find(target);
    assert.deepEqual(updated, { ...original, using: "is_admin()", check: "is_admin()" });
    assert.deepEqual({ ...after, policies: [] }, { ...before, policies: [] });
  });
  check("restricted UUID overload remains uncallable by anon, authenticated and service_role", () => {
    for (const role of ["anon", "authenticated", "service_role"]) {
      assert.equal(sql(`select has_function_privilege('${role}', 'public.is_admin(uuid)', 'execute')`), "f");
    }
    asActor("admin", `select public.is_admin('${actors.ordinary}'::uuid)`, { errorCode: "42501" });
  });

  const expected = {
    ordinary: [ids[0], ids[3]], other: [ids[1]], test: [ids[2]],
    owner: [ids[0], ids[4]], unrelatedOwner: [ids[1]], admin: ids, anon: [], service_role: ids,
  };
  for (const [actor, bookings] of Object.entries(expected)) {
    check(`${actor} sees exactly its authorized booking rows`, () => assert.deepEqual(visible(actor), bookings));
  }
  const pageExpected = { ordinary: [ids[0]], other: [ids[1]], test: [ids[2]], owner: [ids[4]], admin: [] };
  for (const [actor, bookings] of Object.entries(pageExpected)) {
    check(`guest page query stays ownership-scoped for ${actor}`, () => assert.deepEqual(page(actor), bookings));
  }
  check("another guest cannot fetch the ordinary or TEST booking by ID", () => {
    assert.deepEqual(visible("other", "booking_requests", `id in ('${ids[0]}','${ids[2]}')`), []);
    assert.deepEqual(visible("ordinary", "booking_requests", `id='${ids[2]}'`), []);
    assert.deepEqual(visible("test", "booking_requests", `id='${ids[0]}'`), []);
  });
  check("owners retain only their own owner-row visibility; guests see none; Admin sees both", () => {
    assert.deepEqual(visible("owner", "owners"), [ownerIds[0]]);
    assert.deepEqual(visible("unrelatedOwner", "owners"), [ownerIds[1]]);
    assert.deepEqual(visible("ordinary", "owners"), []);
    assert.deepEqual(visible("test", "owners"), []);
    assert.deepEqual(visible("admin", "owners"), ownerIds);
  });
  check("owner match visibility remains scoped; no guest or TEST match visibility", () => {
    assert.equal(visible("owner", "booking_matches").length, 1);
    assert.equal(visible("unrelatedOwner", "booking_matches").length, 1);
    for (const actor of ["ordinary", "other", "test"]) assert.deepEqual(visible(actor, "booking_matches"), []);
  });
  check("guest metadata cannot impersonate the Admin profile role", () => {
    const result = asActor("ordinary", "select public.is_admin()", {
      claims: { user_metadata: { role: "admin" }, app_metadata: { role: "admin" } },
    });
    assert.equal(result, "f");
    assert.equal(asActor("admin", "select public.is_admin()"), "t");
  });
  check("USING still denies guest owner writes and preserves owner/Admin writes", () => {
    for (const [actor, count] of [["ordinary", 0], ["test", 0], ["owner", 1], ["admin", 2]]) {
      const result = asActor(actor, "with changed as (update public.owners set user_id=user_id returning id) select count(*) from changed", { write: true });
      assert.equal(result, String(count));
    }
  });
  check("WITH CHECK rejects a guest's foreign owner insert and allows Admin", () => {
    const insert = `insert into public.owners(id,user_id) values('99999999-9999-4999-8999-999999999999','${actors.owner}') returning id`;
    asActor("ordinary", insert, { write: true, errorCode: "42501" });
    assert.equal(asActor("admin", insert, { write: true }), "99999999-9999-4999-8999-999999999999");
  });
  check("unchanged test constraint still rejects pending_match and real deposit payment", () => {
    asActor("service_role", `update public.booking_requests set status='pending_match' where id='${ids[2]}'`, { write: true, errorCode: "23514" });
    asActor("service_role", `update public.booking_requests set deposit_paid=99 where id='${ids[2]}'`, { write: true, errorCode: "23514" });
  });
  check("migration is safe to rerun without catalog drift", () => {
    sql(migration);
    assert.deepEqual(catalog(), after);
  });
  check("rollback restores the exact original policy/catalog and reproduces the original failure", () => {
    sql(rollback);
    assert.deepEqual(catalog(), before);
    asActor("ordinary", "select id from public.booking_requests where renter_id=auth.uid()", { errorCode: "42501" });
  });
  console.log(`\n${passed} PostgreSQL regression checks passed; no production connections were possible.`);
} finally {
  if (started) {
    const stop = docker(["stop", "--time", "5", container]);
    assert.equal(stop.status, 0, `Could not remove disposable test container: ${stop.stderr}`);
  }
}
