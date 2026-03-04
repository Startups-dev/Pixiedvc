"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BookingFlow } from "@pixiedvc/booking-form";
import type { Prefill } from "@pixiedvc/booking-form";
import type { GuestInfoInput } from "@pixiedvc/booking-form";

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
  const [quoteStatus, setQuoteStatus] = useState<"loading" | "ready" | "missing">(
    quoteToken ? "loading" : "ready",
  );

  useEffect(() => {
    if (!quoteToken) {
      setResolvedPrefill(prefill);
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
          checkIn?: string;
          checkOut?: string;
          points?: number;
          totalUSD?: number;
        };
      };
      const quote = parsed?.quote;
      if (!quote) {
        setQuoteStatus("missing");
        return;
      }

      setResolvedPrefill({
        resortId: quote.resortCode ?? prefill.resortId,
        resortName: quote.resortName ?? prefill.resortName,
        villaType: quote.villaType ?? prefill.villaType,
        checkIn: quote.checkIn ?? prefill.checkIn,
        checkOut: quote.checkOut ?? prefill.checkOut,
        points: typeof quote.points === "number" ? quote.points : prefill.points,
        estCash: typeof quote.totalUSD === "number" ? quote.totalUSD : prefill.estCash,
      });
      setQuoteStatus("ready");
    } catch {
      setQuoteStatus("missing");
    }
  }, [prefill, quoteToken]);

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
      initialGuest={guestDefaults}
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
