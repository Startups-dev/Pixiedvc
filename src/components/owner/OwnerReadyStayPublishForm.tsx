"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@pixiedvc/design-system";
import { getReadyStayPricingBand, getReadyStaySeason } from "@/lib/ready-stays/pricing";
import { FEE_PER_POINT_CENTS, getMaxOwnerPayout, getStayGuestPriceCap } from "@/lib/ready-stays/ownerPricing";

type ReadyStayRental = {
  id: string;
  resort_id: string | null;
  resort_name: string | null;
  check_in: string;
  check_out: string;
  points_required: number;
  room_type: string | null;
};

type OwnerReadyStayPublishFormProps = {
  rental: ReadyStayRental;
  confirmationReady: boolean;
};


function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function seasonLabel(season: ReturnType<typeof getReadyStaySeason>) {
  switch (season) {
    case "christmas":
      return "Christmas";
    case "halloween":
      return "Halloween";
    case "marathon":
      return "Marathon";
    case "spring_break":
      return "Spring Break";
    case "high":
      return "High Season";
    default:
      return "Normal Season";
  }
}

export default function OwnerReadyStayPublishForm({
  rental,
  confirmationReady,
}: OwnerReadyStayPublishFormProps) {
  const router = useRouter();
  const band = useMemo(
    () => getReadyStayPricingBand({ resort_id: rental.resort_id, check_in: rental.check_in }),
    [rental.check_in, rental.resort_id],
  );
  const stayCap = useMemo(
    () => getStayGuestPriceCap({ checkIn: rental.check_in, checkOut: rental.check_out }),
    [rental.check_in, rental.check_out],
  );
  const maxOwnerCents = useMemo(
    () => Math.round(getMaxOwnerPayout({ checkIn: rental.check_in, checkOut: rental.check_out }) * 100),
    [rental.check_in, rental.check_out],
  );
  const minOwnerCents = Math.min(band.minOwnerCents, maxOwnerCents);
  const season = getReadyStaySeason(rental.check_in);
  const [ownerPrice, setOwnerPrice] = useState(Math.min(band.suggestedOwnerCents, maxOwnerCents));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guestPrice = ownerPrice + FEE_PER_POINT_CENTS;
  const totalGuestCents = guestPrice * rental.points_required;

  const handlePublish = async () => {
    setError(null);
    if (!confirmationReady) {
      setError("Upload the Disney confirmation before listing.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/owner/ready-stays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rental_id: rental.id,
          owner_price_per_point_cents: ownerPrice,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        id?: string | null;
        alreadyListed?: boolean;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to list a Ready Stay.");
      }
      if (payload.alreadyListed) {
        if (payload.id) {
          router.push(`/owner/ready-stays/${payload.id}`);
        } else {
          router.push("/owner/ready-stays?notice=already-listed");
        }
        router.refresh();
        return;
      }
      router.push("/owner/ready-stays?notice=published");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to list a Ready Stay.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Pricing band</p>
        <h2 className="text-xl font-semibold text-ink">List a Ready Stay</h2>
        <p className="text-sm font-semibold text-amber-600">Season: {seasonLabel(season)}</p>
        <p className="text-xs text-slate-500">
          Pricing caps are market ceilings that protect brand trust while keeping listings competitive.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cap</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(stayCap.capDollars * 100)}/pt</p>
          <p className="text-xs text-slate-500">Guest price cap</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Suggested</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(band.suggestedOwnerCents)}/pt</p>
          <p className="text-xs text-slate-500">Owner price per point</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pixie fee</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(FEE_PER_POINT_CENTS)}/pt</p>
          <p className="text-xs text-slate-500">Fixed</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <label className="text-sm font-semibold text-slate-700">
          Owner price per point: {formatDollars(ownerPrice)} /pt
        </label>
        <input
          type="range"
          min={minOwnerCents}
          max={maxOwnerCents}
          step={100}
          value={ownerPrice}
          onChange={(event) => setOwnerPrice(Number(event.target.value))}
          className="w-full accent-[#0B1B3A]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>Min {formatDollars(minOwnerCents)}/pt</span>
          <span>Max {formatDollars(maxOwnerCents)}/pt</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest price</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(guestPrice)}/pt</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest total</p>
          <p className="mt-2 text-lg font-semibold text-ink">{formatDollars(totalGuestCents)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live breakdown</p>
        <div className="mt-2 space-y-1 text-slate-700">
          <p>Owner receives: {formatDollars(ownerPrice)}/pt</p>
          <p>Pixie fee: {formatDollars(FEE_PER_POINT_CENTS)}/pt</p>
          <p>Guest pays: {formatDollars(guestPrice)}/pt</p>
          <p>Total guest price: {formatDollars(totalGuestCents)}</p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handlePublish} disabled={submitting || !confirmationReady}>
          {submitting ? "Listing..." : "List a Ready Stay"}
        </Button>
        {!confirmationReady ? (
          <p className="text-xs text-slate-500">
            Upload the Disney confirmation before listing.
          </p>
        ) : null}
      </div>
    </div>
  );
}
