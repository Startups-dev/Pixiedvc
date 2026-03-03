import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import {
  getAffiliateForUser,
  getAffiliatePayoutHistory,
  getAffiliatePayoutSummary,
} from "@/lib/affiliates";
import { requireAffiliateUser } from "@/lib/role-guards";
import AffiliatePayoutEmailForm from "@/components/affiliate/PayoutEmailForm";
import {
  affiliateCard,
  affiliateCard2,
  affiliateLink,
  affiliatePrimaryButton,
  affiliateSecondaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default async function AffiliateDashboardPage() {
  const { user } = await requireAffiliateUser("/affiliate/dashboard");

  const affiliate = await getAffiliateForUser(user.id, user.email);
  if (!affiliate) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <Card surface="dark" className={`space-y-4 ${affiliateCard}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Portal</p>
          <h1 className="font-display text-3xl text-slate-500">Profile not found</h1>
          <p className={`text-sm ${affiliateTextMuted}`}>
            We couldn’t find an affiliate profile linked to this email yet. Our concierge team can help get you set up.
          </p>
          <div className="space-y-2">
            <Button asChild variant="ghost" className={affiliateSecondaryButton}>
              <Link href="/contact">Talk to Concierge</Link>
            </Button>
            <Link href="/" className={`block text-xs font-semibold ${affiliateLink}`}>
              Back to PixieDVC
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const [summary, payouts] = await Promise.all([
    getAffiliatePayoutSummary(affiliate.id),
    getAffiliatePayoutHistory(affiliate.id),
  ]);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  const referralLink = baseUrl ? `${baseUrl}/r/${affiliate.slug}` : `/r/${affiliate.slug}`;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-16">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-2">
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Dashboard</p>
          <h1 className="font-display text-4xl text-slate-500">Welcome back, {affiliate.displayName}</h1>
          <p className={`text-sm ${affiliateTextMuted}`}>
            Your referral link:{" "}
            <span className="font-semibold text-slate-500">{referralLink}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="ghost" className={affiliateSecondaryButton}>
            <Link href="/affiliate/resources">Resources</Link>
          </Button>
          <Button asChild variant="ghost" className={affiliateSecondaryButton}>
            <Link href="/affiliate/guides">Guides</Link>
          </Button>
          <Button asChild className={affiliatePrimaryButton}>
            <Link href={`/calculator?ref=${affiliate.slug}`}>Share the calculator</Link>
          </Button>
        </div>
      </header>

      {affiliate.status === "pending_review" ? (
        <Card surface="dark" className={`${affiliateCard2} border-[#D4AF37]/30`}>
          <p className="text-sm font-semibold text-[#D4AF37]">
            Your account is active. Our team may review your promotional channels to ensure alignment with PixieDVC
            standards.
          </p>
        </Card>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        <Card surface="dark" className={affiliateCard}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Pending owed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-500">{formatCurrency(summary.pendingOwed)}</p>
          <p className={`text-xs ${affiliateTextMuted}`}>Scheduled, unpaid commissions</p>
        </Card>
        <Card surface="dark" className={affiliateCard}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Last paid</p>
          <p className="mt-3 text-3xl font-semibold text-slate-500">{formatCurrency(summary.lastPaidAmount)}</p>
          <p className={`text-xs ${affiliateTextMuted}`}>
            {summary.lastPaidAt ? `Paid ${new Date(summary.lastPaidAt).toLocaleDateString()}` : "No payouts yet"}
          </p>
        </Card>
        <Card surface="dark" className={affiliateCard}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Payout cadence</p>
          <p className="mt-3 text-xl font-semibold text-slate-500">Manual, monthly</p>
          <p className={`text-xs ${affiliateTextMuted}`}>We review and send payouts manually.</p>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card surface="dark" className={`space-y-4 ${affiliateCard}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Payout email</p>
          <AffiliatePayoutEmailForm initialEmail={affiliate.payoutEmail} />
          <p className={`text-xs ${affiliateTextMuted}`}>We send PayPal/Wise payouts to this address.</p>
        </Card>

        <Card surface="dark" className={`space-y-4 ${affiliateCard}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Commission tier</p>
          <div className={`space-y-2 text-sm ${affiliateTextMuted}`}>
            <div className="flex items-center justify-between">
              <span>Rate</span>
              <span className="font-semibold text-slate-500">{(affiliate.commissionRate * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status</span>
              <span className="font-semibold text-slate-500">{affiliate.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Tier</span>
              <span className="font-semibold text-slate-500">{affiliate.tier}</span>
            </div>
            <div className={`mt-2 rounded-2xl p-4 text-xs ${affiliateCard2} ${affiliateTextMuted}`}>
              Payouts are processed manually on a monthly schedule.
            </div>
            {affiliate.tier === "elite" ? (
              <div className="mt-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4 text-xs text-sky-200">
                Elite Partner unlocked: 8% commission tier, verified partner benefits, featured partner potential, and
                early promotion access.
              </div>
            ) : affiliate.tier === "verified" ? (
              <div className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-xs text-emerald-300">
                Verified Partner unlocked: badge eligibility, future higher commission tiers, featured partner
                potential, and early promotion access.
              </div>
            ) : (
              <div className={`mt-2 rounded-2xl p-4 text-xs ${affiliateCard2} ${affiliateTextMuted}`}>
                Basic tier includes 6% commission and standard dashboard access.
              </div>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card surface="dark" className={`space-y-4 ${affiliateCard}`}>
          <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Payout history</p>
          {payouts.length === 0 ? (
            <p className={`text-sm ${affiliateTextMuted}`}>No payouts yet.</p>
          ) : (
            <div className={`space-y-3 text-sm ${affiliateTextMuted}`}>
              {payouts.map((payout) => {
                const run = payout.payout_run;
                const periodLabel = run
                  ? `${new Date(run.period_start).toLocaleDateString()} – ${new Date(run.period_end).toLocaleDateString()}`
                  : new Date(payout.created_at).toLocaleDateString();

                return (
                  <div key={payout.id} className={`rounded-2xl p-3 ${affiliateCard2}`}>
                    <p className={`text-xs uppercase tracking-[0.2em] ${affiliateTextMuted}`}>{periodLabel}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-slate-500">{formatCurrency(Number(payout.amount_usd ?? 0))}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
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
