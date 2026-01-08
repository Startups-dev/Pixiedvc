import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getAffiliateForUser,
  getAffiliatePayoutHistory,
  getAffiliatePayoutSummary,
} from "@/lib/affiliates";
import AffiliatePayoutEmailForm from "@/components/affiliate/PayoutEmailForm";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default async function AffiliateDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
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

  const [summary, payouts] = await Promise.all([
    getAffiliatePayoutSummary(affiliate.id),
    getAffiliatePayoutHistory(affiliate.id),
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const referralLink = baseUrl ? `${baseUrl}/?ref=${affiliate.slug}` : `/?ref=${affiliate.slug}`;

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
            <Link href={`/calculator?ref=${affiliate.slug}`}>Share the calculator</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Pending owed</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{formatCurrency(summary.pendingOwed)}</p>
          <p className="text-xs text-muted">Scheduled, unpaid commissions</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Last paid</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{formatCurrency(summary.lastPaidAmount)}</p>
          <p className="text-xs text-muted">
            {summary.lastPaidAt ? `Paid ${new Date(summary.lastPaidAt).toLocaleDateString()}` : "No payouts yet"}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Payout cadence</p>
          <p className="mt-3 text-xl font-semibold text-ink">Manual, monthly</p>
          <p className="text-xs text-muted">We review and send payouts manually.</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Payout email</p>
          <AffiliatePayoutEmailForm initialEmail={affiliate.payoutEmail} />
          <p className="text-xs text-muted">We send PayPal/Wise payouts to this address.</p>
        </Card>

        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Commission tier</p>
          <div className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <span>Rate</span>
              <span className="font-semibold text-ink">{(affiliate.commissionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="font-semibold text-ink">{affiliate.status}</span>
            </div>
            <div className="mt-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-500">
              Payouts are processed manually on a monthly schedule.
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Payout history</p>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted">No payouts yet.</p>
          ) : (
            <div className="space-y-3 text-sm text-slate-600">
              {payouts.map((payout) => {
                const run = payout.payout_run;
                const periodLabel = run
                  ? `${new Date(run.period_start).toLocaleDateString()} – ${new Date(run.period_end).toLocaleDateString()}`
                  : new Date(payout.created_at).toLocaleDateString();

                return (
                  <div key={payout.id} className="rounded-2xl border border-slate-100 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{periodLabel}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{formatCurrency(Number(payout.amount_usd ?? 0))}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {payout.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
