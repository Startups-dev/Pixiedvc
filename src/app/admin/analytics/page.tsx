import { requireAdminUser } from "@/lib/admin";
import { getAnalyticsOverview } from "@/lib/analytics/server";
import AdminSubnav from "../AdminSubnav";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDuration(seconds: number) {
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) return `${remainingSeconds}s`;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function SummaryCard(props: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{props.label}</p>
      <div className="mt-3 text-3xl font-semibold text-slate-50">{props.value}</div>
      <p className="mt-2 text-sm text-slate-400">{props.hint}</p>
    </div>
  );
}

function TopList(props: { title: string; rows: Array<{ label: string; count: number }>; emptyLabel: string }) {
  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
      <div className="mt-4 space-y-3">
        {props.rows.length === 0 ? (
          <p className="text-sm text-slate-400">{props.emptyLabel}</p>
        ) : (
          props.rows.map((row) => (
            <div key={`${props.title}-${row.label}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
              <div className="min-w-0 text-sm text-slate-300">{row.label}</div>
              <div className="shrink-0 text-sm font-semibold text-slate-100">{numberFormatter.format(row.count)}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdminUser("/admin/analytics");
  const overview = await getAnalyticsOverview();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.5),_rgba(2,6,23,0.95)_50%)] text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
        <AdminSubnav current="analytics" />
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Admin · Analytics</p>
          <h1 className="text-3xl font-semibold text-slate-50">Visitor Analytics</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            Anonymous first-party session and traffic reporting for public PixieDVC pages only.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Visitors Today"
            value={numberFormatter.format(overview.metrics.visitorsToday)}
            hint="Unique anonymous visitors"
          />
          <SummaryCard
            label="Visitors This Week"
            value={numberFormatter.format(overview.metrics.visitorsWeek)}
            hint="Monday through today"
          />
          <SummaryCard
            label="Visitors This Month"
            value={numberFormatter.format(overview.metrics.visitorsMonth)}
            hint="Current month to date"
          />
          <SummaryCard
            label="Avg Session Duration"
            value={formatDuration(overview.metrics.averageSessionDurationSeconds)}
            hint="Trailing 30-day average"
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Pageviews Today"
            value={numberFormatter.format(overview.metrics.pageviewsToday)}
            hint="All tracked public routes"
          />
          <SummaryCard
            label="Pageviews This Week"
            value={numberFormatter.format(overview.metrics.pageviewsWeek)}
            hint="Monday through today"
          />
          <SummaryCard
            label="Pageviews This Month"
            value={numberFormatter.format(overview.metrics.pageviewsMonth)}
            hint="Current month to date"
          />
          <SummaryCard
            label="Recent Sessions"
            value={numberFormatter.format(overview.recentSessions.length)}
            hint="Most recent rows shown below"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <TopList title="Top Pages" rows={overview.topPages} emptyLabel="No pageviews yet." />
          <TopList title="Top Referrers" rows={overview.topReferrers} emptyLabel="No external referrers yet." />
          <TopList title="Top UTM Sources" rows={overview.topUtmSources} emptyLabel="No UTM-tagged sessions yet." />
        </section>

        <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Recent Sessions</h2>
              <p className="mt-1 text-sm text-slate-400">Latest anonymous sessions across tracked public pages.</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Started</th>
                  <th className="px-3 py-3">Visitor</th>
                  <th className="px-3 py-3">Route Flow</th>
                  <th className="px-3 py-3">Referrer / UTM</th>
                  <th className="px-3 py-3">Device</th>
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {overview.recentSessions.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-slate-400" colSpan={7}>
                      No sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  overview.recentSessions.map((session) => (
                    <tr key={session.id} className="align-top text-slate-300">
                      <td className="px-3 py-4">
                        <div>{dateTimeFormatter.format(new Date(session.startedAt))}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          Last seen {dateTimeFormatter.format(new Date(session.lastSeenAt))}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="font-medium text-slate-100">{session.visitorId.slice(0, 8)}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.sessionId.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div>{session.landingPagePath}</div>
                        <div className="mt-1 text-xs text-slate-500">Exit {session.exitPagePath}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="truncate">{session.referrer ?? "Direct"}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.utmSource ?? "No UTM source"}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div>{session.deviceType}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.browser}</div>
                      </td>
                      <td className="px-3 py-4">
                        <div>{session.country ?? "Unknown"}</div>
                        <div className="mt-1 text-xs text-slate-500">{session.city ?? "Unknown city"}</div>
                      </td>
                      <td className="px-3 py-4 font-medium text-slate-100">
                        {formatDuration(session.sessionDurationSeconds)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
