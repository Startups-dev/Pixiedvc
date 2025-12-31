import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import { createServer } from "@/lib/supabase";
import {
  buildSixMonthPayoutSeries,
  getAffiliateDashboardMetrics,
  getAffiliateForUser,
  getAffiliatePayouts,
  getAffiliateRecentConversions,
} from "@/lib/affiliates";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default async function AffiliateDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServer(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/affiliate/login?redirect=/affiliate/dashboard");
  }

  const affiliate = await getAffiliateForUser(user.id);
  if (!affiliate) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Affiliate Portal</p>
          <h1 className="font-display text-3xl text-ink">Profile not found</h1>
          <p className="text-sm text-muted">
            We could not find an affiliate profile linked to this email. Reach out to concierge and we will get you set up.
          </p>
          <Button asChild variant="ghost">
            <Link href="/contact">Talk to Concierge</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const [metrics, conversions, payouts] = await Promise.all([
    getAffiliateDashboardMetrics(affiliate.id),
    getAffiliateRecentConversions(affiliate.id),
    getAffiliatePayouts(affiliate.id),
  ]);

  const payoutSeries = buildSixMonthPayoutSeries(payouts);
  const maxPayout = Math.max(1, ...payoutSeries.map((entry) => entry.total));
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const referralLink = baseUrl ? `${baseUrl}/?ref=${affiliate.id}` : `/?ref=${affiliate.id}`;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Affiliate Dashboard</p>
          <h1 className="font-display text-4xl text-ink">Welcome back, {affiliate.displayName}</h1>
          <p className="text-sm text-muted">
            Your referral link:{" "}
            <span className="font-semibold text-ink">{referralLink}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link href="/affiliate/guides">Guides</Link>
          </Button>
          <Button asChild>
            <Link href={`/calculator?ref=${affiliate.id}`}>Share the calculator</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-4">
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Tracked clicks</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{metrics.clicks}</p>
          <p className="text-xs text-muted">Last 30 days</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Leads</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{metrics.leads}</p>
          <p className="text-xs text-muted">Submitted requests</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Conversions</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{metrics.conversions}</p>
          <p className="text-xs text-muted">Confirmed bookings</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Pending earnings</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{formatCurrency(metrics.pendingEarnings)}</p>
          <p className="text-xs text-muted">Awaiting approval</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Payouts</p>
            <h2 className="font-display text-2xl text-ink">Last six months</h2>
          </div>
          <div className="flex items-end gap-4">
            {payoutSeries.map((entry) => (
              <div key={entry.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-full bg-slate-100">
                  <div
                    className="rounded-full bg-brand"
                    style={{ height: `${Math.max(12, (entry.total / maxPayout) * 120)}px` }}
                    aria-hidden
                  />
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-muted">{entry.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Earnings</p>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Approved</span>
              <span className="font-semibold text-ink">{formatCurrency(metrics.approvedEarnings)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Paid</span>
              <span className="font-semibold text-ink">{formatCurrency(metrics.paidEarnings)}</span>
            </div>
            <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              Commission tier: {(affiliate.commissionRate * 100).toFixed(0)}% · Status: {affiliate.status}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Recent conversions</p>
              <h2 className="font-display text-2xl text-ink">Latest bookings</h2>
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-muted">No guest PII</span>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            {conversions.length === 0 ? (
              <p>No confirmed bookings yet.</p>
            ) : (
              conversions.map((conversion) => (
                <div key={conversion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-100 p-3">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {conversion.confirmed_at ? new Date(conversion.confirmed_at).toLocaleDateString() : "Pending"}
                    </p>
                    <p className="font-semibold text-ink">
                      {conversion.booking_amount_usd ? formatCurrency(conversion.booking_amount_usd) : "Booking total pending"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Commission {Math.round(conversion.commission_rate * 100)}%
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                    {conversion.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Payout history</p>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted">No payouts yet.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              {payouts.map((payout) => (
                <div key={payout.id} className="rounded-2xl border border-slate-100 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {new Date(payout.period_start).toLocaleDateString()} – {new Date(payout.period_end).toLocaleDateString()}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{formatCurrency(Number(payout.total_amount_usd ?? 0))}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
