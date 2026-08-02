import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import OwnerFilterTabs from "@/components/owner/shared/OwnerFilterTabs";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerMatches, getOwnerRentals } from "@/lib/owner-data";
import {
  buildOwnerMatchListItems,
  filterOwnerMatchItems,
  type OwnerMatchFilter,
} from "@/lib/owner/operational-subpages";

export const dynamic = "force-dynamic";

const MATCH_FILTERS: { label: string; value: OwnerMatchFilter }[] = [
  { label: "Awaiting response", value: "awaiting" },
  { label: "Accepted", value: "accepted" },
  { label: "Declined", value: "declined" },
  { label: "All", value: "all" },
];

function getMatchFilter(value: string | undefined): OwnerMatchFilter {
  return MATCH_FILTERS.some((filter) => filter.value === value) ? (value as OwnerMatchFilter) : "awaiting";
}

function statusTone(group: string) {
  if (group === "declined") return "issue";
  if (group === "accepted" || group === "reservation_created") return "success";
  return "attention";
}

export default async function OwnerMatchesPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string };
}) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/matches");
  }

  const resolvedSearchParams = await searchParams;
  const activeFilter = getMatchFilter(resolvedSearchParams?.status);
  const [matches, rentals] = await Promise.all([
    getOwnerMatches(user.id, cookieStore),
    getOwnerRentals(user.id, cookieStore),
  ]);
  const rentalByMatchId = new Map(
    rentals
      .map((rental) => {
        const matchId = (rental as { match_id?: string | null }).match_id;
        return matchId ? [matchId, rental.id] as const : null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );
  const items = buildOwnerMatchListItems(matches, rentalByMatchId);
  const filteredItems = filterOwnerMatchItems(items, activeFilter);

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner matches"
        title="Match inbox"
        description="Review booking matches before they become active reservation workflows."
        summary={`${items.length} match${items.length === 1 ? "" : "es"}`}
      />

      <OwnerFilterTabs
        tabs={MATCH_FILTERS.map((filter) => ({
          label: filter.label,
          href: `/owner/matches?status=${filter.value}`,
          active: activeFilter === filter.value,
          count: filterOwnerMatchItems(items, filter.value).length,
        }))}
        label="Filter matches"
      />

      {filteredItems.length === 0 ? (
        <OwnerEmptyState
          title="No new matches right now."
          body="New owner match requests will appear here when a guest request is ready for your review."
        />
      ) : (
        <div className="space-y-4">
          {filteredItems.map((match) => (
            <Card
              key={match.id}
              className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A8495]">Booking match</p>
                    <OwnerRecordStatusBadge label={match.statusLabel} tone={statusTone(match.group)} />
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-[#10224A]">{match.matchLabel}</h2>
                  <dl className="mt-3 grid gap-3 text-sm text-[#667085] sm:grid-cols-3">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Travel dates</dt>
                      <dd className="mt-1">{match.dateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Points</dt>
                      <dd className="mt-1">{match.pointsLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Received</dt>
                      <dd className="mt-1">{match.receivedDateLabel}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs text-[#667085]">Response deadline: {match.expiresDateLabel}</p>
                </div>
                <Link
                  href={match.detailHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#10224A] px-5 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,34,74,0.08)]"
                >
                  {match.actionLabel}
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
