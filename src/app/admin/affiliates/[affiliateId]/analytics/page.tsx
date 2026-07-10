import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { requireAdminUser } from "@/lib/admin";
import {
  getAffiliateAnalyticsDetail,
  resolveAffiliateAnalyticsDateRange,
} from "@/lib/affiliate-analytics";
import AdminSubnav from "@/app/admin/AdminSubnav";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const numberFormatter = new Intl.NumberFormat("en-US");
const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const analyticsTimeZone = process.env.APP_TIMEZONE || "America/New_York";
const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: analyticsTimeZone });
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: analyticsTimeZone });

function getParam(searchParams: SearchParams, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(affiliateId: string, params: SearchParams, updates: Record<string, string | undefined>) {
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
  return query ? `/admin/affiliates/${affiliateId}/analytics?${query}` : `/admin/affiliates/${affiliateId}/analytics`;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return currencyFormatter.format(value);
}

function formatRate(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return percentFormatter.format(Number.isFinite(parsed) ? parsed : 0);
}

function MetricCard(props: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-5 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{props.label}</p>
      <div className="mt-3 text-3xl font-semibold text-slate-50">{props.value}</div>
      <p className="mt-2 text-sm text-slate-400">{props.hint}</p>
    </div>
  );
}

function SectionCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-700/60 bg-slate-900/70 p-6">
      <h2 className="text-lg font-semibold text-slate-100">{props.title}</h2>
      {props.subtitle ? <p className="mt-1 text-sm text-slate-400">{props.subtitle}</p> : null}
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

