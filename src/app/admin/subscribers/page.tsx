import Link from 'next/link';

import { Card } from '@pixiedvc/design-system';

import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

type SubscriberRow = {
  id: string;
  email: string;
  status: 'subscribed' | 'unsubscribed' | string;
  source: string | null;
  country: string | null;
  tags: string[] | null;
  is_founding_owner: boolean;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  suppressed_at: string | null;
  last_email_sent_at: string | null;
  last_opened_at: string | null;
  last_clicked_at: string | null;
  email_preferences: Record<string, unknown> | null;
};

type EmailEventRow = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  subscriber: { email: string | null } | { email: string | null }[] | null;
};

type SegmentCount = {
  slug: string;
  name: string;
  count: number;
};

type CountQueryResult = {
  count: number | null;
  error: { message: string } | null;
};

type CountQuery = PromiseLike<CountQueryResult> & {
  eq(column: string, value: unknown): CountQuery;
  is(column: string, value: null): CountQuery;
  not(column: string, operator: string, value: null): CountQuery;
  contains(column: string, value: string[]): CountQuery;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatMetadataPreview(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return '—';
  const json = JSON.stringify(value);
  return json.length > 120 ? `${json.slice(0, 117)}...` : json;
}

function formatMetadataFull(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return '';
  return JSON.stringify(value, null, 2);
}

function eventSubscriberEmail(value: EmailEventRow['subscriber']) {
  if (!value) return '—';
  if (Array.isArray(value)) return value[0]?.email ?? '—';
  return value.email ?? '—';
}

function summaryTone(kind: 'blue' | 'emerald' | 'amber' | 'rose') {
  if (kind === 'blue') return 'border-[#334155] bg-[#1f2937] text-[#e5eefc]';
  if (kind === 'emerald') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200';
  if (kind === 'amber') return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
  return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
}

function subscriberStatusBadge(status: string, suppressedAt: string | null) {
  if (suppressedAt) {
    return 'border-rose-500/30 bg-rose-500/12 text-rose-200';
  }
  if (status === 'subscribed') {
    return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200';
  }
  if (status === 'unsubscribed') {
    return 'border-[#4b5563] bg-[#1f2937] text-[#d1d5db]';
  }
  return 'border-[#4b5563] bg-[#1f2937] text-[#d1d5db]';
}

async function countSubscribers(
  adminClient: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  configure?: (query: CountQuery) => CountQuery,
) {
  let query = adminClient.from('email_subscribers').select('*', { count: 'exact', head: true }) as CountQuery;
  if (configure) {
    query = configure(query);
  }
  const result = await query;
  if (result.error) return 0;
  return result.count ?? 0;
}

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await requireAdminUser('/admin/subscribers');
  const resolvedSearchParams = (await searchParams) ?? {};
  const statusFilter = readParam(resolvedSearchParams.status) ?? 'all';
  const sourceFilter = readParam(resolvedSearchParams.source) ?? 'all';
  const foundingOnly = readParam(resolvedSearchParams.founding) === '1';
  const readyStayOnly = readParam(resolvedSearchParams.readyStay) === '1';
  const search = (readParam(resolvedSearchParams.search) ?? '').trim();

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Subscriber Dashboard
              </h1>
              <p className="text-sm text-[#b4b4b4]">Read-only visibility into HannaDVC subscriber and lifecycle email data.</p>
            </div>
          </header>

          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  let subscriberQuery = adminClient
    .from('email_subscribers')
    .select(
      'id, email, status, source, country, tags, is_founding_owner, subscribed_at, unsubscribed_at, suppressed_at, last_email_sent_at, last_opened_at, last_clicked_at, email_preferences',
    )
    .order('subscribed_at', { ascending: false })
    .limit(200);

  if (statusFilter === 'subscribed' || statusFilter === 'unsubscribed') {
    subscriberQuery = subscriberQuery.eq('status', statusFilter);
  } else if (statusFilter === 'suppressed') {
    subscriberQuery = subscriberQuery.not('suppressed_at', 'is', null);
  }

  if (sourceFilter !== 'all') {
    subscriberQuery = subscriberQuery.eq('source', sourceFilter);
  }

  if (foundingOnly) {
    subscriberQuery = subscriberQuery.eq('is_founding_owner', true);
  }

  if (readyStayOnly) {
    subscriberQuery = subscriberQuery.contains('tags', ['ready_stay_alerts']);
  }

  if (search) {
    subscriberQuery = subscriberQuery.ilike('email', `%${search}%`);
  }

  const [
    { data: subscriberData, error: subscriberError },
    { data: sourceData, error: sourceError },
    { data: eventData, error: eventError },
    totalSubscribers,
    activeSubscribers,
    unsubscribedSubscribers,
    suppressedSubscribers,
    foundingOwners,
    readyStayAlerts,
    guestLeadCount,
    ownerLeadCount,
    foundingOwnerSegmentCount,
    verifiedOwnerCount,
    abandonedOnboardingCount,
    readyStaySegmentCount,
  ] = await Promise.all([
    subscriberQuery,
    adminClient.from('email_subscribers').select('source').limit(500),
    adminClient
      .from('email_events')
      .select('id, event_type, metadata, created_at, subscriber:email_subscribers(email)')
      .order('created_at', { ascending: false })
      .limit(20),
    countSubscribers(adminClient),
    countSubscribers(adminClient, (query) => query.eq('status', 'subscribed').is('suppressed_at', null)),
    countSubscribers(adminClient, (query) => query.eq('status', 'unsubscribed')),
    countSubscribers(adminClient, (query) => query.not('suppressed_at', 'is', null)),
    countSubscribers(adminClient, (query) => query.eq('is_founding_owner', true)),
    countSubscribers(adminClient, (query) => query.contains('tags', ['ready_stay_alerts'])),
    countSubscribers(adminClient, (query) => query.contains('tags', ['guest_lead'])),
    countSubscribers(adminClient, (query) => query.contains('tags', ['owner_lead'])),
    countSubscribers(adminClient, (query) => query.eq('is_founding_owner', true)),
    countSubscribers(adminClient, (query) => query.contains('tags', ['verified_owner'])),
    countSubscribers(adminClient, (query) => query.contains('tags', ['abandoned_onboarding'])),
    countSubscribers(adminClient, (query) => query.contains('tags', ['ready_stay_alerts'])),
  ]);

  if (subscriberError || sourceError || eventError) {
    const message = subscriberError?.message ?? sourceError?.message ?? eventError?.message ?? 'Unknown error';
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to admin
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Subscriber Dashboard
              </h1>
            </div>
          </header>
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
            <p className="text-sm text-[#ff6b6b]">Unable to load subscriber data right now.</p>
            <p className="mt-2 text-xs text-[#8e8ea0]">{message}</p>
          </Card>
        </div>
      </div>
    );
  }

  const subscribers = (subscriberData ?? []) as SubscriberRow[];
  const events = (eventData ?? []) as EmailEventRow[];
  const sourceOptions = Array.from(
    new Set(
      ((sourceData ?? []) as Array<{ source: string | null }>)
        .map((row) => row.source?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const segmentCounts: SegmentCount[] = [
    { slug: 'guest_leads', name: 'Guest Leads', count: guestLeadCount },
    { slug: 'owner_leads', name: 'Owner Leads', count: ownerLeadCount },
    { slug: 'founding_owners', name: 'Founding Owners', count: foundingOwnerSegmentCount },
    { slug: 'verified_owners', name: 'Verified Owners', count: verifiedOwnerCount },
    { slug: 'abandoned_onboarding', name: 'Abandoned Onboarding', count: abandonedOnboardingCount },
    { slug: 'ready_stay_alerts', name: 'Ready Stay Alerts', count: readyStaySegmentCount },
  ];

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-12 text-[#ececec]">
        <header className="space-y-4">
          <Link href="/admin" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to admin
          </Link>
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Subscriber Dashboard
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[#b4b4b4]">
                Read-only visibility into subscribers, lifecycle email signals, and seeded audience segments before campaign tooling is introduced.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/emails"
                className="rounded-full border border-[#3b4556] bg-[#1f2937] px-4 py-2 text-sm font-medium text-[#e5eefc] transition hover:border-[#64748b] hover:bg-[#243041]"
              >
                View email logs
              </Link>
              <Link
                href="/admin/automation"
                className="rounded-full border border-[#3b4556] bg-[#1f2937] px-4 py-2 text-sm font-medium text-[#e5eefc] transition hover:border-[#64748b] hover:bg-[#243041]"
              >
                Automation health
              </Link>
              <span className="rounded-full border border-dashed border-[#414141] px-4 py-2 text-sm font-medium text-[#7d8594]">
                Campaigns coming soon
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card surface="dark" className={`border p-5 ${summaryTone('blue')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ea2c0]">Total Subscribers</p>
            <p className="mt-3 text-3xl font-semibold text-white">{totalSubscribers}</p>
            <p className="mt-2 text-sm text-[#9fb0c8]">All known subscriber records across marketing and lifecycle capture.</p>
          </Card>
          <Card surface="dark" className={`border p-5 ${summaryTone('emerald')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200/80">Active Subscribers</p>
            <p className="mt-3 text-3xl font-semibold text-white">{activeSubscribers}</p>
            <p className="mt-2 text-sm text-emerald-100/75">Subscribed and not currently suppressed.</p>
          </Card>
          <Card surface="dark" className={`border p-5 ${summaryTone('amber')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200/80">Unsubscribed</p>
            <p className="mt-3 text-3xl font-semibold text-white">{unsubscribedSubscribers}</p>
            <p className="mt-2 text-sm text-amber-100/75">Subscribers who opted out via preference change or unsubscribe flow.</p>
          </Card>
          <Card surface="dark" className={`border p-5 ${summaryTone('rose')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-rose-200/80">Suppressed</p>
            <p className="mt-3 text-3xl font-semibold text-white">{suppressedSubscribers}</p>
            <p className="mt-2 text-sm text-rose-100/75">Suppressed for bounce or deliverability reasons.</p>
          </Card>
          <Card surface="dark" className={`border p-5 ${summaryTone('blue')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ea2c0]">Founding Owners</p>
            <p className="mt-3 text-3xl font-semibold text-white">{foundingOwners}</p>
            <p className="mt-2 text-sm text-[#9fb0c8]">Subscribers flagged as founding owners.</p>
          </Card>
          <Card surface="dark" className={`border p-5 ${summaryTone('blue')}`}>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8ea2c0]">Ready Stay Alerts</p>
            <p className="mt-3 text-3xl font-semibold text-white">{readyStayAlerts}</p>
            <p className="mt-2 text-sm text-[#9fb0c8]">Subscribers inferred from the `ready_stay_alerts` tag.</p>
          </Card>
        </section>

        <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white">Subscriber filters</h2>
              <p className="text-sm text-[#9ca3af]">Filter the current subscriber view without changing data.</p>
            </div>
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <label className="space-y-2 text-sm text-[#c7c7c7]">
                <span>Status</span>
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="w-full rounded-xl border border-[#404040] bg-[#1f1f1f] px-3 py-2 text-sm text-white"
                >
                  <option value="all">All statuses</option>
                  <option value="subscribed">Subscribed</option>
                  <option value="unsubscribed">Unsubscribed</option>
                  <option value="suppressed">Suppressed</option>
                </select>
              </label>

              <label className="space-y-2 text-sm text-[#c7c7c7]">
                <span>Source</span>
                <select
                  name="source"
                  defaultValue={sourceFilter}
                  className="w-full rounded-xl border border-[#404040] bg-[#1f1f1f] px-3 py-2 text-sm text-white"
                >
                  <option value="all">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-[#404040] bg-[#1f1f1f] px-3 py-2 text-sm text-[#c7c7c7]">
                <input type="checkbox" name="founding" value="1" defaultChecked={foundingOnly} className="h-4 w-4" />
                Founding owners only
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-[#404040] bg-[#1f1f1f] px-3 py-2 text-sm text-[#c7c7c7]">
                <input type="checkbox" name="readyStay" value="1" defaultChecked={readyStayOnly} className="h-4 w-4" />
                Ready Stay alerts only
              </label>

              <label className="space-y-2 text-sm text-[#c7c7c7]">
                <span>Search email</span>
                <input
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder="guest@example.com"
                  className="w-full rounded-xl border border-[#404040] bg-[#1f1f1f] px-3 py-2 text-sm text-white placeholder:text-[#6b7280]"
                />
              </label>

              <div className="xl:col-span-5 flex gap-3">
                <button
                  type="submit"
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-[#e5e7eb]"
                >
                  Apply filters
                </button>
                <Link
                  href="/admin/subscribers"
                  className="rounded-full border border-[#4a4a4a] px-4 py-2 text-sm font-medium text-[#c7c7c7] transition hover:border-[#6b7280] hover:text-white"
                >
                  Reset
                </Link>
              </div>
            </form>
          </div>
        </Card>

        <div className="grid gap-8 xl:grid-cols-[1.7fr_1fr]">
          <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-0 overflow-hidden">
            <div className="border-b border-[#3a3a3a] px-6 py-5">
              <h2 className="text-lg font-semibold text-white">Subscribers</h2>
              <p className="mt-1 text-sm text-[#9ca3af]">Showing up to 200 subscribers for the current filter set.</p>
            </div>

            {totalSubscribers === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-base font-medium text-white">No subscribers yet</p>
                <p className="mt-2 text-sm text-[#9ca3af]">
                  Subscriber records will appear here once lead capture or lifecycle subscription flows create them.
                </p>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-base font-medium text-white">No subscribers match these filters</p>
                <p className="mt-2 text-sm text-[#9ca3af]">
                  Try broadening the status, source, or tag filters to see more results.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#232323] text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">
                    <tr>
                      <th className="px-6 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Country</th>
                      <th className="px-4 py-3 font-medium">Tags</th>
                      <th className="px-4 py-3 font-medium">Founding</th>
                      <th className="px-4 py-3 font-medium">Subscribed</th>
                      <th className="px-4 py-3 font-medium">Unsubscribed</th>
                      <th className="px-4 py-3 font-medium">Last sent</th>
                      <th className="px-4 py-3 font-medium">Last opened</th>
                      <th className="px-4 py-3 font-medium">Last clicked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((subscriber) => (
                      <tr key={subscriber.id} className="border-t border-[#343434] align-top text-[#e5e7eb]">
                        <td className="px-6 py-4 font-medium text-white">
                          <div className="space-y-1">
                            <div>{subscriber.email}</div>
                            <div className="text-xs text-[#7d8594]">{subscriber.id}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs uppercase tracking-[0.2em] ${subscriberStatusBadge(
                              subscriber.status,
                              subscriber.suppressed_at,
                            )}`}
                          >
                            {subscriber.suppressed_at ? 'suppressed' : subscriber.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{subscriber.source ?? '—'}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{subscriber.country ?? '—'}</td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-[14rem] flex-wrap gap-1.5">
                            {(subscriber.tags ?? []).length > 0 ? (
                              (subscriber.tags ?? []).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-[#425067] bg-[#233044] px-2 py-1 text-[11px] text-[#d6e4ff]"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-[#6b7280]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{subscriber.is_founding_owner ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(subscriber.subscribed_at)}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(subscriber.unsubscribed_at)}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(subscriber.last_email_sent_at)}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(subscriber.last_opened_at)}</td>
                        <td className="px-4 py-4 text-[#c7c7c7]">{formatDateTime(subscriber.last_clicked_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="space-y-8">
            <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Seeded segments</h2>
                <p className="text-sm text-[#9ca3af]">Current audience counts for the initial segmentation model.</p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#73839a]">Based on subscriber tags and flags</p>
              </div>

              <div className="mt-6 space-y-3">
                {segmentCounts.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">No segments available.</p>
                ) : (
                  segmentCounts.map((segment) => (
                    <div key={segment.slug} className="flex items-center justify-between rounded-2xl border border-[#3a3a3a] bg-[#242424] px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-white">{segment.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">{segment.slug}</p>
                      </div>
                      <span className="text-lg font-semibold text-[#dbeafe]">{segment.count}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-white">Recent activity</h2>
                <p className="text-sm text-[#9ca3af]">Latest email subscriber events and preference changes.</p>
              </div>

              <div className="mt-6 space-y-3">
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#3a3a3a] px-4 py-8 text-center">
                    <p className="text-base font-medium text-white">No recent events</p>
                    <p className="mt-2 text-sm text-[#9ca3af]">
                      Preference updates, unsubscribes, and lifecycle subscriber events will appear here.
                    </p>
                  </div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-[#3a3a3a] bg-[#242424] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">{event.event_type}</p>
                          <p className="text-sm text-[#c7c7c7]">{eventSubscriberEmail(event.subscriber)}</p>
                        </div>
                        <p className="text-xs text-[#8e8ea0]">{formatDateTime(event.created_at)}</p>
                      </div>
                      <p className="mt-3 text-xs leading-6 text-[#9ca3af]">{formatMetadataPreview(event.metadata)}</p>
                      {event.metadata && Object.keys(event.metadata).length > 0 ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs text-[#8ea2c0] hover:text-white">View full metadata</summary>
                          <pre className="mt-3 overflow-x-auto rounded-xl border border-[#3a3a3a] bg-[#1e1e1e] p-3 text-[11px] leading-5 text-[#c7d2fe]">
                            {formatMetadataFull(event.metadata)}
                          </pre>
                        </details>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
