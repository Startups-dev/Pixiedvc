import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import DevSeedRental from "@/components/owner/DevSeedRental";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import OwnerFilterTabs from "@/components/owner/shared/OwnerFilterTabs";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerRentals } from "@/lib/owner-data";
import {
  buildOwnerRentalListItems,
  filterOwnerRentalItems,
  getOwnerRentalFilterFromStatus,
  type OwnerRentalFilter,
} from "@/lib/owner/operational-subpages";

const RENTAL_FILTERS: { label: string; value: OwnerRentalFilter }[] = [
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "All", value: "all" },
];

function statusTone(group: string) {
  if (group === "completed") return "success";
  if (group === "cancelled") return "issue";
  return "attention";
}

export default async function OwnerRentalsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }> | { status?: string };
}) {
  const isDev = process.env.NODE_ENV !== "production";
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/owner/rentals");
  }

  const resolvedSearchParams = await searchParams;
  const activeFilter = getOwnerRentalFilterFromStatus(resolvedSearchParams?.status);
  const rentals = await getOwnerRentals(user.id, cookieStore);
  const items = buildOwnerRentalListItems(rentals);
  const filteredItems = filterOwnerRentalItems(items, activeFilter);

  return (
    <div className="space-y-8">
      <OwnerPageHeader
        eyebrow="Owner reservations"
        title="Reservations"
        description="Follow active and historical reservation workflows without exposing guest contact details in the overview."
        summary={`${items.length} reservation${items.length === 1 ? "" : "s"}`}
      />

      <OwnerFilterTabs
        tabs={RENTAL_FILTERS.map((filter) => ({
          label: filter.label,
          href: `/owner/rentals?status=${filter.value}`,
          active: activeFilter === filter.value,
          count: filterOwnerRentalItems(items, filter.value).length,
        }))}
        label="Filter reservations"
      />

      {filteredItems.length === 0 ? (
        <OwnerEmptyState
          title="No reservations yet."
          body="Reservation workflows will appear here once a match becomes an active owner reservation."
          action={
            isDev ? (
              <div className="rounded-[14px] border border-[#ECECE8] bg-white px-4 py-3 text-xs text-[#667085]">
                Seed a demo rental tied to your account for local testing.
                <DevSeedRental className="mt-3" />
              </div>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredItems.map((rental) => (
            <Card
              key={rental.id}
              className="rounded-[18px] border border-[#E7E7E4] bg-white p-5 shadow-[0_1px_2px_rgba(16,34,74,0.04)]"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A8495]">Reservation</p>
                  <h2 className="mt-2 text-lg font-semibold text-[#10224A]">{rental.stayLabel}</h2>
                  <p className="mt-1 text-sm text-[#667085]">{rental.dateLabel}</p>
                  <p className="mt-1 text-sm text-[#667085]">{rental.pointsLabel}</p>
                </div>
                <OwnerRecordStatusBadge label={rental.statusLabel} tone={statusTone(rental.group)} />
              </div>

              <div className="mt-5">
                <div className="h-2 w-full rounded-full bg-[#F0F0EC]">
                  <div className="h-2 rounded-full bg-[#10224A]" style={{ width: `${rental.progressPercent}%` }} aria-hidden />
                </div>
                <p className="mt-2 text-xs text-[#667085]">{rental.progressLabel}</p>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-[#ECECE8] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7A8495]">Next action</p>
                  <p className="mt-1 text-sm font-semibold text-[#10224A]">{rental.nextActionLabel}</p>
                </div>
                <Link href={rental.detailHref} className="text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
                  View reservation
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
