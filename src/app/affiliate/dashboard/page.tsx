import Link from "next/link";
import { redirect } from "next/navigation";

import AffiliatePayoutEmailForm from "@/components/affiliate/PayoutEmailForm";
import CopyReferralLinkButton from "@/components/affiliate/CopyReferralLinkButton";
import {
  ensureAffiliateForApplicationUser,
  getAffiliateForUser,
  getAffiliatePayoutHistory,
  getAffiliatePayoutSummary,
  isBlockedAffiliateStatus,
} from "@/lib/affiliates";
import { buildAffiliateReferralUrl, getReferralBaseUrl } from "@/lib/affiliate-referrals";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const dashboardCard =
  "rounded-[24px] border border-[#0F2148]/10 bg-white p-6 shadow-[0_14px_40px_rgba(15,33,72,0.06)]";
const dashboardPanel = "rounded-3xl border border-[#0F2148]/10 bg-[#F7F3EA] p-6";
const dashboardSectionHeading = "font-display text-[28px] leading-tight tracking-[-0.02em] text-[#0F2148]";
const dashboardCardHeading = "font-display text-[26px] leading-tight tracking-[-0.02em] text-[#0F2148]";
const dashboardBodyText = "text-[15px] leading-7 text-[#58657A]";
const dashboardSmallText = "text-[13px] leading-5 text-[#58657A]";
const dashboardDivider = "divide-y divide-[#0F2148]/10";
const dashboardPrimaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0F2148] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#173A72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B45A]";
const dashboardGoldButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#D6B45A] px-5 text-sm font-semibold text-[#08152F] transition hover:-translate-y-0.5 hover:bg-[#E4C66E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C66E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08152F]";
const dashboardSecondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#0F2148]/12 bg-white px-4 text-sm font-semibold text-[#0F2148] transition hover:-translate-y-0.5 hover:bg-[#F7F3EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B45A]";
const dashboardNavyTextButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-3 text-sm font-medium text-[#CBD5E1] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Unknown";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function statusChip(status: string) {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "paid" || normalized === "active" || normalized === "approved") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "scheduled" || normalized === "pending" || normalized === "pending_review") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border border-sky-200 bg-sky-50 text-sky-700";
}

function logAffiliateDashboardRedirect(
  branch: string,
  details: {
    userId?: string | null;
    email?: string | null;
    affiliateStatus?: string | null;
  },
) {
  console.info("[affiliate-access]", {
    event: "dashboard_redirect",
    redirectBranch: branch,
    userId: details.userId ?? null,
    normalizedEmail: details.email?.trim().toLowerCase() ?? null,
    existingAffiliateStatus: details.affiliateStatus ?? null,
  });
}

