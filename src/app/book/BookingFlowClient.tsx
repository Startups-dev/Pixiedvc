"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BookingFlow } from "@pixiedvc/booking-form";
import type { Prefill } from "@pixiedvc/booking-form";
import type { GuestInfoInput } from "@pixiedvc/booking-form";

const CALC_CODE_TO_SLUG: Record<string, string> = {
  AKV: "animal-kingdom-villas",
  AUL: "aulani",
  BLT: "bay-lake-tower",
  BCV: "beach-club-villas",
  BWV: "boardwalk-villas",
  BRV: "boulder-ridge-villas",
  CCV: "copper-creek-villas",
  CFW: "fort-wilderness-cabins",
  HHI: "hilton-head-island",
  OKW: "old-key-west",
  PVB: "polynesian-villas",
  RVA: "riviera-resort",
  SSR: "saratoga-springs",
  VB: "vero-beach",
  VDH: "the-villas-at-disneyland-hotel",
  VGC: "the-villas-at-disneys-grand-californian-hotel-spa",
  VGF: "grand-floridian-villas",
};

function normalizeCount(value: number | undefined, fallback: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(fallback, Math.min(maximum, Math.floor(value)));
}

export default function BookingFlowClient({
  prefill,
  resorts,
  quoteToken,
  startAtGuestInfo = false,
  flowLabel,
  hideDepositBadge,
  stepDisplayOffset,
  totalStepsOverride,
  onGuestInfoNextPath,
  onGuestInfoSubmit,
  guestDefaults,
  signInHref,
  onSignInClick,
}: {
  prefill: Prefill;
  resorts: Array<{ id: string; name: string; slug?: string | null }>;
  quoteToken?: string;
  startAtGuestInfo?: boolean;
  flowLabel?: string;
  hideDepositBadge?: boolean;
  stepDisplayOffset?: number;
  totalStepsOverride?: number;
  onGuestInfoNextPath?: string;
  onGuestInfoSubmit?: (guest: GuestInfoInput) => Promise<void>;
  guestDefaults?: Partial<GuestInfoInput>;
  signInHref?: string;
  onSignInClick?: (guest: GuestInfoInput) => void;
}) {
  const router = useRouter();
  const [resolvedPrefill, setResolvedPrefill] = useState<Prefill>(prefill);
  const [resolvedGuestDefaults, setResolvedGuestDefaults] = useState<Partial<GuestInfoInput> | undefined>(guestDefaults);
  const [quoteStatus, setQuoteStatus] = useState<"loading" | "ready" | "missing">(
    quoteToken ? "loading" : "ready",
  );

  useEffect(() => {
    if (!quoteToken) {
      setResolvedPrefill(prefill);
      setResolvedGuestDefaults(guestDefaults);
      setQuoteStatus("ready");
      return;
    }

    try {
      const raw = window.localStorage.getItem(`pixiedvc:quote:${quoteToken}`);
      if (!raw) {
        setQuoteStatus("missing");
        return;
      }

      const parsed = JSON.parse(raw) as {
        quote?: {
          resortCode?: string;
          resortName?: string;
          villaType?: string;
          viewType?: string;
          room?: string;
          view?: string;
          pricingTier?: string;
          checkIn?: string;
          checkOut?: string;
          points?: number;
          totalUSD?: number;
          adults?: number;
          children?: number;
        };
      };
      const quote = parsed?.quote;
      if (!quote) {
        setQuoteStatus("missing");
        return;
      }

      const resolvedResort =
        resorts.find((resort) => {
          if (quote.resortName && resort.name === quote.resortName) return true;
          const resortCodeSlug = quote.resortCode ? CALC_CODE_TO_SLUG[quote.resortCode] : null;
          return Boolean(resortCodeSlug && resort.slug === resortCodeSlug);
        }) ?? null;

      setResolvedPrefill({
        resortId: resolvedResort?.id ?? quote.resortCode ?? prefill.resortId,
        resortName: resolvedResort?.name ?? quote.resortName ?? prefill.resortName,
        villaType: quote.villaType ?? prefill.villaType,
        viewType: quote.viewType ?? prefill.viewType,
        roomCode: quote.room,
        viewCode: quote.view,
        pricingTier: quote.pricingTier ?? prefill.pricingTier,
        checkIn: quote.checkIn ?? prefill.checkIn,
        checkOut: quote.checkOut ?? prefill.checkOut,
        points: typeof quote.points === "number" ? quote.points : prefill.points,
        estCash: typeof quote.totalUSD === "number" ? quote.totalUSD : prefill.estCash,
      });
      const adults = normalizeCount(quote.adults, 1, 20);
      const children = normalizeCount(quote.children, 0, 20);
      setResolvedGuestDefaults({
        ...guestDefaults,
        adults,
        youths: children,
        adultGuests: Array.from({ length: adults - 1 }, (_, index) =>
          guestDefaults?.adultGuests?.[index] ?? { title: "Mr.", firstName: "", lastName: "" },
        ),
        childGuests: Array.from({ length: children }, (_, index) =>
          guestDefaults?.childGuests?.[index] ?? { title: "Master", firstName: "", lastName: "", age: 0 },
        ),
      });
      setQuoteStatus("ready");
    } catch {
      setQuoteStatus("missing");
    }
  }, [prefill, quoteToken, resorts, guestDefaults]);

  if (quoteStatus === "loading") {
    return null;
  }

  if (quoteStatus === "missing") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Quote expired</h2>
        <p className="mt-2 text-sm text-slate-600">Start in the calculator to generate a fresh booking quote.</p>
        <button
          type="button"
          onClick={() => router.push("/calculator")}
          className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Back to calculator
        </button>
      </div>
    );
  }

  return (
    <BookingFlow
      prefill={resolvedPrefill}
      resorts={resorts}
      startAtGuestInfo={startAtGuestInfo}
      flowLabel={flowLabel}
      hideDepositBadge={hideDepositBadge}
      stepDisplayOffset={stepDisplayOffset}
      totalStepsOverride={totalStepsOverride}
      quoteToken={quoteToken}
      onGuestInfoSubmit={onGuestInfoSubmit}
      initialGuest={resolvedGuestDefaults}
      signInHref={signInHref}
      onSignInClick={onSignInClick}
      onGuestInfoNext={
        onGuestInfoNextPath
          ? () => {
              router.push(onGuestInfoNextPath);
            }
          : undefined
      }
      onComplete={(bookingId) => {
        router.push(`/guest?booking=${encodeURIComponent(bookingId)}`);
      }}
    />
  );
}
