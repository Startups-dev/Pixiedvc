import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarCheck,
  CalendarDays,
  CircleHelp,
  DollarSign,
  Home,
  Hourglass,
  Landmark,
  Megaphone,
  Menu,
  Settings,
  Wallet,
} from "lucide-react";

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
  "rounded-[18px] border border-[#ECECE8] bg-white p-7 shadow-[0_1px_2px_rgba(16,34,74,0.025)]";
const dashboardPanel = "rounded-[14px] bg-white p-6";
const dashboardSectionHeading = "font-display text-[28px] leading-tight tracking-[-0.025em] text-[#10224A]";
const dashboardCardHeading = "font-display text-[26px] leading-tight tracking-[-0.025em] text-[#10224A]";
const dashboardBodyText = "text-[15px] font-normal leading-7 text-[#58657A]";
const dashboardSmallText = "text-[12px] font-medium leading-5 text-[#7A8494]";
const dashboardDivider = "divide-y divide-[#ECECE8]";
const dashboardPrimaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-[#10224A] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#173A72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A64E]";
const dashboardSecondaryButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E7E7E4] bg-white px-4 text-sm font-semibold text-[#10224A] transition hover:-translate-y-0.5 hover:bg-[#FAFAF8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C7A64E]";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(value);
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
    return "border border-emerald-200 bg-white text-emerald-700";
  }
  if (normalized === "scheduled" || normalized === "pending" || normalized === "pending_review") {
    return "border border-amber-200 bg-white text-amber-700";
  }
  if (normalized === "failed" || normalized === "cancelled") {
    return "border border-rose-200 bg-white text-rose-700";
  }
  return "border border-sky-200 bg-white text-sky-700";
}

