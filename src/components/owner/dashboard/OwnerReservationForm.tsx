"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@pixiedvc/design-system";

type ResortOption = {
  id: string;
  name: string;
  calculator_code: string | null;
};

type OwnerReservationFormProps = {
  resorts: ResortOption[];
};

export default function OwnerReservationForm({ resorts }: OwnerReservationFormProps) {
  const router = useRouter();
  const [resortId, setResortId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [roomType, setRoomType] = useState("");
  const [points, setPoints] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const pointsValue = Number(points);
    const payload = {
      resort_id: resortId,
      check_in: checkIn,
      check_out: checkOut,
      room_type: roomType,
      points: pointsValue,
      confirmation_number: confirmationNumber.trim() || null,
      confirmation_uploaded: Boolean(confirmationNumber.trim()),
    };

    if (!payload.resort_id || !payload.check_in || !payload.check_out || !payload.room_type || !Number.isFinite(pointsValue) || pointsValue <= 0) {
      setError("Please complete all required fields.");
      return;
    }

    if (payload.check_in >= payload.check_out) {
      setError("Check-out must be after check-in.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/owner/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => ({}))) as { rentalId?: string; error?: string };
      if (!response.ok || !result.rentalId) {
        throw new Error(result.error || "Unable to create reservation.");
      }
      router.push(`/owner/rentals/${result.rentalId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create reservation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
        Resort
        <select
          value={resortId}
          onChange={(event) => setResortId(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
        >
          <option value="">Select a resort</option>
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
          Check-in
          <input
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
          Check-out
          <input
            type="date"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
          Room type
          <input
            value={roomType}
            onChange={(event) => setRoomType(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
            placeholder="Deluxe Studio"
          />
        </label>
        <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
          Points
          <input
            type="number"
            min={0}
            step={1}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
            placeholder="0"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
        Disney confirmation number (optional)
        <input
          value={confirmationNumber}
          onChange={(event) => setConfirmationNumber(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
          placeholder="Enter confirmation number"
        />
      </label>

      {error ? <p className="text-xs text-rose-600">{error}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add reservation"}
      </Button>
    </form>
  );
}
