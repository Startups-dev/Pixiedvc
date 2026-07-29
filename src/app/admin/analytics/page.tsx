import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdminUser } from "@/lib/admin";
import { getAnalyticsOverview } from "@/lib/analytics/server";
import {
  type AffiliateLeaderboardSort,
  resolveAffiliateAnalyticsDateRange,
  getAdminAffiliateAnalyticsOverview,
} from "@/lib/affiliate-analytics";
import AdminSubnav from "../AdminSubnav";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;
type AnalyticsTab = "overview" | "traffic" | "affiliates" | "revenue";

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const analyticsTimeZone = process.env.APP_TIMEZONE || "America/New_York";
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: analyticsTimeZone,
});

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(params: SearchParams, updates: Record<string, string | undefined>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const stringValue = Array.isArray(value) ? value[0] : value;
    if (stringValue) next.set(key, stringValue);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/admin/analytics?${query}` : "/admin/analytics";
}

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

function formatMoney(value: number) {
  return currencyFormatter.format(value);
}

function formatRate(value: number | null) {
  return value === null ? "—" : percentFormatter.format(value);
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

function SectionCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
        {props.subtitle ? <p className="mt-1 text-sm text-slate-400">{props.subtitle}</p> : null}
      </div>
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

function EmptyRow(props: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td className="px-3 py-6 text-sm text-slate-400" colSpan={props.colSpan}>
        {props.children}
      </td>
    </tr>
  );
}

function AnalyticsTabs({ current, searchParams }: { current: AnalyticsTab; searchParams: SearchParams }) {
  const tabs: Array<{ key: AnalyticsTab; label: string }> = [
    { key: "overview", label: "Overview" },
    { key: "traffic", label: "Traffic" },
    { key: "affiliates", label: "Affiliates" },
    { key: "revenue", label: "Revenue & Payouts" },
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-full border border-slate-700/60 bg-slate-950/50 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={buildHref(searchParams, { tab: tab.key })}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            current === tab.key ? "bg-[#d6b45a] text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function DateRangeControls({ searchParams, active }: { searchParams: SearchParams; active: string }) {
  const ranges = [
    { key: "today", label: "Today" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "month", label: "This Month" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ranges.map((range) => (
        <Link
          key={range.key}
          href={buildHref(searchParams, { range: range.key, start: undefined, end: undefined })}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition ${
            active === range.key
              ? "border-[#d6b45a]/50 bg-[#d6b45a]/10 text-[#d6b45a]"
              : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
          }`}
        >
          {range.label}
        </Link>
      ))}
    </div>
  );
}

