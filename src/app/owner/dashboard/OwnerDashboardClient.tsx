import type { ReactNode } from "react";
import Link from "next/link";

import { Card, Button } from "@pixiedvc/design-system";
import { formatCurrency } from "@/lib/owner-portal";
import { getMembershipExpirationDate, getMembershipNudge } from "@/lib/owner-nudges";
import StatTiles from "@/components/owner/StatTiles";
import MatchedRequestsInbox from "@/components/owner/MatchedRequestsInbox";
import OwnerMembershipManager from "@/components/owner/OwnerMembershipManager";
import LiquidationIntentButton from "@/components/owner/LiquidationIntentButton";
import BankedPointsButton from "@/components/owner/BankedPointsButton";
import OwnerDashboardTabSelect from "@/components/owner/dashboard/OwnerDashboardTabSelect";
import OwnerReservationForm from "@/components/owner/OwnerReservationForm";

type OwnerDashboardTab = {
  id: string;
  label: string;
  comingSoon?: boolean;
};

type RewardsSummary = {
  enrolled: boolean;
  enrollmentOpen: boolean;
  lifetimePoints: number;
  bonusCents: number;
  tierLabel: string;
};

type OwnerDashboardClientProps = {
  activeTab: string;
  listingsMode: "hub" | "add";
  tabs: OwnerDashboardTab[];
  displayName: string | null;
  showOnboardingMessage: boolean;
  showResaleRestrictionBanner: boolean;
  hasPremiumOnlyMembership: boolean;
  tiles: Array<{
    label: string;
    value: string;
    helper: string;
    badge?: { label: string; className: string };
  }>;
  pendingMatches: any[];
  recentMatches: any[];
  matchItems: any[];
  membershipRows: any[];
  visibleMemberships: any[];
  resorts: { id: string; name: string; calculator_code: string | null }[];
  notifications: any[];
  expiringPoints: any[];
  approvalNeeded: any[];
  confirmationNeeded: any[];
  pendingReadyStayTransfers: any[];
  pendingPayoutAmount: number;
  pendingPayouts: any[];
  rewardsSummary: RewardsSummary | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function getUseYearEndDate(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return null;
  if (end) return end;
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return null;
  const endDate = new Date(startDate);
  endDate.setUTCFullYear(endDate.getUTCFullYear() + 1);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  return endDate.toISOString().slice(0, 10);
}

function deriveMatchStatus(match: any, rental: any) {
  if (match.status === "expired" || match.status === "rematched") return "expired";
  if (match.status === "declined") return "declined";
  if (rental?.status === "cancelled") return "cancelled";
  if (rental?.status === "completed") return "completed";
  if (rental?.status === "needs_dvc_booking") return "needs_dvc_booking";
  if (rental?.status === "booked_pending_agreement" || rental?.status === "booked") return "pending_confirmation";
  if (match.status === "accepted") return "needs_dvc_booking";
  return "awaiting_owner_approval";
}

function OwnerDashboardTabs({ tabs, activeTab }: { tabs: OwnerDashboardTab[]; activeTab: string }) {
  return (
    <div className="space-y-4">
      <div className="md:hidden">
        <OwnerDashboardTabSelect tabs={tabs} activeTab={activeTab} />
      </div>
      <div className="hidden items-center gap-2 md:flex">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          const isComingSoon = Boolean(tab.comingSoon);
          return (
            <Link
              key={tab.id}
              href={`/owner/dashboard?tab=${tab.id}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#0B1B3A] !text-white"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              <span className={isActive ? "!text-white" : isComingSoon ? "text-slate-900" : undefined}>
                {tab.label}
              </span>
              {tab.comingSoon ? (
                <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] ${
                  isActive ? "bg-white/20 text-white/80" : "bg-white/70 text-slate-500"
                }`}>
                  Soon
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoonCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="flex min-h-[220px] items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="space-y-2">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
          <svg
            aria-hidden="true"
            className="h-5 w-5 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 3h10a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2Z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{body}</p>
      </div>
    </Card>
  );
}

export default function OwnerDashboardClient(props: OwnerDashboardClientProps) {
  const {
    activeTab,
    listingsMode,
    tabs,
    displayName,
    showOnboardingMessage,
    showResaleRestrictionBanner,
    hasPremiumOnlyMembership,
    tiles,
    pendingMatches,
    recentMatches,
    matchItems,
    membershipRows,
    visibleMemberships,
    resorts,
    notifications,
    expiringPoints,
    approvalNeeded,
    confirmationNeeded,
    pendingReadyStayTransfers,
    pendingPayoutAmount,
    pendingPayouts,
    rewardsSummary,
  } = props;

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-6 py-12">
      {showOnboardingMessage ? (
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm text-emerald-900 shadow-sm">
          Thanks for finishing onboarding. Everything you need stays here on the dashboard.
        </Card>
      ) : null}
      {showResaleRestrictionBanner ? (
        <Card className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 shadow-sm">
          Resale memberships acquired on/after Jan 19, 2019 have booking restrictions at certain resorts (including Riviera, Villas at Disneyland Hotel, and the Cabins at Fort Wilderness). PixieDVC will automatically avoid matching you to requests you can’t book.
        </Card>
      ) : null}

      <OwnerDashboardTabs tabs={tabs} activeTab={activeTab} />

      {activeTab === "listings" ? (
        listingsMode === "add" ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Listings</p>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">Add a Ready Stay</h1>
            <p className="text-sm text-muted">
              Add and verify your Disney reservation to list it for instant booking.
            </p>
          </section>
        ) : (
          <section className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted">Listings</p>
              <h1 className="text-3xl font-semibold tracking-tight text-ink">Ready Stay Listings</h1>
              <p className="text-sm text-muted">Choose where you want to go.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Manage</p>
                <h2 className="text-xl font-semibold text-ink">My Posted Reservations</h2>
                <p className="text-sm text-muted">
                  View active, pending transfer, and sold Ready Stays.
                </p>
                <Button asChild>
                  <Link href="/owner/ready-stays">Open inventory</Link>
                </Button>
              </Card>
              <Card className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Create</p>
                <h2 className="text-xl font-semibold text-ink">Add Reservation</h2>
                <p className="text-sm text-muted">
                  Add a new reservation and publish it as a Ready Stay.
                </p>
                <Button asChild variant="ghost">
                  <Link href="/owner/dashboard?tab=listings&mode=add">Add reservation</Link>
                </Button>
              </Card>
            </div>
          </section>
        )
      ) : null}

      {activeTab === "overview" ? (
        <>
          <section className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Revenue</p>
              <h2 className="text-xl font-semibold text-ink">Revenue channels</h2>
            </div>
            <div>
              <Link href="/owner/pricing-intelligence" className="text-xs font-semibold text-brand hover:underline">
                Pricing Intelligence
              </Link>
            </div>
          </section>
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">On-Demand Matches</p>
              <h3 className="text-lg font-semibold text-ink">On-Demand Matches</h3>
              <p className="text-sm text-muted">
                Review and respond to guest requests in the traditional match flow.
              </p>
              <Button asChild size="sm">
                <Link href="/owner/dashboard?tab=matches">Open On-Demand Matches</Link>
              </Button>
            </Card>
            <Card className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready Stays</p>
              <h3 className="text-lg font-semibold text-ink">Ready Stays (Confirmed Listings)</h3>
              <p className="text-sm text-muted">
                List confirmed reservations for instant guest booking with pricing caps.
              </p>
              <Button asChild size="sm" variant="ghost">
                <Link href="/owner/ready-stays">Open Ready Stays</Link>
              </Button>
            </Card>
          </section>

          <StatTiles tiles={tiles} />

          {hasPremiumOnlyMembership ? (
            <Card className="border border-amber-200 bg-amber-50/60 text-amber-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  You’re set to Premium-only. This may prevent matches in the Standard window. Enable “Try Premium then Standard” to match faster.
                </p>
                <Button asChild variant="ghost">
                  <Link href="/owner/memberships">Review matching preferences</Link>
                </Button>
              </div>
            </Card>
          ) : null}

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Pending owner action</p>
                <h2 className="text-xl font-semibold text-ink">
                  {pendingMatches.length + pendingReadyStayTransfers.length} items awaiting your review
                </h2>
              </div>
              <Link href="/owner/dashboard?tab=matches" className="text-xs font-semibold text-brand hover:underline">
                View all matches
              </Link>
            </div>
            {pendingMatches.length === 0 && pendingReadyStayTransfers.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
                No pending matches right now. We will notify you as soon as a guest is ready for your approval.
              </p>
            ) : (
              <div className="space-y-4">
                {pendingReadyStayTransfers.length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Ready Stay transfers</p>
                      <Link href="/owner/ready-stays" className="text-xs font-semibold text-brand hover:underline">
                        Open Ready Stays
                      </Link>
                    </div>
                    <div className="mt-3 space-y-2">
                      {pendingReadyStayTransfers.slice(0, 2).map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                          <p className="font-semibold text-ink">{item.resortName ?? "Ready Stay"}</p>
                          <p className="text-xs text-slate-600">
                            {formatDate(item.checkIn)} → {formatDate(item.checkOut)} · {(item.points ?? 0).toLocaleString("en-US")} pts
                          </p>
                          <p className="text-xs text-slate-600">Guest: {item.guestName ?? "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {recentMatches.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    {recentMatches.map((match) => {
                      const booking = match.booking;
                      const resortName = booking?.primary_resort?.name ?? "Resort TBD";
                      const points = booking?.total_points ?? match.points_reserved ?? 0;
                      return (
                        <Link key={match.id} href={`/owner/matches/${match.id}`} className="group">
                          <div className="rounded-2xl border border-slate-200 bg-white p-4 transition group-hover:border-brand/50">
                            <p className="text-xs uppercase tracking-[0.2em] text-muted">Match</p>
                            <p className="mt-2 text-base font-semibold text-ink">{resortName}</p>
                            <p className="text-sm text-slate-600">
                              {formatDate(booking?.check_in ?? null)} → {formatDate(booking?.check_out ?? null)}
                            </p>
                            <p className="text-xs text-slate-500">{points.toLocaleString("en-US")} pts reserved</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Points overview</p>
              <h2 className="text-xl font-semibold text-ink">Membership breakdown</h2>
            </div>
            {membershipRows.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">No memberships on file yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-2 py-3">Resort</th>
                      <th className="px-2 py-3">Use year</th>
                      <th className="px-2 py-3 w-[280px] min-w-[280px]">Use year period</th>
                      <th className="px-2 py-3">Owned</th>
                      <th className="px-2 py-3">Available</th>
                      <th className="px-2 py-3">Reserved</th>
                      <th className="px-2 py-3">Rented</th>
                      <th className="px-2 py-3">Expiring</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membershipRows.map((membership) => (
                      <tr key={membership.id} className="border-b border-slate-100">
                        <td className="px-2 py-3 font-semibold text-ink">{membership.resortLabel}</td>
                        <td className="px-2 py-3">{membership.useYearLabel}</td>
                        <td className="px-2 py-3 w-[280px] min-w-[280px]">
                          {membership.use_year_start ? (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                {formatDate(membership.use_year_start)}
                              </span>
                              <span className="text-xs text-slate-400">–</span>
                              <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                                {(() => {
                                  const endDate = getUseYearEndDate(
                                    membership.use_year_start,
                                    membership.use_year_end,
                                  );
                                  return endDate ? formatDate(endDate) : "—";
                                })()}
                              </span>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-3">{membership.points_owned?.toLocaleString("en-US") ?? "—"}</td>
                        <td className="px-2 py-3">{membership.points_available?.toLocaleString("en-US") ?? "—"}</td>
                        <td className="px-2 py-3">{membership.points_reserved?.toLocaleString("en-US") ?? "—"}</td>
                        <td className="px-2 py-3">{membership.points_rented?.toLocaleString("en-US") ?? "—"}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1">
                            <span>
                              {getMembershipExpirationDate(membership)
                                ? formatDate(getMembershipExpirationDate(membership))
                                : "—"}
                            </span>
                            {membership.nudge ? (
                              <span
                                className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${membership.nudge.tier.classes}`}
                              >
                                {membership.nudge.tier.label}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <OwnerMembershipManager
            memberships={visibleMemberships}
            resorts={resorts as { id: string; name: string; calculator_code: string | null }[]}
          />

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <MatchedRequestsInbox matches={matchItems} />

            <Card className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Action needed</p>
                <h2 className="text-xl font-semibold text-ink">Stay ahead</h2>
              </div>
              <div className="space-y-3 text-sm text-muted">
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <span>Approvals waiting</span>
                  <span className="font-semibold text-ink">{approvalNeeded.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <span>Confirmations to upload</span>
                  <span className="font-semibold text-ink">{confirmationNeeded.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                  <span>Points expiring soon</span>
                  <span className="font-semibold text-ink">{expiringPoints.length}</span>
                </div>
                {expiringPoints.length ? (
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">
                    {expiringPoints
                      .slice()
                      .sort((a, b) => a.nudge.daysToExpire - b.nudge.daysToExpire)
                      .map((membership) => {
                        const nudge = membership.nudge;
                        const canBank = nudge.stage === "banking";
                        const reason =
                          nudge.stage === "banking"
                            ? nudge.daysToBank <= 7
                              ? "banking_close_7"
                              : "banking_close_30"
                            : nudge.daysToExpire <= 30
                              ? "expiring_nudge_30"
                              : nudge.daysToExpire <= 60
                                ? "expiring_nudge_60"
                                : nudge.daysToExpire <= 90
                                  ? "expiring_nudge_90"
                                  : "expiring_nudge_120";
                        return (
                          <div key={membership.id} className="flex flex-col gap-3 rounded-xl bg-white px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-ink">
                                  {membership.resort?.name ?? "Resort points"}
                                </p>
                                <p className="text-xs text-muted">
                                  Expires in {nudge.daysToExpire} days
                                  {nudge.expiration ? ` • ${formatDate(nudge.expiration)}` : ""}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${nudge.tier.classes}`}
                              >
                                {nudge.tier.label}
                              </span>
                            </div>
                            <p className="text-sm text-muted">
                              {canBank && nudge.bankingDeadline
                                ? nudge.daysToBank <= 7
                                  ? `Last week to bank. Bank by ${formatDate(nudge.bankingDeadline)} or rent now.`
                                  : `Banking closes soon. You can bank your points until ${formatDate(nudge.bankingDeadline)}. Bank now, or rent them.`
                                : `Your ${membership.resort?.name ?? "points"} expire in ${nudge.daysToExpire} days. Banking window is closed. Liquidate ASAP so you don’t lose them.`}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
                              <span>
                                {canBank && nudge.bankingDeadline
                                  ? `Bank by ${formatDate(nudge.bankingDeadline)}`
                                  : "Banking closed"}
                              </span>
                              {canBank ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <BankedPointsButton
                                    ownerMembershipId={membership.id}
                                    reason={reason}
                                    defaultAmount={membership.points_available ?? 0}
                                  />
                                  <LiquidationIntentButton
                                    ownerMembershipId={membership.id}
                                    reason={`${reason}_rent`}
                                    label="Rent instead"
                                  />
                                </div>
                              ) : nudge.daysToExpire <= 90 ? (
                                <LiquidationIntentButton
                                  ownerMembershipId={membership.id}
                                  reason={reason}
                                  label="Liquidate"
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : null}
              </div>
              <Button asChild variant="ghost" fullWidth>
                <Link href="/owner/notifications">Review notifications ({notifications.length})</Link>
              </Button>
            </Card>
          </section>
        </>
      ) : null}

      {activeTab === "matches" ? (
        <section className="space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Matches</p>
              <h2 className="text-xl font-semibold text-ink">Owner command center</h2>
            </div>
            <Link href="/owner/dashboard?tab=matches" className="text-xs font-semibold text-brand hover:underline">
              View all matches
            </Link>
          </div>

          {(() => {
            const completedStatuses = new Set(["completed", "cancelled", "expired"]);
            const withStatus = matchItems.map((item) => ({
              ...item,
              displayStatus: deriveMatchStatus(item.match, item.rental),
            }));
            const actionRequired = withStatus.filter((item) =>
              ["awaiting_owner_approval", "needs_dvc_booking"].includes(item.displayStatus),
            );
            const pendingProcessing = withStatus.filter((item) => item.displayStatus === "pending_confirmation");
            const confirmedBookings = withStatus.filter(
              (item) => !completedStatuses.has(item.displayStatus) && Boolean(item.rental?.dvc_confirmation_number),
            );
            const completedMatches = withStatus.filter((item) => completedStatuses.has(item.displayStatus));

            const renderSection = (
              title: string,
              count: number,
              children: ReactNode,
              emptyMessage: string,
              collapseWhenEmpty = false,
            ) => {
              if (collapseWhenEmpty && count === 0) return null;
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-ink">{title}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {count}
                      </span>
                    </div>
                  </div>
                  {count === 0 ? (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">{emptyMessage}</p>
                  ) : (
                    children
                  )}
                </div>
              );
            };

            return (
              <div className="space-y-8">
                {renderSection(
                  "Action required",
                  actionRequired.length,
                  <MatchedRequestsInbox
                    matches={actionRequired}
                    embedded
                    showHeader={false}
                    emptyMessage="No matches awaiting your action."
                  />,
                  "No matches awaiting your action.",
                  true,
                )}

                {renderSection(
                  "Pending (processing)",
                  pendingProcessing.length,
                  <MatchedRequestsInbox
                    matches={pendingProcessing}
                    embedded
                    showHeader={false}
                    emptyMessage="No requests waiting on confirmation right now."
                  />,
                  "No requests waiting on confirmation right now.",
                )}

                {renderSection(
                  "Confirmed bookings",
                  confirmedBookings.length,
                  <MatchedRequestsInbox
                    matches={confirmedBookings}
                    embedded
                    showHeader={false}
                    emptyMessage="No confirmed bookings yet."
                  />,
                  "No confirmed bookings yet.",
                )}

                {completedMatches.length === 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-ink">Completed / past</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          0
                        </span>
                      </div>
                    </div>
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">No past matches yet.</p>
                  </div>
                ) : (
                  <details className="space-y-4">
                    <summary className="flex cursor-pointer items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-ink">Completed / past</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {completedMatches.length}
                        </span>
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Show
                      </span>
                    </summary>
                    <MatchedRequestsInbox
                      matches={completedMatches}
                      embedded
                      showHeader={false}
                      emptyMessage="No past matches yet."
                    />
                  </details>
                )}
              </div>
            );
          })()}
        </section>
      ) : null}

      {activeTab === "earnings" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Earnings snapshot</p>
            <h2 className="text-xl font-semibold text-ink">Earnings & payouts</h2>
            <p className="text-sm text-muted">
              {pendingPayouts.length
                ? `${pendingPayouts.length} payouts pending release.`
                : "No payouts waiting right now."}
            </p>
            <p className="text-2xl font-semibold text-ink">{formatCurrency(pendingPayoutAmount)}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/owner/payouts">View payouts</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/owner/rewards">Owner rewards</Link>
              </Button>
            </div>
          </Card>
          <ComingSoonCard
            title="Payout history"
            body="A full ledger of deposits and releases will appear here as payouts post."
          />
        </section>
      ) : null}

      {activeTab === "rewards" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner rewards</p>
            <h2 className="text-xl font-semibold text-ink">Pixie Preferred</h2>
            <p className="text-sm text-muted">
              Reward tiers increase your per‑point earnings as stays complete.
            </p>
            {rewardsSummary ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-sm">
                <p className="font-semibold text-ink">
                  {rewardsSummary.enrolled
                    ? "Enrolled"
                    : rewardsSummary.enrollmentOpen
                      ? "Not enrolled yet"
                      : "Enrollment closed"}
                </p>
                <p className="text-xs text-slate-500">
                  Lifetime points: {rewardsSummary.lifetimePoints.toLocaleString("en-US")}
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  +${(rewardsSummary.bonusCents / 100).toFixed(2)}/pt · {rewardsSummary.tierLabel}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Rewards data will appear once your first stay completes.</p>
            )}
            <Button asChild variant="ghost">
              <Link href="/owner/rewards">View rewards details</Link>
            </Button>
          </Card>
          <ComingSoonCard
            title="Owner insights"
            body="A detailed view of tier progress and bonus history will live here."
          />
        </section>
      ) : null}

      {activeTab === "listings" && listingsMode === "add" ? (
        <section className="space-y-6">
          <Card id="add-reservation-form" className="space-y-4">
            <OwnerReservationForm resorts={resorts} />
          </Card>
          <p className="text-xs text-slate-500">
            After publishing, manage active, pending, and sold Ready Stays on the inventory page.
          </p>
        </section>
      ) : null}

      {activeTab === "payouts" ? (
        <ComingSoonCard
          title="Payouts"
          body="A dedicated payouts center is on the way. You’ll see release timing and history here."
        />
      ) : null}

      {activeTab === "documents" ? (
        <ComingSoonCard
          title="Documents"
          body="Secure document storage for agreements and confirmations is coming soon."
        />
      ) : null}
    </div>
  );
}
