import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import {
  getAffiliateForUser,
  getAffiliatePayoutHistory,
  getAffiliatePayoutSummary,
} from "@/lib/affiliates";
import AffiliatePayoutEmailForm from "@/components/affiliate/PayoutEmailForm";
import CopyReferralLinkButton from "@/components/affiliate/CopyReferralLinkButton";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  affiliateCard,
  affiliateCard2,
  affiliateLink,
  affiliatePrimaryButton,
  affiliateSecondaryButton,
  affiliateTextMuted,
} from "@/lib/affiliate-theme";
import { buildAffiliateReferralUrl, getReferralBaseUrl } from "@/lib/affiliate-referrals";

type PendingAffiliateApplication = {
  id: string;
  status: string;
  auth_user_id?: string | null;
};

function isMissingAffiliateApplicationAuthUserIdColumn(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.toLowerCase().includes("affiliate_applications.auth_user_id does not exist") ||
        error.message?.toLowerCase().includes("column affiliate_applications.auth_user_id does not exist")),
  );
}

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
    return "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (normalized === "scheduled" || normalized === "pending_review") {
    return "border border-amber-400/30 bg-amber-400/10 text-amber-200";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "border border-rose-400/30 bg-rose-400/10 text-rose-200";
  }
  return "border border-sky-400/30 bg-sky-400/10 text-sky-200";
}