function DashboardMetricCard({
  icon,
  label,
  value,
  hint,
  positive = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  positive?: boolean;
}) {
  return (
    <article className="min-h-[132px] rounded-[18px] border border-[#EFEFEB] bg-white p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[44px] leading-none tracking-[-0.045em] text-[#10224A]">
            {value}
          </p>
          <p className="mt-4 flex items-center gap-1 text-[12px] font-medium leading-5 text-[#7A8494]">
            {label}
            <span className="text-[#9CA3AF]" aria-hidden="true">↗</span>
          </p>
          <p className={`mt-2 text-[11px] leading-5 ${positive ? "text-emerald-600" : "text-[#8A93A2]"}`}>
            {positive ? "↑ " : ""}{hint}
          </p>
        </div>
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#B9A25D] [&_svg]:h-3.5 [&_svg]:w-3.5">
          {icon}
        </span>
      </div>
    </article>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-[12px] px-4 py-3 text-sm font-semibold transition ${
        active
          ? "bg-white/[0.10] text-white ring-1 ring-white/[0.10]"
          : "text-[#CBD5E1] hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span className={active ? "text-[#C7A64E]" : "text-[#8EA4C2]"}>{icon}</span>
      <span>{label}</span>
    </Link>
  );
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
      <div className="mx-auto max-w-4xl bg-[#FAFAF8] px-6 py-20 text-[#10224A]">
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
            <Link href="/" className="block text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
              Back to HannaDVC
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
  const firstName = affiliate.displayName.trim().split(/\s+/)[0] || affiliate.displayName;
  const confirmedReservations = payouts.reduce((sum, payout) => sum + Number(payout.booking_count ?? 0), 0);
  const totalEarnings = payouts.reduce((sum, payout) => sum + Number(payout.amount_usd ?? 0), 0);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const paidThisMonth = payouts
    .filter((payout) => {
      const status = String(payout.status ?? "").toLowerCase();
      if (status !== "paid" || !payout.paid_at) return false;
      const paidAt = new Date(payout.paid_at);
      return paidAt >= monthStart && paidAt <= new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999);
    })
    .reduce((sum, payout) => sum + Number(payout.amount_usd ?? 0), 0);
  const latestPayoutDate = summary.lastPaidAt ? new Date(summary.lastPaidAt).toLocaleDateString() : null;
  const performancePoints = recentPayouts.slice(-5);

  return (
    <main className="min-h-screen bg-[#FAFAF8] text-[#10224A]">
      <div className="min-h-screen lg:grid lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden min-h-screen flex-col bg-[#10224A] px-4 py-5 text-white lg:flex">
          <Link href="/" className="px-3 font-display text-[30px] leading-tight tracking-[-0.04em] text-white">
            Hanna<span className="text-[#C7A64E]">DVC</span>
          </Link>

          <nav aria-label="Affiliate dashboard" className="mt-9 space-y-1.5">
            <SidebarLink href="/affiliate/dashboard" icon={<Home className="h-4 w-4" aria-hidden="true" />} label="Home" active />
            <SidebarLink href="#performance" icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />} label="Performance" />
            <SidebarLink href="#reservations" icon={<CalendarCheck className="h-4 w-4" aria-hidden="true" />} label="Reservations" />
            <SidebarLink href="#commissions" icon={<BadgeDollarSign className="h-4 w-4" aria-hidden="true" />} label="Commissions" />
            <SidebarLink href="#payout-history" icon={<Wallet className="h-4 w-4" aria-hidden="true" />} label="Payouts" />
            <SidebarLink href="/affiliate/resources" icon={<Megaphone className="h-4 w-4" aria-hidden="true" />} label="Marketing Tools" />
            <SidebarLink href="/affiliate/guides" icon={<BookOpen className="h-4 w-4" aria-hidden="true" />} label="Resources" />
            <SidebarLink href="#settings" icon={<Settings className="h-4 w-4" aria-hidden="true" />} label="Settings" />
            <SidebarLink href="/affiliate/guides#affiliate-faq" icon={<CircleHelp className="h-4 w-4" aria-hidden="true" />} label="Help & Support" />
          </nav>

          <div className="mt-auto rounded-[12px] border border-[#C7A64E]/35 bg-[#10224A] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#C7A64E]">Your Partner Tier</p>
            <p className="mt-3 text-lg font-semibold text-white">{formatLabel(affiliate.tier)}</p>
            <p className="mt-1 text-sm text-[#CBD5E1]">{(affiliate.commissionRate * 100).toFixed(0)}% commission rate</p>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-[#E7E7E4] bg-white/95 px-5 shadow-[0_1px_2px_rgba(16,34,74,0.03)] backdrop-blur lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="Open navigation"
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#E7E7E4] bg-white text-[#10224A] lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Collapse navigation"
                className="hidden h-10 w-10 items-center justify-center rounded-[12px] text-[#58657A] transition hover:bg-[#FAFAF8] hover:text-[#10224A] lg:flex"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <Link href="/" className="font-display text-2xl tracking-[-0.03em] text-[#10224A] lg:hidden">
                Hanna<span className="text-[#C7A64E]">DVC</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[#E7E7E4] bg-white px-4 py-2 text-sm font-semibold text-[#10224A] shadow-[0_1px_2px_rgba(16,34,74,0.03)] md:inline-flex">
                <CalendarDays className="h-4 w-4 text-[#58657A]" aria-hidden="true" />
                <span>{formatShortDate(monthStart)} - {formatShortDate(monthEnd)}</span>
              </div>
              <button
                type="button"
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E7E7E4] bg-white text-[#10224A]"
              >
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
              </button>
              <div className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10224A] text-sm font-semibold text-white">
                  {firstName.charAt(0).toUpperCase()}
                </span>
                <div className="hidden leading-tight sm:block">
                  <p className="text-sm font-semibold text-[#10224A]">{affiliate.displayName}</p>
                  <p className="text-xs text-[#58657A]">{formatLabel(affiliate.tier)} Partner</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1500px] space-y-6 px-6 py-6 lg:px-8">

        <section className="flex flex-wrap items-start justify-between gap-4 px-1 py-2">
          <div className="space-y-3">
            <h1
              className="font-display leading-tight tracking-[-0.04em] text-[#10224A]"
                style={{
                  fontFamily: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
                  fontSize: "clamp(32px, 2.65vw, 38px)",
                }}
              >
              Welcome back, {firstName}! ✨
            </h1>
            <p className="max-w-3xl text-[14px] font-normal leading-6 text-[#7A8494]">
              Here&apos;s your performance overview and latest updates.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E7E7E4] bg-white px-4 py-2 text-sm font-semibold text-[#10224A] shadow-[0_1px_2px_rgba(16,34,74,0.03)] md:hidden">
            <CalendarDays className="h-4 w-4 text-[#58657A]" aria-hidden="true" />
            <span>{formatShortDate(monthStart)} - {formatShortDate(monthEnd)}</span>
          </div>
        </section>

        <section aria-label="Dashboard summary" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardMetricCard
            icon={<DollarSign aria-hidden="true" />}
            label="Total Earnings"
            value={formatCurrency(totalEarnings)}
            hint="All payout records"
            positive
          />
          <DashboardMetricCard
            icon={<Hourglass aria-hidden="true" />}
            label="Pending Commissions"
            value={formatCurrency(summary.pendingOwed)}
            hint="From scheduled commissions"
          />
          <DashboardMetricCard
            icon={<BriefcaseBusiness aria-hidden="true" />}
            label="Confirmed Reservations"
            value={String(confirmedReservations)}
            hint="Bookings reflected in payouts"
            positive
          />
          <DashboardMetricCard
            icon={<Landmark aria-hidden="true" />}
            label="Paid This Month"
            value={formatCurrency(paidThisMonth)}
            hint={latestPayoutDate ? `Last paid on ${latestPayoutDate}` : "No payment this month"}
          />
        </section>

        <section id="performance" className="grid gap-6 lg:grid-cols-2">
          <section className={dashboardCard}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={dashboardSectionHeading}>Performance</h2>
                <p className="mt-2 text-[15px] leading-6 text-[#58657A]">A simple view of recent commission movement.</p>
              </div>
              <span className={dashboardSmallText}>Last {performancePoints.length || 0} records</span>
            </div>
            {performancePoints.length > 0 ? (
              <>
                <div className="mt-8 flex h-40 items-end gap-3 rounded-[14px] border border-[#ECECE8] bg-white p-5">
                  {performancePoints.map((payout) => {
                    const amount = Math.max(Number(payout.amount_usd ?? 0), 0);
                    const maxAmount = Math.max(...performancePoints.map((item) => Number(item.amount_usd ?? 0)), 1);
                    const height = Math.max(18, Math.round((amount / maxAmount) * 100));
                    return (
                      <div key={payout.id} className="flex flex-1 flex-col items-center gap-3">
                        <div
                          className="w-full rounded-full bg-[#10224A]"
                          style={{ height: `${height}%` }}
                          aria-label={`Commission ${formatCurrency(amount)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[14px] border border-[#ECECE8] bg-white p-4">
                    <p className={dashboardSmallText}>Total records</p>
                    <p className="mt-1 font-display text-2xl text-[#10224A]">{payouts.length}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#ECECE8] bg-white p-4">
                    <p className={dashboardSmallText}>Average payout</p>
                    <p className="mt-1 font-display text-2xl text-[#10224A]">{formatCurrency(payoutAverage)}</p>
                  </div>
                  <div className="rounded-[14px] border border-[#ECECE8] bg-white p-4">
                    <p className={dashboardSmallText}>Last payout</p>
                    <p className="mt-1 font-display text-2xl text-[#10224A]">{latestPayoutDate ?? "—"}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-[270px] flex-col items-center justify-center px-8 py-12 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full text-[#B9A25D]">
                  <BarChart3 className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h3 className="mt-7 font-display text-[30px] leading-tight tracking-[-0.035em] text-[#10224A]">
                  Your first confirmed booking will start the story.
                </h3>
                <p className="mt-4 max-w-xl text-[14px] leading-7 text-[#7A8494]">
                  After a referred guest completes a qualifying reservation, this area will show commission movement, recent payout records, and booking performance over time.
                </p>
              </div>
            )}
          </section>

          <section id="settings" className={`${dashboardCard} min-h-[300px]`}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#B9A25D]">✨ PIXIE</p>
            <h2 className="mt-5 font-display text-[34px] leading-tight tracking-[-0.035em] text-[#10224A]">
              I would start with your strongest audience moment.
            </h2>
            <p className="mt-5 max-w-xl text-[16px] leading-8 text-[#58657A]">
              Share your referral link where families are already comparing Disney resort options, planning budgets, or asking whether a DVC rental is worth it.
            </p>
            <p className="mt-8 max-w-xl border-t border-[#EFEFEB] pt-6 text-[14px] leading-7 text-[#7A8494]">
              Next, pair your link with one simple promise: extra space, kitchen access, and concierge support for Disney villa stays.
            </p>
          </section>
        </section>

        <section id="commissions" className="grid gap-6 lg:grid-cols-2">
          <section className={`${dashboardCard} min-h-[320px]`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className={dashboardSectionHeading}>Recent Activity</h2>
                <p className="mt-2 text-[15px] leading-6 text-[#58657A]">Latest payout items tied to eligible bookings.</p>
              </div>
              <span className={dashboardSmallText}>Last {recentPayouts.length || 0} records</span>
            </div>

            {recentPayouts.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center px-8 py-10 text-center">
                <span className="mb-6 flex h-8 w-8 items-center justify-center rounded-full text-[#B9A25D]">
                  <BadgeDollarSign className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h3 className="font-display text-[28px] leading-tight tracking-[-0.035em] text-[#10224A]">Commission activity will appear here.</h3>
                <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#7A8494]">
                  HannaDVC records each eligible commission and keeps the status visible from review to payout.
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
              <ul className={`mt-6 ${dashboardDivider} rounded-[18px] border border-[#E7E7E4]`}>
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
                        <p className="font-display text-[30px] leading-none tracking-[-0.03em] text-[#10224A]">
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

          <section className={`${dashboardCard} min-h-[320px]`}>
            <p className="text-[12px] font-medium uppercase tracking-[0.22em] text-[#7A8494]">Next Payout</p>
            <p className="mt-6 font-display text-[60px] leading-none tracking-[-0.05em] text-[#10224A]">
              {formatCurrency(summary.pendingOwed)}
            </p>
            <p className="mt-3 text-[13px] leading-6 text-[#7A8494]">
              {summary.pendingOwed > 0 ? "Awaiting the current partner payout process." : "No payout is scheduled yet."}
            </p>
            <div className="mt-9 space-y-4 border-t border-[#EFEFEB] pt-6">
              {[
                "Reservation confirmed",
                "Commission reviewed",
                "Payout scheduled",
                "Payment sent",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 text-[14px] text-[#58657A]">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
                      index === 0
                        ? "border-[#BFA45A]/45 bg-white text-[#9C853E]"
                        : "border-[#ECECE8] bg-white text-[#58657A]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </section>
        </section>

        <section id="reservations" className="grid gap-6 lg:grid-cols-3">
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
                <span className="font-semibold text-[#10224A]">{formatLabel(affiliate.tier)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Status</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusChip(affiliate.status)}`}>
                  {formatLabel(affiliate.status)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Commission rate</span>
                <span className="font-semibold text-[#10224A]">{(affiliate.commissionRate * 100).toFixed(0)}%</span>
              </div>
            </div>
            <p className="mt-5 rounded-[14px] border border-[#ECECE8] bg-white p-4 text-[14px] leading-6 text-[#58657A]">
              Payouts are reviewed manually on the current partner schedule.
            </p>
          </section>

          {!hasAnyEarnings ? (
            <section className="rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.03)]">
              <h2 className={dashboardCardHeading}>Start with one share.</h2>
              <p className={`mt-3 ${dashboardBodyText}`}>
                Once an eligible referral completes a qualifying booking, commission activity appears here.
              </p>
              <CopyReferralLinkButton
                referralLink={referralLink}
                label="Copy Referral Link"
                className={`mt-5 ${dashboardPrimaryButton}`}
              />
            </section>
          ) : (
            <section className={dashboardCard}>
              <h2 className={dashboardCardHeading}>Last payout received</h2>
              <p className="mt-3 font-display text-[40px] leading-none tracking-[-0.035em] text-[#10224A]">
                {formatCurrency(summary.lastPaidAmount)}
              </p>
              <p className={`mt-3 ${dashboardSmallText}`}>{latestPayoutDate ? `Paid ${latestPayoutDate}.` : "No payout recorded yet."}</p>
            </section>
          )}
        </section>

        <section id="payout-history">
          <div className={dashboardCard}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className={dashboardSectionHeading}>Payout history</h2>
                <p className="mt-2 text-[15px] leading-6 text-[#58657A]">Recent commission payout records.</p>
              </div>
              <span className={dashboardSmallText}>{payouts.length} records</span>
            </div>
            {payouts.length === 0 ? (
              <div className={`${dashboardPanel} mt-6 flex min-h-[190px] flex-col items-center justify-center text-center`}>
                <span className="mb-6 flex h-8 w-8 items-center justify-center rounded-full text-[#B9A25D]">
                  <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h3 className="font-display text-[26px] leading-tight tracking-[-0.03em] text-[#10224A]">Your payout history will appear here.</h3>
                <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#7A8494]">
                  Once approved commissions enter a payout cycle, this ledger shows amount, status, and paid date.
                </p>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-[18px] border border-[#E7E7E4]">
                <table className={`min-w-full ${dashboardDivider} text-[14px]`}>
                  <thead className="bg-white text-[#58657A]">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Period</th>
                      <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                      <th className="px-4 py-3 text-left font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECECE8] bg-white text-[#58657A]">
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
                          <td className="px-4 py-3 font-semibold text-[#10224A]">
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
        </div>
      </div>
    </main>
  );
}