function DateRangeControls({
  affiliateId,
  searchParams,
  active,
}: {
  affiliateId: string;
  searchParams: SearchParams;
  active: string;
}) {
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
          href={buildHref(affiliateId, searchParams, { range: range.key, start: undefined, end: undefined })}
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

function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td className="px-3 py-6 text-sm text-slate-400" colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

function TrafficTable({
  rows,
  label,
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
  label: string;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
          <tr>
            <th className="px-3 py-3">{label}</th>
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
              <tr key={`${label}-${row.label}`} className="text-slate-300">
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

export default async function AdminAffiliateAnalyticsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ affiliateId: string }>;
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const { affiliateId } = await params;
  await requireAdminUser(`/admin/affiliates/${affiliateId}/analytics`);
  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams;
  const range = resolveAffiliateAnalyticsDateRange({
    range: getParam(resolvedSearchParams, "range"),
    start: getParam(resolvedSearchParams, "start"),
    end: getParam(resolvedSearchParams, "end"),
  });
  const detail = await getAffiliateAnalyticsDetail({
    affiliateId,
    startDate: range.startDate,
    endDate: range.endDate,
    range,
  });

  if (!detail) notFound();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.5),_rgba(2,6,23,0.95)_50%)] text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12">
        <AdminSubnav current="affiliates" />
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Link href="/admin/analytics?tab=affiliates" className="text-xs uppercase tracking-[0.3em] text-slate-400 hover:text-slate-100">
              Admin · Affiliate Analytics
            </Link>
            <h1 className="text-3xl font-semibold text-slate-50">{detail.affiliate.display_name ?? "Affiliate"}</h1>
            <p className="max-w-3xl text-sm text-slate-400">
              Status {detail.affiliate.status ?? "unknown"} · Tier {detail.affiliate.tier ?? "unknown"} · Commission{" "}
              {formatRate(detail.affiliate.commission_rate)}
            </p>
            <p className="break-all text-sm text-[#d6b45a]">{detail.affiliate.referralUrl}</p>
          </div>
          <DateRangeControls affiliateId={affiliateId} searchParams={resolvedSearchParams} active={range.key} />
        </header>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Showing {range.label}: {dateFormatter.format(range.startDate)} → {dateFormatter.format(range.endDate)}
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Clicks" value={numberFormatter.format(detail.metrics.clicks)} hint="Affiliate link clicks" />
          <MetricCard label="Unique Visitors" value={numberFormatter.format(detail.metrics.uniqueVisitors)} hint="Distinct affiliate visitors" />
          <MetricCard label="Pageviews" value={numberFormatter.format(detail.metrics.pageviews)} hint="Tracked pages in referred sessions" />
          <MetricCard label="Booking Requests" value={numberFormatter.format(detail.metrics.bookingRequests)} hint="Attributed booking requests" />
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Confirmed Conversions" value={numberFormatter.format(detail.metrics.confirmedConversions)} hint="Pending, approved, or paid conversions" />
          <MetricCard label="Booking Value" value={formatMoney(detail.metrics.bookingValue)} hint="Payable/non-void conversion value" />
          <MetricCard label="Commission Earned" value={formatMoney(detail.metrics.commissionEarned)} hint="Payable/non-void commission" />
          <MetricCard label="Paid" value={formatMoney(detail.metrics.paid)} hint="Paid payout items" />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Traffic Sources" subtitle="Grouped by UTM source first, then referrer domain or Unknown.">
            <TrafficTable rows={detail.trafficSources} label="Source" empty="No affiliate traffic sources in this period." />
          </SectionCard>
          <SectionCard title="Top Landing Pages" subtitle="Affiliate landing paths and downstream outcomes.">
            <TrafficTable rows={detail.landingPages} label="Landing Path" empty="No affiliate landing pages in this period." />
          </SectionCard>
        </section>

        <SectionCard title="UTM Campaigns" subtitle="Campaign, source, and medium where UTM values exist.">
          <TrafficTable rows={detail.utmCampaigns} label="Campaign" empty="No UTM campaigns in this period." />
        </SectionCard>

        <SectionCard title="Recent Attributed Booking Activity" subtitle="Safe request-level fields only. Guest PII is intentionally excluded.">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Request</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Stay</th>
                  <th className="px-3 py-3">Resort / Room</th>
                  <th className="px-3 py-3">Attribution</th>
                  <th className="px-3 py-3">Conversion</th>
                  <th className="px-3 py-3">Value</th>
                  <th className="px-3 py-3">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {detail.recentBookingActivity.length === 0 ? (
                  <EmptyRow colSpan={8}>No attributed booking requests yet.</EmptyRow>
                ) : (
                  detail.recentBookingActivity.map((row) => (
                    <tr key={row.id} className="text-slate-300">
                      <td className="px-3 py-4">
                        <Link href={`/admin/requests/${row.id}`} className="font-medium text-slate-100 hover:text-[#d6b45a]">
                          {row.id.slice(0, 8)}
                        </Link>
                        <div className="mt-1 text-xs text-slate-500">{row.status ?? "unknown"}</div>
                      </td>
                      <td className="px-3 py-4">{dateTimeFormatter.format(new Date(row.createdAt))}</td>
                      <td className="px-3 py-4">
                        {row.checkIn || row.checkOut ? `${row.checkIn ?? "?"} → ${row.checkOut ?? "?"}` : "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div>{row.resortName ?? "Unknown"}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.roomType ?? "Room unknown"}</div>
                      </td>
                      <td className="px-3 py-4">{row.attributionSource}</td>
                      <td className="px-3 py-4">{row.conversionStatus ?? "No conversion"}</td>
                      <td className="px-3 py-4">{formatMoney(row.bookingAmount)}</td>
                      <td className="px-3 py-4">{formatMoney(row.commissionAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Payout History" subtitle="Audit ledger items and payout run context. Sensitive payment notes are not shown here.">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Payout Item</th>
                  <th className="px-3 py-3">Conversion</th>
                  <th className="px-3 py-3">Request</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Run Period</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/80">
                {detail.payoutHistory.length === 0 ? (
                  <EmptyRow colSpan={8}>No payout activity in this period.</EmptyRow>
                ) : (
                  detail.payoutHistory.map((row) => (
                    <tr key={row.id} className="text-slate-300">
                      <td className="px-3 py-4 font-medium text-slate-100">{row.id.slice(0, 8)}</td>
                      <td className="px-3 py-4">{row.conversionId ? row.conversionId.slice(0, 8) : "—"}</td>
                      <td className="px-3 py-4">
                        {row.bookingRequestId ? (
                          <Link href={`/admin/requests/${row.bookingRequestId}`} className="text-slate-100 hover:text-[#d6b45a]">
                            {row.bookingRequestId.slice(0, 8)}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-4">{formatMoney(row.amount)}</td>
                      <td className="px-3 py-4">{row.status}</td>
                      <td className="px-3 py-4">
                        {row.periodStart || row.periodEnd ? `${row.periodStart ?? "?"} → ${row.periodEnd ?? "?"}` : "—"}
                      </td>
                      <td className="px-3 py-4">
                        <div>{row.paymentMethod ?? "—"}</div>
                        <div className="mt-1 text-xs text-slate-500">{row.paymentReference ?? "No reference"}</div>
                        {row.paidAt ? <div className="mt-1 text-xs text-slate-500">Paid {dateTimeFormatter.format(new Date(row.paidAt))}</div> : null}
                      </td>
                      <td className="px-3 py-4">
                        {[row.adjusted ? "Adjusted" : null, row.voided ? "Voided" : null].filter(Boolean).join(" · ") || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