async function getPendingAffiliateApplicationForUser(userId: string, email?: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const byUserResult = await admin
    .from("affiliate_applications")
    .select("id, status, auth_user_id")
    .eq("auth_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let canLinkAuthUser = !isMissingAffiliateApplicationAuthUserIdColumn(byUserResult.error);
  let application: PendingAffiliateApplication | null = canLinkAuthUser
    ? (byUserResult.data as PendingAffiliateApplication | null)
    : null;

  if (!application && email) {
    const byEmailResult = await admin
      .from("affiliate_applications")
      .select(canLinkAuthUser ? "id, status, auth_user_id" : "id, status")
      .eq("email", email.toLowerCase())
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (canLinkAuthUser && isMissingAffiliateApplicationAuthUserIdColumn(byEmailResult.error)) {
      canLinkAuthUser = false;
      const fallback = await admin
        .from("affiliate_applications")
        .select("id, status")
        .eq("email", email.toLowerCase())
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      application = fallback.data as PendingAffiliateApplication | null;
    } else {
      application = byEmailResult.data as PendingAffiliateApplication | null;
    }
  }

  if (canLinkAuthUser && application?.id && !application.auth_user_id) {
    await admin
      .from("affiliate_applications")
      .update({ auth_user_id: userId })
      .eq("id", application.id);
  }

  return application as PendingAffiliateApplication | null;
}

function UnderReviewDashboard() {
  const launchCards = [
    {
      title: "Learn how PixieDVC works",
      body: "Understand how owners rent their points, how guests book stays, and where partners fit into the process.",
    },
    {
      title: "Review the partner playbook",
      body: "Get familiar with our messaging, positioning, and best practices before your referral tools unlock.",
    },
    {
      title: "Prepare your audience",
      body: "Start thinking about which DVC owners in your community would benefit from a simpler way to rent their points.",
    },
    {
      title: "Approval unlocks your tools",
      body: "Once approved, your referral links, tracking, campaign resources, and payout information will become available.",
    },
  ];

  const progressItems = [
    { label: "Application Submitted", state: "completed" },
    { label: "Account Created", state: "completed" },
    { label: "Under Review", state: "current" },
    { label: "Approved", state: "pending" },
    { label: "First Owner Referred", state: "pending" },
    { label: "First Commission", state: "pending" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-14">
      <header className={`rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1224] p-8 shadow-[0_22px_60px_rgba(2,6,23,0.45)]`}>
        <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Dashboard</p>
        <h1 className="mt-4 font-display text-4xl text-slate-100">Welcome to PixieDVC Partners</h1>
      </header>

      <Card surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
        <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Application Status</p>
        <p className="mt-3 text-2xl font-semibold text-slate-100">Under Review</p>
        <p className={`mt-3 text-sm ${affiliateTextMuted}`}>
          We’re reviewing your partner application. While you wait, you can explore the dashboard and prepare your account.
        </p>
      </Card>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">While you wait, get ready for launch</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {launchCards.map((card) => (
            <Card key={card.title} surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
              <h3 className="text-lg font-semibold text-slate-100">{card.title}</h3>
              <p className={`mt-2 text-sm leading-relaxed ${affiliateTextMuted}`}>{card.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-100">Your Partner Journey</h2>
        <Card surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
          <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {progressItems.map((item) => {
              const isPending = item.state === "pending";
              const label =
                item.state === "current"
                  ? "Current"
                  : item.state === "completed"
                    ? "Completed"
                    : "Pending";

              return (
                <li
                  key={item.label}
                  className={`rounded-2xl border p-4 ${
                    isPending
                      ? "border-white/10 bg-[#0b1224] text-slate-500"
                      : "border-emerald-400/20 bg-emerald-400/10 text-slate-100"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className={`mt-2 text-xs uppercase tracking-[0.2em] ${isPending ? "text-slate-500" : "text-emerald-300"}`}>
                    {label}
                  </p>
                </li>
              );
            })}
          </ol>
        </Card>
      </section>
    </div>
  );
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

  const affiliate = await getAffiliateForUser(user.id, user.email);
  if (!affiliate && !isAdmin && !hasAffiliateRole) {
    const pendingApplication = await getPendingAffiliateApplicationForUser(user.id, user.email);
    if (pendingApplication?.id) {
      return <UnderReviewDashboard />;
    }

    redirect(`/affiliate/login?redirect=${encodeURIComponent("/affiliate/dashboard")}&error=role`);
  }

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
  const referralLink = buildAffiliateReferralUrl(getReferralBaseUrl(), affiliate.slug);
  const recentPayouts = payouts.slice(0, 6).reverse();
  const payoutAverage =
    payouts.length === 0
      ? 0
      : payouts.reduce((sum, row) => sum + Number(row.amount_usd ?? 0), 0) / payouts.length;
  const hasAnyEarnings = summary.pendingOwed > 0 || summary.lastPaidAmount > 0 || payoutAverage > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-14">
      <header className={`relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#0b1224] p-8 shadow-[0_22px_60px_rgba(2,6,23,0.45)]`}>
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-[#2dd4bf]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-[#60a5fa]/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-8">
          <div className="min-w-[260px] flex-1 space-y-4">
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Affiliate Dashboard</p>
            <h1 className="font-display text-4xl text-slate-100">Welcome back, {affiliate.displayName}</h1>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className={`inline-flex items-center rounded-full px-3 py-1 font-semibold uppercase tracking-[0.2em] ${statusChip(affiliate.status)}`}>
                {formatLabel(affiliate.status)}
              </span>
              <span className="inline-flex items-center rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-sky-200">
                {formatLabel(affiliate.tier)} Tier
              </span>
            </div>
            <div className={`max-w-2xl rounded-2xl border border-white/10 bg-[#0f172a]/70 p-4 text-sm ${affiliateTextMuted}`}>
              <p className="text-xs uppercase tracking-[0.2em]">Referral Link</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="break-all font-semibold text-slate-200">{referralLink}</p>
                <CopyReferralLinkButton
                  referralLink={referralLink}
                  className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-200 transition hover:bg-sky-400/20"
                />
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Share this link to start earning commission on confirmed bookings.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost" className={affiliateSecondaryButton}>
              <Link href="/affiliate/resources">Resources</Link>
            </Button>
            <Button asChild variant="ghost" className={affiliateSecondaryButton}>
              <Link href="/affiliate/guides">Guides</Link>
            </Button>
            <Button asChild className={affiliatePrimaryButton}>
              <Link href={`/calculator?ref=${affiliate.slug}`}>Share Your Link</Link>
            </Button>
          </div>
        </div>
      </header>

      {affiliate.status === "pending_review" ? (
        <Card surface="dark" className={`${affiliateCard2} border-[#D4AF37]/30 shadow-[0_12px_32px_rgba(0,0,0,0.25)]`}>
          <p className="text-sm font-semibold text-[#D4AF37]">
            Your account is active. Our team may review your promotional channels to ensure alignment with PixieDVC
            standards.
          </p>
        </Card>
      ) : null}

      <section className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Pending owed</p>
            <p className="mt-3 text-4xl font-semibold text-slate-100">{formatCurrency(summary.pendingOwed)}</p>
            <p className={`text-xs ${affiliateTextMuted}`}>Scheduled unpaid commissions</p>
          </Card>
          <Card surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Last paid</p>
            <p className="mt-3 text-4xl font-semibold text-slate-100">{formatCurrency(summary.lastPaidAmount)}</p>
            <p className={`text-xs ${affiliateTextMuted}`}>
              {summary.lastPaidAt ? `Paid ${new Date(summary.lastPaidAt).toLocaleDateString()}` : "No payouts yet"}
            </p>
          </Card>
          <Card surface="dark" className={`${affiliateCard} border-white/15 bg-[#0f172a]`}>
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Average payout</p>
            <p className="mt-3 text-4xl font-semibold text-slate-100">{formatCurrency(payoutAverage)}</p>
            <p className={`text-xs ${affiliateTextMuted}`}>
              Across {payouts.length} payout {payouts.length === 1 ? "record" : "records"}
            </p>
          </Card>
        </div>

        {!hasAnyEarnings ? (
          <Card surface="dark" className={`${affiliateCard2} border-white/15`}>
            <p className="text-sm text-slate-300">
              You haven&apos;t earned commissions yet. Start by sharing your referral link.
            </p>
          </Card>
        ) : null}
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card surface="dark" className={`space-y-4 ${affiliateCard} border-white/15 bg-[#0f172a] lg:min-h-[430px]`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Earnings activity</p>
            <span className="text-xs text-slate-300">Last {recentPayouts.length || 0} earnings records</span>
          </div>
          {recentPayouts.length === 0 ? (
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b1224] p-5">
              <p className="text-sm font-semibold text-slate-200">No payout activity yet.</p>
              <p className={`text-sm ${affiliateTextMuted}`}>
                Share your referral link, drive your first booking, and your earnings will appear here automatically.
              </p>
              <div className="flex flex-wrap gap-3">
                <CopyReferralLinkButton
                  referralLink={referralLink}
                  className="rounded-full bg-[#D4AF37] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#111827] transition hover:brightness-110"
                />
                <Button asChild variant="ghost" className={affiliateSecondaryButton}>
                  <Link href="/affiliate/guides">View Guides</Link>
                </Button>
              </div>
              <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#0f172a] p-4 text-xs text-slate-300">
                <p className="font-semibold uppercase tracking-[0.2em] text-slate-400">Getting Started</p>
                <p>1. Share your referral link</p>
                <p>2. A guest books through your link</p>
                <p>3. Earn commission automatically</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0b1224]">
              <ul className="divide-y divide-white/10">
                {recentPayouts.map((row) => {
                  const amount = Number(row.amount_usd ?? 0);
                  const paidOrCreatedAt = row.paid_at ?? row.created_at;
                  const bookingLabel =
                    typeof row.booking_count === "number" && row.booking_count > 0
                      ? `${row.booking_count} ${row.booking_count === 1 ? "booking" : "bookings"}`
                      : null;

                  return (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-[180px]">
                        <p className="text-sm font-semibold text-slate-100">{formatCurrency(amount)}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(paidOrCreatedAt).toLocaleDateString()}
                          {bookingLabel ? ` • ${bookingLabel}` : ""}
                        </p>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusChip(row.status)}`}>
                        {formatLabel(row.status)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <Card surface="dark" className={`space-y-4 ${affiliateCard} border-white/15 bg-[#0f172a]`}>
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Payout email</p>
            <AffiliatePayoutEmailForm initialEmail={affiliate.payoutEmail} />
            <p className={`text-xs ${affiliateTextMuted}`}>We send PayPal/Wise payouts to this address.</p>
          </Card>

          <Card surface="dark" className={`space-y-4 ${affiliateCard} border-white/15 bg-[#0f172a]`}>
            <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Commission tier</p>
            <div className={`space-y-2 text-sm ${affiliateTextMuted}`}>
              <div className="flex items-center justify-between">
                <span>Rate</span>
                <span className="font-semibold text-slate-100">{(affiliate.commissionRate * 100).toFixed(0)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusChip(affiliate.status)}`}>
                  {formatLabel(affiliate.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tier</span>
                <span className="font-semibold text-slate-100">{formatLabel(affiliate.tier)}</span>
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
        </div>
      </section>

      <section className="grid gap-6">
        <Card surface="dark" className={`space-y-4 ${affiliateCard} border-white/15 bg-[#0f172a]`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.3em] ${affiliateTextMuted}`}>Payout history</p>
              <p className="mt-1 text-sm text-slate-300">Recent commissions and payout statuses</p>
            </div>
            <span className="text-xs text-slate-400">{payouts.length} records</span>
          </div>
          {payouts.length === 0 ? (
            <p className={`text-sm ${affiliateTextMuted}`}>No payouts yet.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-[#0b1224] text-xs uppercase tracking-[0.22em] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Period</th>
                    <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                    <th className="px-4 py-3 text-left font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 bg-[#0f172a] text-slate-300">
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
                        <td className="px-4 py-3 font-semibold text-slate-100">
                          {formatCurrency(Number(payout.amount_usd ?? 0))}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${statusChip(payout.status)}`}>
                            {formatLabel(payout.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{paidLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
