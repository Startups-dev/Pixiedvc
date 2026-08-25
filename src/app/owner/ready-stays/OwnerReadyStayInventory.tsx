import Link from "next/link";

import { Button, Card } from "@pixiedvc/design-system";
import OwnerEmptyState from "@/components/owner/shared/OwnerEmptyState";
import type { OwnerReadyStayListItem } from "@/lib/owner/secondary-subpages";
import { resolveResortImage } from "@/lib/resort-image";

type OwnerReadyStayInventoryProps = {
  items: OwnerReadyStayListItem[];
  activeCount: number;
  pendingReviewCount: number;
  potentialPayoutLabel: string;
};

function statusClassName(tone: OwnerReadyStayListItem["displayStatusTone"]) {
  if (tone === "live") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (tone === "booked") return "border-[#D9C27A] bg-[#FFF8E1] text-[#6B5315]";
  if (tone === "removed") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function OwnerReadyStayCard({ stay }: { stay: OwnerReadyStayListItem }) {
  return (
    <article className="overflow-hidden rounded-[22px] bg-white shadow-[0_18px_50px_rgba(16,34,74,0.10)] ring-1 ring-[#E9E2D5]">
      <div className="grid md:grid-cols-[38%_1fr]">
        <div className="relative min-h-[220px] bg-[#EEE8DA] md:min-h-full">
          <img
            src={stay.imageUrl}
            alt={stay.imageAlt}
            className="h-full min-h-[220px] w-full object-cover"
            loading="lazy"
          />
          <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#10224A] shadow-sm">
            Ready Stay
          </div>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-serif text-2xl font-semibold leading-tight text-[#10224A] sm:text-3xl">
                {stay.resortLabel}
              </h3>
              <p className="mt-2 text-sm font-medium text-[#5E6878]">{stay.roomLabel}</p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${statusClassName(stay.displayStatusTone)}`}>
              {stay.displayStatusLabel}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8992A3]">Dates</p>
              <p className="mt-1 text-sm font-semibold text-[#10224A]">{stay.dateLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8992A3]">Points</p>
              <p className="mt-1 text-sm font-semibold text-[#10224A]">{stay.pointsLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8992A3]">Payout / point</p>
              <p className="mt-1 text-sm font-semibold text-[#10224A]">{stay.ownerRateLabel}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#F7F2E8] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A6B43]">
              Estimated owner payout
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#10224A]">{stay.estimatedOwnerPayoutLabel}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EFE8DC] pt-4">
            <p className="text-sm text-[#667085]">{stay.displayStatusDescription}</p>
            <div className="flex flex-wrap gap-3">
              {stay.publicHref ? (
                <Button asChild variant="ghost">
                  <Link href={stay.publicHref}>View listing</Link>
                </Button>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[#E7E0D2] bg-[#FBF8F1] px-4 py-2 text-xs font-semibold text-[#667085]">
                  Not public yet
                </span>
              )}
              <Button asChild>
                <Link href={stay.detailHref} className="!text-white hover:!text-white">
                  Manage
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function OwnerReadyStayInventory({
  items,
  activeCount,
  pendingReviewCount,
  potentialPayoutLabel,
}: OwnerReadyStayInventoryProps) {
  const emptyStateImage = resolveResortImage({ resortCode: "SSR", imageIndex: 1 });

  return (
    <section id="active" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#10224A]">Your Ready Stays</h2>
          <p className="mt-1 text-sm text-[#667085]">Manage your confirmed reservations.</p>
        </div>
        <Button asChild>
          <Link href="/owner/dashboard?tab=listings&mode=add" className="!text-white hover:!text-white">
            + List a Ready Stay
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 rounded-[18px] bg-white/72 p-3 shadow-[0_1px_2px_rgba(16,34,74,0.04)] ring-1 ring-[#E9E2D5]">
        {[
          ["Active listings", String(activeCount)],
          ["Pending review", String(pendingReviewCount)],
          ["Potential payout", potentialPayoutLabel],
        ].map(([label, value]) => (
          <div key={label} className="min-w-[150px] flex-1 rounded-[14px] bg-[#FBF8F1] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A8495]">{label}</p>
            <p className="mt-1 text-xl font-semibold text-[#10224A]">{value}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="overflow-hidden rounded-[24px] border border-[#E9E2D5] bg-white shadow-[0_18px_50px_rgba(16,34,74,0.08)]">
          <div className="grid md:grid-cols-[40%_1fr]">
            <img
              src={emptyStateImage.url}
              alt="Disney Vacation Club resort"
              className="h-56 w-full object-cover md:h-full"
              loading="lazy"
            />
            <div className="p-7 sm:p-9">
              <OwnerEmptyState
                title="No Ready Stays yet"
                body="Have a confirmed DVC reservation you no longer need? List it for Hanna review."
              />
              <div className="mt-6">
                <Button asChild>
                  <Link href="/owner/dashboard?tab=listings&mode=add" className="!text-white hover:!text-white">
                    + List a Ready Stay
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-5" data-testid="ready-stay-card-list">
          {items.map((stay) => (
            <OwnerReadyStayCard key={stay.id} stay={stay} />
          ))}
        </div>
      )}
    </section>
  );
}
