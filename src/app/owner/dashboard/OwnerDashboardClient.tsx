import type { ReactNode } from "react";
import Link from "next/link";

import { Card, Button } from "@pixiedvc/design-system";
import FoundingOwnerBadge from "@/components/founding-owner/FoundingOwnerBadge";
import { formatCurrency } from "@/lib/owner-portal";
import MatchedRequestsInbox from "@/components/owner/MatchedRequestsInbox";
import OwnerDashboardTabSelect from "@/components/owner/dashboard/OwnerDashboardTabSelect";
import OwnerDashboardOverview from "@/components/owner/dashboard/OwnerDashboardOverview";
import OwnerReservationForm from "@/components/owner/OwnerReservationForm";
import type { OwnerDashboardViewModel } from "@/lib/owner/dashboard-view-model";
import type { BookingRequestGuestRow, OwnerMatchRow, PayoutLedgerRow, RentalRow } from "@/lib/owner-data";

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

type FoundingOwnerSummary = {
  active: boolean;
  bonusCents: number;
  expiresAt: string | null;
};

type DashboardRentalRow = RentalRow & {
  match_id?: string | null;
  dvc_confirmation_number?: string | null;
  milestones?: { code: string; status: string; occurred_at: string | null }[];
};

type DashboardMatchItem = {
  match: OwnerMatchRow;
  rental: DashboardRentalRow | null;
  guests: BookingRequestGuestRow[];
};

type OwnerDashboardClientProps = {
  activeTab: string;
  listingsMode: "hub" | "add";
  tabs: OwnerDashboardTab[];
  displayName: string | null;
  overview: OwnerDashboardViewModel;
  showOnboardingMessage: boolean;
  showResaleRestrictionBanner: boolean;
  matchItems: DashboardMatchItem[];
  resorts: { id: string; name: string; calculator_code: string | null }[];
  pendingPayoutAmount: number;
  pendingPayouts: PayoutLedgerRow[];
  rewardsSummary: RewardsSummary | null;
  foundingOwnerSummary: FoundingOwnerSummary | null;
};

function deriveMatchStatus(match: OwnerMatchRow, rental: DashboardRentalRow | null) {
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
        <p className="text-sm text-slate-500">{body}</p>
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
    overview,
    showOnboardingMessage,
    showResaleRestrictionBanner,
    matchItems,
    resorts,
    pendingPayoutAmount,
    pendingPayouts,
    rewardsSummary,
    foundingOwnerSummary,
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
          Resale memberships acquired on/after Jan 19, 2019 have booking restrictions at certain resorts (including Riviera, Villas at Disneyland Hotel, and the Cabins at Fort Wilderness). HannaDVC will automatically avoid matching you to requests you can’t book.
        </Card>
      ) : null}

      {activeTab !== "overview" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {displayName ? `${displayName}'s dashboard` : "Owner dashboard"}
            </h1>
            {foundingOwnerSummary?.active ? <FoundingOwnerBadge variant="artwork" /> : null}
          </div>
          {foundingOwnerSummary?.active ? (
            <p className="text-sm text-slate-600">
              You&apos;re part of the HannaDVC Founding Owner Circle.
            </p>
          ) : null}
        </section>
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
        <OwnerDashboardOverview viewModel={overview} />
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
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
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
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
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
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
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