function FunnelTable({ funnel }: { funnel: Array<{ label: string; count: number; priorRate: number | null; clickRate: number | null }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Stage</th>
            <th className="px-3 py-3">Count</th>
            <th className="px-3 py-3">From Prior</th>
            <th className="px-3 py-3">From Clicks</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/80">
          {funnel.map((stage) => (
            <tr key={stage.label} className="text-slate-300">
              <td className="px-3 py-4 font-medium text-slate-100">{stage.label}</td>
              <td className="px-3 py-4">{numberFormatter.format(stage.count)}</td>
              <td className="px-3 py-4">{formatRate(stage.priorRate)}</td>
              <td className="px-3 py-4">{formatRate(stage.clickRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrafficBreakdownTable({
  rows,
  labelHeader = "Source",
  empty,
}: {
  rows: Array<{
    label: string;
    source?: string;
    medium?: string;
    campaign?: string;
    clicks: number;
    uniqueVisitors: number;
    bookingRequests: number;
    conversions: number;
    bookingValue: number;
    commissionEarned: number;
  }>;
  labelHeader?: string;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-3 py-3">{labelHeader}</th>
            <th className="px-3 py-3">Clicks</th>
            <th className="px-3 py-3">Visitors</th>
            <th className="px-3 py-3">Requests</th>
            <th className="px-3 py-3">Conversions</th>
            <th className="px-3 py-3">Booking Value</th>
            <th className="px-3 py-3">Commission</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/80">
          {rows.length === 0 ? (
            <EmptyRow colSpan={7}>{empty}</EmptyRow>
          ) : (
            rows.map((row) => (
              <tr key={`${labelHeader}-${row.label}`} className="text-slate-300">
                <td className="px-3 py-4">
                  <div className="font-medium text-slate-100">{row.label}</div>
                  {row.campaign || row.source || row.medium ? (
                    <div className="mt-1 text-xs text-slate-500">
                      {[row.campaign, row.source, row.medium].filter(Boolean).join(" · ")}
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-4">{numberFormatter.format(row.clicks)}</td>
                <td className="px-3 py-4">{numberFormatter.format(row.uniqueVisitors)}</td>
                <td className="px-3 py-4">{numberFormatter.format(row.bookingRequests)}</td>
                <td className="px-3 py-4">{numberFormatter.format(row.conversions)}</td>
                <td className="px-3 py-4">{formatMoney(row.bookingValue)}</td>
                <td className="px-3 py-4">{formatMoney(row.commissionEarned)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Leaderboard({
  rows,
  sortBy,
  searchParams,
}: {
  rows: Array<{
    affiliateId: string;
    affiliateName: string;
    status: string;
    clicks: number;
    uniqueVisitors: number;
    bookingRequests: number;
    confirmedConversions: number;
    clickToRequestRate: number | null;
    requestToConversionRate: number | null;
    bookingValue: number;
    commissionEarned: number;
    pendingPayout: number;
    paid: number;
  }>;
  sortBy: AffiliateLeaderboardSort;
  searchParams: SearchParams;
}) {
  const sorts: Array<{ key: AffiliateLeaderboardSort; label: string }> = [
    { key: "booking_value", label: "Booking Value" },
    { key: "confirmed_conversions", label: "Confirmed Conversions" },
    { key: "commission_earned", label: "Commission Earned" },
    { key: "clicks", label: "Clicks" },
    { key: "conversion_rate", label: "Conversion Rate" },
  ];
  const detailQuery = new URLSearchParams();
  for (const key of ["range", "start", "end"]) {
    const value = getParam(searchParams, key);
    if (value) detailQuery.set(key, value);
  }
  const detailSuffix = detailQuery.toString() ? `?${detailQuery.toString()}` : "";

  return (
    <SectionCard title="Affiliate Leaderboard" subtitle="Global affiliate performance for the selected period.">
      <div className="mb-4 flex flex-wrap gap-2">
        {sorts.map((sort) => (
          <Link
            key={sort.key}
            href={buildHref(searchParams, { tab: "affiliates", sort: sort.key })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${
              sortBy === sort.key
                ? "border-[#d6b45a]/50 bg-[#d6b45a]/10 text-[#d6b45a]"
                : "border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200"
            }`}
          >
            {sort.label}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-3 py-3">Affiliate</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Clicks</th>
              <th className="px-3 py-3">Visitors</th>
              <th className="px-3 py-3">Requests</th>
              <th className="px-3 py-3">Conversions</th>
              <th className="px-3 py-3">Click → Request</th>
              <th className="px-3 py-3">Request → Conversion</th>
              <th className="px-3 py-3">Booking Value</th>
              <th className="px-3 py-3">Commission</th>
              <th className="px-3 py-3">Pending</th>
              <th className="px-3 py-3">Paid</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/80">
            {rows.length === 0 ? (
              <EmptyRow colSpan={12}>No affiliate activity in this period.</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.affiliateId} className="text-slate-300">
                  <td className="px-3 py-4">
                    <Link href={`/admin/affiliates/${row.affiliateId}/analytics${detailSuffix}`} className="font-medium text-slate-100 hover:text-[#d6b45a]">
                      {row.affiliateName}
                    </Link>
                  </td>
                  <td className="px-3 py-4">{row.status}</td>
                  <td className="px-3 py-4">{numberFormatter.format(row.clicks)}</td>
                  <td className="px-3 py-4">{numberFormatter.format(row.uniqueVisitors)}</td>
                  <td className="px-3 py-4">{numberFormatter.format(row.bookingRequests)}</td>
                  <td className="px-3 py-4">{numberFormatter.format(row.confirmedConversions)}</td>
                  <td className="px-3 py-4">{formatRate(row.clickToRequestRate)}</td>
                  <td className="px-3 py-4">{formatRate(row.requestToConversionRate)}</td>
                  <td className="px-3 py-4">{formatMoney(row.bookingValue)}</td>
                  <td className="px-3 py-4">{formatMoney(row.commissionEarned)}</td>
                  <td className="px-3 py-4">{formatMoney(row.pendingPayout)}</td>
                  <td className="px-3 py-4">{formatMoney(row.paid)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  await requireAdminUser("/admin/analytics");
  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  const tabParam = getParam(resolvedSearchParams, "tab");
  const currentTab: AnalyticsTab =
    tabParam === "traffic" || tabParam === "affiliates" || tabParam === "revenue" ? tabParam : "overview";
  const sortParam = getParam(resolvedSearchParams, "sort");
  const sortBy: AffiliateLeaderboardSort =
    sortParam === "confirmed_conversions" ||
    sortParam === "commission_earned" ||
    sortParam === "clicks" ||
    sortParam === "conversion_rate"
      ? sortParam
      : "booking_value";
  const range = resolveAffiliateAnalyticsDateRange({
    range: getParam(resolvedSearchParams, "range"),
    start: getParam(resolvedSearchParams, "start"),
    end: getParam(resolvedSearchParams, "end"),
  });
  const [visitorOverview, affiliateOverview] = await Promise.all([
    getAnalyticsOverview(),
    getAdminAffiliateAnalyticsOverview({ startDate: range.startDate, endDate: range.endDate, range, sortBy }),
  ]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.5),_rgba(2,6,23,0.95)_50%)] text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
        <AdminSubnav current="analytics" />
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Admin · Analytics</p>
          <h1 className="text-3xl font-semibold text-slate-50">Analytics</h1>
          <p className="max-w-3xl text-sm text-slate-400">
            First-party traffic, affiliate attribution, conversion, and payout reporting for HannaDVC.
          </p>
        </header>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <AnalyticsTabs current={currentTab} searchParams={resolvedSearchParams} />
          <DateRangeControls searchParams={resolvedSearchParams} active={range.key} />
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Affiliate metrics shown for <span className="font-semibold text-slate-200">{range.label}</span>. Visitor analytics summary cards retain
          their existing today / trailing 7 days / month definitions.
        </div>

        {currentTab === "overview" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Unique Visitors" value={numberFormatter.format(affiliateOverview.metrics.uniqueVisitors)} hint="Distinct affiliate visitors in selected period" />
              <SummaryCard label="Affiliate Clicks" value={numberFormatter.format(affiliateOverview.metrics.affiliateClicks)} hint="Affiliate link clicks captured" />
              <SummaryCard label="Attributed Booking Requests" value={numberFormatter.format(affiliateOverview.metrics.attributedBookingRequests)} hint="Requests carrying affiliate attribution" />
              <SummaryCard label="Confirmed Conversions" value={numberFormatter.format(affiliateOverview.metrics.confirmedConversions)} hint="Pending, approved, or paid canonical conversions" />
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Attributed Booking Value" value={formatMoney(affiliateOverview.metrics.attributedBookingValue)} hint="Payable/non-void conversion value" />
              <SummaryCard label="Affiliate Commission Earned" value={formatMoney(affiliateOverview.metrics.commissionEarned)} hint="Payable/non-void commission amount" />
              <SummaryCard label="Pending Payouts" value={formatMoney(affiliateOverview.metrics.pendingPayouts)} hint="Pending, scheduled, or processing payout items" />
              <SummaryCard label="Paid Payouts" value={formatMoney(affiliateOverview.metrics.paidPayouts)} hint="Paid payout items in selected period" />
            </section>
            <SectionCard title="Affiliate Funnel" subtitle="Canonical progression from referral click to paid conversion.">
              <FunnelTable funnel={affiliateOverview.funnel} />
            </SectionCard>
          </>
        ) : null}

        {currentTab === "traffic" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Visitors Today" value={numberFormatter.format(visitorOverview.metrics.visitorsToday)} hint="Unique anonymous visitors" />
              <SummaryCard label="Visitors Last 7 Days" value={numberFormatter.format(visitorOverview.metrics.visitorsWeek)} hint="Trailing 7 days" />
              <SummaryCard label="Visitors This Month" value={numberFormatter.format(visitorOverview.metrics.visitorsMonth)} hint="Current month to date" />
              <SummaryCard label="Avg Session Duration" value={formatDuration(visitorOverview.metrics.averageSessionDurationSeconds)} hint="Trailing 30-day average" />
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Affiliate Visitors" value={numberFormatter.format(affiliateOverview.metrics.affiliateVisitors)} hint="Selected period affiliate visitors" />
              <SummaryCard label="Non-Affiliate Visitors" value={numberFormatter.format(affiliateOverview.metrics.nonAffiliateVisitors)} hint="Visitor sessions without affiliate click identity" />
              <SummaryCard label="Pageviews Today" value={numberFormatter.format(visitorOverview.metrics.pageviewsToday)} hint="All tracked public routes" />
              <SummaryCard label="Pageviews This Month" value={numberFormatter.format(visitorOverview.metrics.pageviewsMonth)} hint="Current month to date" />
            </section>
            <section className="grid gap-6 xl:grid-cols-3">
              <TopList title="Top Pages" rows={visitorOverview.topPages} emptyLabel="No pageviews yet." />
              <TopList title="Top Referrers" rows={visitorOverview.topReferrers} emptyLabel="No external referrers yet." />
              <TopList title="Top UTM Sources" rows={visitorOverview.topUtmSources} emptyLabel="No UTM-tagged sessions yet." />
            </section>
            <section className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Top Affiliate Landing Pages" subtitle="Affiliate click landing paths and downstream outcomes.">
                <TrafficBreakdownTable rows={affiliateOverview.landingPages} labelHeader="Landing Path" empty="No affiliate landing pages in this period." />
              </SectionCard>
              <SectionCard title="Top Affiliate Sources" subtitle="UTM sources and referrer domains from affiliate traffic.">
                <TrafficBreakdownTable rows={affiliateOverview.trafficSources} empty="No affiliate sources in this period." />
              </SectionCard>
            </section>
            <SectionCard title="Daily Affiliate Activity" subtitle="Clicks, requests, and conversions by day.">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Date</th>
                      <th className="px-3 py-3">Clicks</th>
                      <th className="px-3 py-3">Requests</th>
                      <th className="px-3 py-3">Conversions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/80">
                    {affiliateOverview.dailyTrends.length === 0 ? (
                      <EmptyRow colSpan={4}>No affiliate activity in this period.</EmptyRow>
                    ) : (
                      affiliateOverview.dailyTrends.map((row) => (
                        <tr key={row.date} className="text-slate-300">
                          <td className="px-3 py-4 font-medium text-slate-100">{row.date}</td>
                          <td className="px-3 py-4">{numberFormatter.format(row.clicks)}</td>
                          <td className="px-3 py-4">{numberFormatter.format(row.bookingRequests)}</td>
                          <td className="px-3 py-4">{numberFormatter.format(row.conversions)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
            <SectionCard title="Recent Sessions" subtitle="Latest anonymous sessions across tracked public pages.">
              <div className="overflow-x-auto">
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
                    {visitorOverview.recentSessions.length === 0 ? (
                      <EmptyRow colSpan={7}>No sessions recorded yet.</EmptyRow>
                    ) : (
                      visitorOverview.recentSessions.map((session) => (
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
                          <td className="px-3 py-4 font-medium text-slate-100">{formatDuration(session.sessionDurationSeconds)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentTab === "affiliates" ? (
          <>
            <Leaderboard rows={affiliateOverview.leaderboard} sortBy={sortBy} searchParams={resolvedSearchParams} />
            <section className="grid gap-6 xl:grid-cols-2">
              <SectionCard title="Traffic Sources" subtitle="Where affiliate visitors are coming from.">
                <TrafficBreakdownTable rows={affiliateOverview.trafficSources} empty="No affiliate source data in this period." />
              </SectionCard>
              <SectionCard title="UTM Campaigns" subtitle="Campaign-level attribution where UTM values exist.">
                <TrafficBreakdownTable rows={affiliateOverview.utmCampaigns} labelHeader="Campaign" empty="No UTM campaigns in this period." />
              </SectionCard>
            </section>
          </>
        ) : null}

        {currentTab === "revenue" ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Approved Commission Awaiting Run" value={formatMoney(affiliateOverview.metrics.approvedCommissionAwaitingRun)} hint="Approved conversions not yet included in a payout item" />
              <SummaryCard label="Pending Payout Items" value={formatMoney(affiliateOverview.metrics.pendingPayouts)} hint="Unpaid payout ledger items" />
              <SummaryCard label="Paid This Period" value={formatMoney(affiliateOverview.metrics.paidPayouts)} hint="Paid affiliate payout items" />
              <SummaryCard label="Lifetime Paid" value={formatMoney(affiliateOverview.metrics.lifetimePaid)} hint="All-time paid affiliate payout items" />
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard label="Open Payout Runs" value={numberFormatter.format(affiliateOverview.metrics.openPayoutRuns)} hint="Runs not marked paid or void" />
              <SummaryCard label="Paid Payout Runs" value={numberFormatter.format(affiliateOverview.metrics.paidPayoutRuns)} hint="Runs paid in selected period" />
              <SummaryCard label="Commission Earned" value={formatMoney(affiliateOverview.metrics.commissionEarned)} hint="Payable/non-void conversions" />
              <SummaryCard label="Attributed Booking Value" value={formatMoney(affiliateOverview.metrics.attributedBookingValue)} hint="Payable/non-void conversion value" />
            </section>
            <SectionCard title="Payout Operations" subtitle="Use the dedicated affiliate management screens for review and payout actions.">
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/affiliates" className="rounded-full border border-[#d6b45a]/40 bg-[#d6b45a]/10 px-4 py-2 text-sm font-semibold text-[#d6b45a] hover:bg-[#d6b45a]/20">
                  Affiliate Management
                </Link>
                <Link href="/admin/affiliates/payouts" className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100">
                  Affiliate Payout Runs
                </Link>
              </div>
            </SectionCard>
          </>
        ) : null}
      </div>
    </main>
  );
}
