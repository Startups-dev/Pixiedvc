"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FEE_PER_POINT,
  getMaxOwnerPayout,
  getStayGuestPriceCap,
  getSuggestedOwnerPayouts,
} from "@/lib/ready-stays/ownerPricing";

type ResortOption = {
  id: string;
  name: string;
  calculator_code: string | null;
};

type OwnerReservationFormProps = {
  resorts: ResortOption[];
};

const ROOM_TYPE_OPTIONS = [
  "Studio",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "Grand Villa",
  "Cabin",
];

function formatDollars(value: number) {
  return `$${value.toFixed(2)}`;
}

function seasonLabel(season: string) {
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

export default function OwnerReservationForm({ resorts }: OwnerReservationFormProps) {
  const router = useRouter();
  const [resortId, setResortId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [roomType, setRoomType] = useState("");
  const [points, setPoints] = useState("");
  const [calculatedPoints, setCalculatedPoints] = useState<number | null>(null);
  const [pointsQuoteLoading, setPointsQuoteLoading] = useState(false);
  const [pointsQuoteError, setPointsQuoteError] = useState<string | null>(null);
  const [pointsManuallyEdited, setPointsManuallyEdited] = useState(false);
  const pointsValueRef = useRef(points);
  const pointsManuallyEditedRef = useRef(pointsManuallyEdited);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [ownerPayoutPerPoint, setOwnerPayoutPerPoint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedResorts = useMemo(
    () => [...resorts].sort((a, b) => a.name.localeCompare(b.name)),
    [resorts],
  );

  const pricing = useMemo(() => {
    if (!checkIn) return null;

    const cap = getStayGuestPriceCap({ checkIn, checkOut: checkOut || null });
    const maxOwnerPayout = getMaxOwnerPayout({ checkIn, checkOut: checkOut || null });
    const suggestions = getSuggestedOwnerPayouts({ checkIn, checkOut: checkOut || null });

    return {
      seasonType: cap.seasonType,
      capDollars: cap.capDollars,
      maxOwnerPayout,
      suggestions,
    };
  }, [checkIn, checkOut]);

  const ownerPayout = Number(ownerPayoutPerPoint);
  const ownerPayoutValid = Number.isFinite(ownerPayout) && ownerPayout > 0;
  const payoutTooHigh = Boolean(pricing && ownerPayoutValid && ownerPayout > pricing.maxOwnerPayout);
  const hasConfirmationNumber = confirmationNumber.trim().length > 0;
  const guestPays = ownerPayoutValid ? ownerPayout + FEE_PER_POINT : null;
  const pointsCount = Number(points);
  const totalOwnerPayout =
    ownerPayoutValid && Number.isFinite(pointsCount) && pointsCount > 0
      ? ownerPayout * pointsCount
      : null;

  useEffect(() => {
    if (!pricing) return;
    if (!ownerPayoutPerPoint) {
      const fallback = pricing.suggestions[pricing.suggestions.length - 1] ?? pricing.maxOwnerPayout;
      if (fallback > 0) {
        setOwnerPayoutPerPoint(String(fallback));
      }
    }
  }, [ownerPayoutPerPoint, pricing]);

  useEffect(() => {
    pointsValueRef.current = points;
    pointsManuallyEditedRef.current = pointsManuallyEdited;
  }, [points, pointsManuallyEdited]);

  useEffect(() => {
    if (!resortId || !roomType || !checkIn || !checkOut) {
      setPointsQuoteLoading(false);
      setPointsQuoteError(null);
      setCalculatedPoints(null);
      return;
    }

    let cancelled = false;

    async function quotePoints() {
      setPointsQuoteLoading(true);
      setPointsQuoteError(null);

      try {
        const response = await fetch("/api/owner/points-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resort_id: resortId,
            room_type: roomType,
            check_in: checkIn,
            check_out: checkOut,
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          total_points?: number;
        };

        if (!response.ok || !Number.isFinite(payload.total_points)) {
          throw new Error(payload.error || "Unable to calculate points.");
        }

        if (cancelled) return;

        const nextPoints = Number(payload.total_points);
        setCalculatedPoints(nextPoints);

        if (!pointsManuallyEditedRef.current || pointsValueRef.current.trim() === "") {
          setPoints(String(nextPoints));
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to calculate points.";
        setCalculatedPoints(null);
        setPointsQuoteError(message);
      } finally {
        if (!cancelled) {
          setPointsQuoteLoading(false);
        }
      }
    }

    quotePoints();

    return () => {
      cancelled = true;
    };
  }, [resortId, roomType, checkIn, checkOut]);

  useEffect(() => {
    if (!pointsManuallyEdited && points.trim() === "" && calculatedPoints !== null) {
      setPoints(String(calculatedPoints));
    }
  }, [points, pointsManuallyEdited, calculatedPoints]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!ownerPayoutValid) {
      setError("Enter a valid payout per point.");
      return;
    }

    if (pricing && ownerPayout > pricing.maxOwnerPayout) {
      setError(`Too high - the maximum allowed is ${formatDollars(pricing.maxOwnerPayout)}/pt for these dates.`);
      return;
    }

    setSubmitting(true);
    let createdRentalId: string | null = null;

    try {
      const response = await fetch("/api/owner/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resort_id: resortId || null,
          check_in: checkIn || null,
          check_out: checkOut || null,
          room_type: roomType || null,
          points: points ? Number(points) : null,
          confirmation_number: confirmationNumber || null,
          confirmation_uploaded: hasConfirmationNumber,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Unable to save reservation.");
      }

      createdRentalId = payload.rentalId as string;

      if (hasConfirmationNumber) {
        const listingResponse = await fetch("/api/owner/ready-stays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rental_id: createdRentalId,
            owner_price_per_point_cents: Math.round(ownerPayout * 100),
            guest_price_per_point_cents: guestPays ? Math.round(guestPays * 100) : null,
          }),
        });

        const listingPayload = (await listingResponse.json().catch(() => ({}))) as {
          error?: string;
          id?: string | null;
          alreadyListed?: boolean;
        };

        if (!listingResponse.ok) {
          throw new Error(listingPayload.error || "Reservation saved, but listing failed to publish.");
        }

        if (listingPayload.alreadyListed) {
          if (listingPayload.id) {
            router.push(`/owner/ready-stays/${listingPayload.id}`);
          } else {
            router.push("/owner/ready-stays?notice=already-listed");
          }
          router.refresh();
          return;
        }

        router.push("/owner/ready-stays?notice=published");
        router.refresh();
        return;
      }

      router.push(`/owner/rentals/${createdRentalId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save reservation.";
      if (createdRentalId) {
        setError(`${message} Reservation was created; you can finish listing from that reservation page.`);
      } else {
        setError(message);
      }
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Resort
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={resortId}
            onChange={(event) => setResortId(event.target.value)}
            required
          >
            <option value="">Select resort</option>
            {sortedResorts.map((resort) => (
              <option key={resort.id} value={resort.id}>
                {resort.name}
                {resort.calculator_code ? ` (${resort.calculator_code})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Room type
          <select
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={roomType}
            onChange={(event) => setRoomType(event.target.value)}
            required
          >
            <option value="">Select room type</option>
            {ROOM_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Check-in
          <input
            type="date"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            required
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Check-out
          <input
            type="date"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            required
          />
        </label>

        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Points
          <input
            type="number"
            min="1"
            inputMode="numeric"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={points}
            onChange={(event) => {
              const nextValue = event.target.value;
              setPoints(nextValue);
              setPointsManuallyEdited(nextValue.trim() !== "");
            }}
            required
          />
          {pointsQuoteLoading ? (
            <p className="mt-2 text-xs text-slate-500">Calculating points...</p>
          ) : null}
          {pointsQuoteError ? (
            <p className="mt-2 text-xs text-rose-600">{pointsQuoteError}</p>
          ) : null}
          {calculatedPoints !== null && pointsManuallyEdited ? (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-slate-700 underline underline-offset-2 hover:text-slate-900"
              onClick={() => {
                setPoints(String(calculatedPoints));
                setPointsManuallyEdited(false);
              }}
            >
              Use calculated points ({calculatedPoints})
            </button>
          ) : null}
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pricing Tool</p>
          {pricing ? (
            <p className="text-xs font-semibold text-slate-600">
              Strictest season: {seasonLabel(pricing.seasonType)} · Guest cap {formatDollars(pricing.capDollars)}/pt
            </p>
          ) : (
            <p className="text-xs text-slate-500">Choose dates to load season and cap.</p>
          )}
        </div>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Set your payout
          <input
            type="number"
            min="1"
            step="0.01"
            inputMode="decimal"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            value={ownerPayoutPerPoint}
            onChange={(event) => setOwnerPayoutPerPoint(event.target.value)}
            required
          />
        </label>
        {pricing && checkIn && checkOut ? (
          <p className="mt-2 text-xs text-slate-600">
            Max payout for these dates:{" "}
            <span className="font-semibold">{formatDollars(pricing.maxOwnerPayout)}/pt</span> (guest cap{" "}
            {formatDollars(pricing.capDollars)}/pt minus Pixie fee {formatDollars(FEE_PER_POINT)}/pt). You can
            enter any lower amount.
          </p>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            Pick check-in and check-out to calculate your max payout and suggestions.
          </p>
        )}
        {payoutTooHigh && pricing ? (
          <p className="mt-2 text-xs text-rose-600">
            Too high - the maximum allowed is {formatDollars(pricing.maxOwnerPayout)}/pt for these dates.
          </p>
        ) : null}

        {pricing && pricing.suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {pricing.suggestions.map((value, idx) => {
              const label = idx === 0 ? "Fast" : idx === 1 ? "Balanced" : "Max";
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOwnerPayoutPerPoint(String(value))}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
                >
                  {label} · {formatDollars(value)}/pt
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>You receive {ownerPayoutValid ? `${formatDollars(ownerPayout)}/pt` : "—"}</p>
          <p>Total owner payout: {totalOwnerPayout !== null ? formatDollars(totalOwnerPayout) : "—"}</p>
          <p className="mt-2 text-xs text-slate-500">
            Disclosure: the platform charges the guest an additional fee on top of your payout.
          </p>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Caps are market ceilings for brand protection and pricing consistency. You can price below the cap.
        </p>
      </div>

      <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Confirmation number
        <input
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
          value={confirmationNumber}
          onChange={(event) => setConfirmationNumber(event.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 inline-flex items-center rounded-full bg-[#0B1B3A] px-6 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white disabled:opacity-60"
      >
        {submitting ? "Saving…" : hasConfirmationNumber ? "Save & List Ready Stay" : "Save Reservation"}
      </button>
    </form>
  );
}