export default async function AffiliateDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/affiliate/login?redirect=${encodeURIComponent("/affiliate/dashboard")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = String(profile?.role ?? "guest").toLowerCase();
  const isAdmin = role === "admin";
  const hasAffiliateRole = role === "affiliate";

  let affiliate = await getAffiliateForUser(user.id, user.email);

  if (!isAdmin) {
    const applicationAccess = await ensureAffiliateForApplicationUser(user.id, user.email, affiliate);
    if (applicationAccess.blocked) {
      logAffiliateDashboardRedirect("application_access_blocked", {
        userId: user.id,
        email: user.email,
        affiliateStatus: affiliate?.status ?? null,
      });
      redirect(`/affiliate/login?redirect=${encodeURIComponent("/affiliate/dashboard")}&error=role`);
    }
    affiliate = applicationAccess.affiliate;
  }

  if (!affiliate && !isAdmin && !hasAffiliateRole) {
    logAffiliateDashboardRedirect("no_affiliate_after_self_heal", {
      userId: user.id,
      email: user.email,
      affiliateStatus: null,
    });
    redirect(`/affiliate/login?redirect=${encodeURIComponent("/affiliate/dashboard")}&error=role`);
  }

  if (affiliate && !isAdmin && isBlockedAffiliateStatus(affiliate.status)) {
    logAffiliateDashboardRedirect("blocked_affiliate_status", {
      userId: user.id,
      email: user.email,
      affiliateStatus: affiliate.status,
    });
    redirect(`/affiliate/login?redirect=${encodeURIComponent("/affiliate/dashboard")}&error=role`);
  }

  if (!affiliate) {
    return (
      <div className="mx-auto max-w-4xl bg-[#F7F3EA] px-6 py-20 text-[#10224A]">
        <section className={`${dashboardCard} space-y-4`}>
          <p className={dashboardSmallText}>Affiliate Portal</p>
          <h1 className={dashboardSectionHeading}>Profile not found</h1>
          <p className={dashboardBodyText}>
            We couldn’t find an affiliate profile linked to this email yet. Our concierge team can help get you set up.
          </p>
          <div className="space-y-2">
            <Link href="/contact" className={dashboardSecondaryButton}>
              Talk to Concierge
            </Link>
            <Link href="/" className="block text-sm font-semibold text-[#0F2148] underline-offset-4 hover:underline">
              Back to PixieDVC
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const [summary, payouts] = await Promise.all([
    getAffiliatePayoutSummary(affiliate.id),
    getAffiliatePayoutHistory(affiliate.id),
  ]);
  const referralLink = buildAffiliateReferralUrl(getReferralBaseUrl(), affiliate.slug);
  const recentPayouts = payouts.slice(0, 6).reverse();
  const payoutAverage =
    payouts.length === 0
      ? 0
      : payouts.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0) / payouts.length;
  const hasAnyEarnings = summary.pendingOwed > 0 || summary.lastPaidAmount > 0 || payoutAverage > 0;
  const attentionLabel = affiliate.payoutEmail ? "Everything is ready" : "Add your payout email";
  const attentionCopy = affiliate.payoutEmail
    ? "Your referral link and payout destination are set."
    : "Add a payout email so future commissions have a destination.";

  return (
    <main className="bg-[#F7F3EA] text-[#10224A]">
      <div className="mx-auto max-w-[1500px] space-y-8 px-6 py-12 lg:px-10">
        <header className="grid gap-8 rounded-[28px] border border-[#0F2148]/10 bg-white p-7 shadow-[0_18px_55px_rgba(15,33,72,0.08)] lg:grid-cols-[minmax(0,1fr)_360px] lg:p-10">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusChip(affiliate.status)}`}>
                {formatLabel(affiliate.status)}
              </span>
              <span className="inline-flex rounded-full border border-[#D6B45A]/30 bg-[#D6B45A]/10 px-3 py-1 text-xs font-semibold text-[#8A6A12]">
                {formatLabel(affiliate.tier)} Partner
              </span>
            </div>
            <div className="max-w-3xl space-y-3">
              <p className="text-[15px] font-medium leading-6 text-[#58657A]">Welcome back,</p>
              <h1 className="font-display text-5xl leading-[0.95] tracking-[-0.035em] text-[#0F2148] md:text-6xl">
                {affiliate.displayName}
              </h1>
              <p className="max-w-2xl text-[15px] leading-7 text-[#58657A]">
                Share your link. Pixie tracks eligible bookings and keeps your commission activity visible.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl bg-[#08152F] p-5 text-white">
            <p className="text-[13px] font-medium leading-5 text-[#CBD5E1]">Next best step</p>
            <h2 className="mt-2 font-display text-[32px] leading-none tracking-[-0.025em] text-white">
              Copy your referral link.
            </h2>
            <p className="mt-3 text-[15px] leading-7 text-[#CBD5E1]">
              Every eligible booking that starts here is tracked automatically.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="break-all text-sm font-semibold text-white">{referralLink}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <CopyReferralLinkButton
                referralLink={referralLink}
                label="Copy Referral Link"
                className={dashboardGoldButton}
              />
              <Link
                href="/affiliate/guides"
                className={dashboardNavyTextButton}
              >
                View guides
              </Link>
            </div>
          </aside>
        </header>

        <section aria-label="Dashboard summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={dashboardCard}>
            <p className={`${dashboardSmallText} font-medium`}>Available next payout</p>
            <p className="mt-3 font-display text-[44px] leading-none tracking-[-0.035em] text-[#0F2148]">
              {formatCurrency(summary.pendingOwed)}
            </p>
            <p className={`mt-3 ${dashboardSmallText}`}>Approved or scheduled commissions.</p>
          </div>
          <div className={dashboardCard}>
            <p className={`${dashboardSmallText} font-medium`}>Last payout received</p>
            <p className="mt-3 font-display text-[44px] leading-none tracking-[-0.035em] text-[#0F2148]">
              {formatCurrency(summary.lastPaidAmount)}
            </p>
            <p className={`mt-3 ${dashboardSmallText}`}>
              {summary.lastPaidAt ? `Paid ${new Date(summary.lastPaidAt).toLocaleDateString()}.` : "No payout recorded yet."}
            </p>
          </div>
          <div className={dashboardCard}>
            <p className={`${dashboardSmallText} font-medium`}>Average payout</p>
            <p className="mt-3 font-display text-[44px] leading-none tracking-[-0.035em] text-[#0F2148]">
              {formatCurrency(payoutAverage)}
            </p>
            <p className={`mt-3 ${dashboardSmallText}`}>
              Across {payouts.length} payout {payouts.length === 1 ? "record" : "records"}.
            </p>
          </div>
          <div className={dashboardCard}>
            <p className={`${dashboardSmallText} font-medium`}>Commission rate</p>
            <p className="mt-3 font-display text-[44px] leading-none tracking-[-0.035em] text-[#0F2148]">
              {(affiliate.commissionRate * 100).toFixed(0)}%
            </p>
            <p className={`mt-3 ${dashboardSmallText}`}>{formatLabel(affiliate.tier)} partner tier.</p>
          </div>
        </section>

        {!hasAnyEarnings ? (
          <section className="rounded-[24px] border border-[#D6B45A]/25 bg-[#FFF8E6] p-6 shadow-[0_14px_40px_rgba(15,33,72,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="max-w-2xl">
                <h2 className={dashboardSectionHeading}>
                  Your first commission starts with one share.
                </h2>
                <p className={`mt-3 ${dashboardBodyText}`}>
                  Once an eligible referral completes a qualifying booking, commission activity appears here.
                </p>
              </div>
              <CopyReferralLinkButton
                referralLink={referralLink}
                label="Copy Referral Link"
                className={dashboardPrimaryButton}
              />
            </div>
          </section>
        ) : null}

        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
          <section className={`${dashboardCard} lg:min-h-[420px]`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={dashboardSectionHeading}>
                  Recent commission activity
                </h2>
                <p className="mt-2 text-[15px] leading-6 text-[#58657A]">Latest payout items tied to eligible bookings.</p>
              </div>
              <span className={dashboardSmallText}>Last {recentPayouts.length || 0} records</span>
            </div>

            {recentPayouts.length === 0 ? (
              <div className={`mt-6 ${dashboardPanel}`}>
                <h3 className="text-[17px] font-semibold leading-6 text-[#0F2148]">Commission activity will appear here.</h3>
                <p className={`mt-3 max-w-2xl ${dashboardBodyText}`}>
                  Pixie records each eligible commission and keeps the status visible from review to payout.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <CopyReferralLinkButton
                    referralLink={referralLink}
                    label="Copy Referral Link"
                    className={dashboardPrimaryButton}
                  />
                  <Link
                    href="/affiliate/resources"
                    className={dashboardSecondaryButton}
                  >
                    Open Resources
                  </Link>
                </div>
              </div>
            ) : (
              <ul className={`mt-6 ${dashboardDivider} rounded-3xl border border-[#0F2148]/10`}>
                {recentPayouts.map((row) => {
                  const amount = Number(row.amount_usd ?? 0);
                  const paidOrCreatedAt = row.paid_at ?? row.created_at;
                  const bookingLabel =
                    typeof row.booking_count === "number" && row.booking_count > 0
                      ? `${row.booking_count} ${row.booking_count === 1 ? "booking" : "bookings"}`
                      : "Booking details pending";

                  return (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                      <div className="min-w-[180px]">
                        <p className="font-display text-[30px] leading-none tracking-[-0.03em] text-[#0F2148]">
                          {formatCurrency(amount)}
                        </p>
                        <p className="mt-2 text-[13px] leading-5 text-[#58657A]">
                          {new Date(paidOrCreatedAt).toLocaleDateString()} • {bookingLabel}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusChip(row.status)}`}>
                        {formatLabel(row.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className="space-y-6">
            <section className={dashboardCard}>
              <h2 className={dashboardCardHeading}>Needs attention</h2>
              <p className={`mt-3 ${dashboardBodyText}`}>{attentionCopy}</p>
              <div className="mt-5 rounded-2xl border border-[#0F2148]/10 bg-[#F7F3EA] p-4">
                <p className="text-[15px] font-semibold leading-6 text-[#0F2148]">{attentionLabel}</p>
              </div>
            </section>

            <section className={dashboardCard}>
              <h2 className={dashboardCardHeading}>Payout details</h2>
              <p className={`mt-3 ${dashboardBodyText}`}>Used for future manual payouts.</p>
              <div className="mt-5">
                <AffiliatePayoutEmailForm initialEmail={affiliate.payoutEmail} />
              </div>
            </section>

            <section className={dashboardCard}>
              <h2 className={dashboardCardHeading}>Partner status</h2>
              <div className="mt-5 space-y-3 text-[15px] leading-6 text-[#58657A]">
                <div className="flex items-center justify-between gap-4">
                  <span>Tier</span>
                  <span className="font-semibold text-[#0F2148]">{formatLabel(affiliate.tier)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Status</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChip(affiliate.status)}`}>
                    {formatLabel(affiliate.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Commission rate</span>
                  <span className="font-semibold text-[#0F2148]">{(affiliate.commissionRate * 100).toFixed(0)}%</span>
                </div>
              </div>
              <p className="mt-5 rounded-2xl bg-[#F7F3EA] p-4 text-[14px] leading-6 text-[#58657A]">
                Payouts are reviewed manually on the current partner schedule.
              </p>
            </section>
          </div>
        </section>

        <section>
          <div className={dashboardCard}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className={dashboardSectionHeading}>Payout history</h2>
                <p className="mt-2 text-[15px] leading-6 text-[#58657A]">Recent commission payout records.</p>
              </div>
              <span className={dashboardSmallText}>{payouts.length} records</span>
            </div>
            {payouts.length === 0 ? (
              <div className={`mt-6 ${dashboardPanel}`}>
                <h3 className="text-[17px] font-semibold leading-6 text-[#0F2148]">Your payout history will appear here.</h3>
                <p className={`mt-3 max-w-2xl ${dashboardBodyText}`}>
                  Once approved commissions enter a payout cycle, this ledger shows amount, status, and paid date.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-3xl border border-[#0F2148]/10">
                <table className={`min-w-full ${dashboardDivider} text-[14px]`}>
                  <thead className="bg-[#F7F3EA] text-[#58657A]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Period</th>
                      <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                      <th className="px-4 py-3 text-left font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0F2148]/10 bg-white text-[#58657A]">
                    {payouts.map((payout) => {
                      const run = payout.payout_run;
                      const periodLabel = run
                        ? `${new Date(run.period_start).toLocaleDateString()} – ${new Date(run.period_end).toLocaleDateString()}`
                        : new Date(payout.created_at).toLocaleDateString();
                      const paidLabel = payout.paid_at ? new Date(payout.paid_at).toLocaleDateString() : "—";

                      return (
                        <tr key={payout.id}>
                          <td className="px-4 py-3">{periodLabel}</td>
                          <td className="px-4 py-3">{payout.booking_count ?? 0}</td>
                          <td className="px-4 py-3 font-semibold text-[#0F2148]">
                            {formatCurrency(Number(payout.amount_usd ?? 0))}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusChip(payout.status)}`}>
                              {formatLabel(payout.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#58657A]">{paidLabel}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
