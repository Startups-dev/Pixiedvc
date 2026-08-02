import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import OwnerFilterTabs from "@/components/owner/shared/OwnerFilterTabs";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerPayouts } from "@/lib/owner-data";
import {
  buildOwnerPayoutListItems,
  buildOwnerPayoutSummaryCards,
  filterOwnerPayoutItems,
  type OwnerPayoutFilter,
} from "@/lib/owner/operational-subpages";

const PAYOUT_FILTERS: { label: string; value: OwnerPayoutFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Ready for payout", value: "eligible" },
  { label: "Paid", value: "released" },
  { label: "Payment issue", value: "failed" },
];

function getPayoutFilter(value: string | undefined): OwnerPayoutFilter {
  return PAYOUT_FILTERS.some((filter) => filter.value === value) ? (value as OwnerPayoutFilter) : "all";
}

function statusTone(status: string) {
  if (status === "released") return "success";
  if (status === "pending" || status === "eligible") return "attention";
  if (status === "failed") return "issue";
  return "neutral";
}

export default async function OwnerPayoutsPage({
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
    redirect("/login?redirect=/owner/payouts");
  }

  const resolvedSearchParams = await searchParams;
  const activeFilter = getPayoutFilter(resolvedSearchParams?.status);
  const payouts = await getOwnerPayouts(user.id, cookieStore);
  const summaryCards = buildOwnerPayoutSummaryCards(payouts);
  const items = buildOwnerPayoutListItems(payouts);
  const filteredItems = filterOwnerPayoutItems(items, activeFilter);

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner payouts"
        title="Payouts"
        description="Track owner payout ledger rows by reservation, stage, status, and release date."
        summary={`${items.length} payout${items.length === 1 ? "" : "s"}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7A8495]">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-[#10224A]">{card.valueLabel}</p>
            <p className="mt-2 text-sm text-[#667085]">{card.helper}</p>
          </Card>
        ))}
      </div>

      <OwnerFilterTabs
        tabs={PAYOUT_FILTERS.map((filter) => ({
          label: filter.label,
          href: `/owner/payouts?status=${filter.value}`,
          active: activeFilter === filter.value,
          count: filterOwnerPayoutItems(items, filter.value).length,
        }))}
        label="Filter payouts"
      />

      {filteredItems.length === 0 ? (
        <OwnerEmptyState
          title="No payouts yet."
          body="Payouts appear here after a reservation reaches the relevant payout milestone. We only show owner payout ledger amounts, not guest totals."
        />
      ) : (
        <Card className="rounded-[18px] border border-[#E7E7E4] bg-white p-0 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#ECECE8] text-[11px] uppercase tracking-[0.18em] text-[#7A8495]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Reservation</th>
                  <th className="px-5 py-4 font-semibold">Stage</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Eligible</th>
                  <th className="px-5 py-4 font-semibold">Released</th>
                  <th className="px-5 py-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EC]">
                {filteredItems.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-5 py-4 font-medium text-[#10224A]">{payout.reservationLabel}</td>
                    <td className="px-5 py-4 text-[#667085]">{payout.stageLabel}</td>
                    <td className="px-5 py-4 font-semibold text-[#10224A]">{payout.amountLabel}</td>
                    <td className="px-5 py-4">
                      <OwnerRecordStatusBadge label={payout.statusLabel} tone={statusTone(payout.status)} />
                    </td>
                    <td className="px-5 py-4 text-[#667085]">{payout.eligibleDateLabel}</td>
                    <td className="px-5 py-4 text-[#667085]">{payout.releasedDateLabel}</td>
                    <td className="px-5 py-4">
                      <Link href={payout.detailHref} className="font-semibold text-[#10224A] underline-offset-4 hover:underline">
                        View reservation
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#F0F0EC] md:hidden">
            {filteredItems.map((payout) => (
              <article key={payout.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-[#10224A]">{payout.reservationLabel}</h2>
                    <p className="mt-1 text-sm text-[#667085]">{payout.stageLabel}</p>
                  </div>
                  <OwnerRecordStatusBadge label={payout.statusLabel} tone={statusTone(payout.status)} />
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Amount</dt>
                    <dd className="mt-1 font-semibold text-[#10224A]">{payout.amountLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Eligible</dt>
                    <dd className="mt-1 text-[#667085]">{payout.eligibleDateLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.16em] text-[#7A8495]">Released</dt>
                    <dd className="mt-1 text-[#667085]">{payout.releasedDateLabel}</dd>
                  </div>
                </dl>
                <Link href={payout.detailHref} className="inline-flex text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
                  View reservation
                </Link>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
