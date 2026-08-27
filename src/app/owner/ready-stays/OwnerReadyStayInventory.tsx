import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";

import { Button } from "@pixiedvc/design-system";
import type { OwnerReadyStayListItem } from "@/lib/owner/secondary-subpages";
import { resolveResortImage } from "@/lib/resort-image";

type OwnerReadyStayInventoryProps = {
  items: OwnerReadyStayListItem[];
  activeCount: number;
  pendingReviewCount: number;
  potentialPayoutLabel: string;
};

function statusClassName(tone: OwnerReadyStayListItem["displayStatusTone"]) {
  if (tone === "live") return "border-transparent text-white shadow-[0_8px_18px_rgba(4,120,87,0.25)]";
  if (tone === "booked") return "border-[#D9C27A] bg-[#FFF8E1] text-[#6B5315]";
  if (tone === "removed") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function statusStyle(tone: OwnerReadyStayListItem["displayStatusTone"]) {
  if (tone !== "live") return undefined;
  return {
    backgroundColor: "#047857",
    borderColor: "#047857",
    color: "#ffffff",
  };
}

function StatusMarker({ tone }: { tone: OwnerReadyStayListItem["displayStatusTone"] }) {
  if (tone !== "live") return null;
  return <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: "#A7F3D0" }} />;
}

const hannaIconPaths = {
  readyStayActive: "/images/hanna-icons/ready-stay-active.png",
  pendingReview: "/images/hanna-icons/pending-review.png",
  ownerEarnings: "/images/hanna-icons/owner-earnings.png",
} as const;

function HannaMetricIcon({ src }: { src: string }) {
  return (
    <span className="relative mt-0.5 block h-9 w-9 shrink-0">
      <img src={src} alt="" className="h-full w-full object-contain" aria-hidden="true" />
    </span>
  );
}

function OwnerReadyStayCard({ stay }: { stay: OwnerReadyStayListItem }) {
  return (
    <article className="overflow-hidden rounded-md border border-[#D9CDB8] bg-white">
      <div className="grid lg:grid-cols-[42%_1fr]">
        <div className="relative min-h-[260px] bg-[#EEE8DA] lg:min-h-[410px]">
          <img
            src={stay.imageUrl}
            alt={stay.imageAlt}
            className="h-full min-h-[260px] w-full object-cover lg:min-h-[410px]"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-serif text-3xl font-semibold leading-tight text-[#10224A] sm:text-4xl">
                {stay.resortLabel}
              </h3>
              <p className="mt-2 text-base text-[#51607A]">{stay.roomLabel}</p>
            </div>
            <div className="text-right">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] ${statusClassName(stay.displayStatusTone)}`}
                style={statusStyle(stay.displayStatusTone)}
              >
                <StatusMarker tone={stay.displayStatusTone} />
                {stay.displayStatusLabel}
              </div>
              <p className="mt-2 text-xs text-[#51607A]">{stay.displayStatusDescription}</p>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6F7B93]">Dates</p>
              <p className="mt-2 text-base font-semibold text-[#10224A]">{stay.dateLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6F7B93]">Points</p>
              <p className="mt-2 text-base font-semibold text-[#10224A]">{stay.pointsLabel}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6F7B93]">Payout / point</p>
              <p className="mt-2 text-base font-semibold text-[#10224A]">{stay.ownerRateLabel}</p>
            </div>
          </div>

          <div className="border-t border-[#C89A3D]/45 pt-8">
            <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#9A6A1E]">Estimated owner payout</p>
            <p className="mt-2 font-serif text-4xl font-semibold text-[#10224A]">{stay.estimatedOwnerPayoutLabel}</p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {stay.publicHref ? (
                <Link href={stay.publicHref} className="inline-flex items-center gap-2 text-sm font-semibold text-[#10224A] underline-offset-4 hover:underline">
                  View listing
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="text-sm font-semibold text-[#667085]">
                  Not public yet
                </span>
              )}
              <Button asChild className="!rounded-md !bg-[#10224A] !px-6 !py-3 !shadow-none">
                <Link href={stay.detailHref} className="!text-white hover:!text-white">
                  Manage listing
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
    <section id="active" className="space-y-9">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-5xl font-semibold tracking-tight text-[#10224A] sm:text-6xl">
            Your Ready Stays
          </h1>
        </div>
        <Link
          href="/owner/dashboard?tab=listings&mode=add"
          className="inline-flex items-center gap-2 rounded-md border border-[#C89A3D] bg-white px-5 py-3 text-sm font-semibold text-[#8A570F] transition hover:bg-[#FBFAF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89A3D]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>List a Ready Stay</span>
        </Link>
      </div>

      <div className="grid gap-6 border-y border-[#E1D7C7] py-7 sm:grid-cols-3 sm:gap-0">
        {[
          ["Active listings", String(activeCount), hannaIconPaths.readyStayActive],
          ["Pending review", String(pendingReviewCount), hannaIconPaths.pendingReview],
          ["Estimated payout", potentialPayoutLabel, hannaIconPaths.ownerEarnings],
        ].map(([label, value, iconSrc], index) => {
          return (
            <div key={label} className="flex gap-4 sm:border-l sm:border-[#E1D7C7] sm:px-8 first:sm:border-l-0 first:sm:pl-0">
              <HannaMetricIcon src={iconSrc} />
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#53617A]">{label}</p>
                <p className={index === 2 ? "mt-2 font-serif text-3xl font-semibold text-[#10224A]" : "mt-2 text-3xl font-semibold text-[#10224A]"}>
                  {value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="overflow-hidden rounded-md border border-[#D9CDB8] bg-white">
          <div className="grid md:grid-cols-[42%_1fr]">
            <img
              src={emptyStateImage.url}
              alt="Disney Vacation Club resort"
              className="h-56 w-full object-cover md:h-full"
              loading="lazy"
            />
            <div className="p-8 sm:p-10">
              <div className="max-w-xl">
                <p className="font-serif text-3xl font-semibold text-[#10224A]">No Ready Stays yet</p>
                <p className="mt-3 text-sm leading-6 text-[#51607A]">
                  Have a confirmed DVC reservation you no longer need? List it for Hanna review.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild className="!rounded-md !bg-[#10224A] !shadow-none">
                  <Link href="/owner/dashboard?tab=listings&mode=add" className="!text-white hover:!text-white">
                    List a Ready Stay
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
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
