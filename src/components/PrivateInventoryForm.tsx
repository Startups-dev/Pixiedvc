"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type PrivateInventoryRow = {
  id: string;
  created_at: string;
  status: string;
  urgency_window: string;
  points_available: number;
  points_expiry_date: string | null;
  home_resort: string | null;
  resorts_allowed: string[] | null;
  already_booked: boolean;
  fastest_possible: boolean;
  min_net_to_owner_usd: number | null;
};

type PrivateInventoryFormProps = {
  ownerId: string;
  initialSubmissions: PrivateInventoryRow[];
};

type ReservationDetails = {
  resort: string;
  room_type: string;
  view: string;
  check_in: string;
  check_out: string;
  sleeps: string;
};

const urgencyOptions = [
  { value: "24h", label: "24 hours" },
  { value: "48h", label: "48 hours" },
  { value: "7d", label: "7 days" },
];

const statusLabel: Record<string, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  approved: "Approved",
  offered: "Offered",
  used: "Used",
  closed: "Closed",
  rejected: "Rejected",
};

export default function PrivateInventoryForm({ ownerId, initialSubmissions }: PrivateInventoryFormProps) {
  const [urgencyWindow, setUrgencyWindow] = useState("48h");
  const [pointsExpiryDate, setPointsExpiryDate] = useState("");
  const [useYear, setUseYear] = useState("");
  const [pointsAvailable, setPointsAvailable] = useState("");
  const [homeResort, setHomeResort] = useState("");
  const [resortsAllowed, setResortsAllowed] = useState("");
  const [travelFlexibility, setTravelFlexibility] = useState("");
  const [alreadyBooked, setAlreadyBooked] = useState(false);
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails>({
    resort: "",
    room_type: "",
    view: "",
    check_in: "",
    check_out: "",
    sleeps: "",
  });
  const [fastestPossible, setFastestPossible] = useState(false);
  const [minNetToOwner, setMinNetToOwner] = useState("");
  const [ackPricing, setAckPricing] = useState(false);
  const [ackResponse, setAckResponse] = useState(false);
  const [submissions, setSubmissions] = useState<PrivateInventoryRow[]>(initialSubmissions);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resortsAllowedList = useMemo(
    () =>
      resortsAllowed
        .split(",")
        .map((resort) => resort.trim())
        .filter(Boolean),
    [resortsAllowed],
  );

  const resetForm = () => {
    setUrgencyWindow("48h");
    setPointsExpiryDate("");
    setUseYear("");
    setPointsAvailable("");
    setHomeResort("");
    setResortsAllowed("");
    setTravelFlexibility("");
    setAlreadyBooked(false);
    setConfirmationNumber("");
    setReservationDetails({
      resort: "",
      room_type: "",
      view: "",
      check_in: "",
      check_out: "",
      sleeps: "",
    });
    setFastestPossible(false);
    setMinNetToOwner("");
    setAckPricing(false);
    setAckResponse(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const points = Number(pointsAvailable);
    if (!pointsAvailable || Number.isNaN(points) || points < 0) {
      setError("Enter the number of points you can place urgently.");
      return;
    }
    if (!ackPricing || !ackResponse) {
      setError("Please confirm the acknowledgements before submitting.");
      return;
    }
    if (!fastestPossible && (!minNetToOwner || Number.isNaN(Number(minNetToOwner)))) {
      setError("Add a minimum net amount or mark fastest possible.");
      return;
    }
    if (alreadyBooked && !confirmationNumber.trim()) {
      setError("Confirmation number is required when a reservation is already booked.");
      return;
    }

    const payload = {
      owner_id: ownerId,
      urgency_window: urgencyWindow,
      points_expiry_date: pointsExpiryDate || null,
      use_year: useYear || null,
      points_available: points,
      home_resort: homeResort || null,
      resorts_allowed: resortsAllowedList.length ? resortsAllowedList : null,
      travel_date_flexibility: travelFlexibility || null,
      already_booked: alreadyBooked,
      existing_confirmation_number: alreadyBooked ? confirmationNumber.trim() : null,
      existing_reservation_details: alreadyBooked
        ? {
            resort: reservationDetails.resort || null,
            room_type: reservationDetails.room_type || null,
            view: reservationDetails.view || null,
            check_in: reservationDetails.check_in || null,
            check_out: reservationDetails.check_out || null,
            sleeps: reservationDetails.sleeps || null,
          }
        : null,
      min_net_to_owner_usd: fastestPossible ? null : Number(minNetToOwner),
      fastest_possible: fastestPossible,
    };

    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("private_inventory")
      .insert(payload)
      .select(
        "id, created_at, status, urgency_window, points_available, points_expiry_date, home_resort, resorts_allowed, already_booked, fastest_possible, min_net_to_owner_usd",
      )
      .single();

    if (insertError) {
      setError("Unable to submit at this time. Please try again.");
      setIsSubmitting(false);
      return;
    }

    setSubmissions((prev) => [data as PrivateInventoryRow, ...prev]);
    setSuccess("Submitted for private review.");
    resetForm();
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Time Sensitivity</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {urgencyOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
                  urgencyWindow === option.value
                    ? "border-slate-400 bg-slate-50 text-slate-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                <span>{option.label}</span>
                <input
                  type="radio"
                  name="urgency_window"
                  value={option.value}
                  checked={urgencyWindow === option.value}
                  onChange={() => setUrgencyWindow(option.value)}
                />
              </label>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Points expiry date</label>
              <input
                type="date"
                value={pointsExpiryDate}
                onChange={(event) => setPointsExpiryDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Use year</label>
              <input
                type="text"
                value={useYear}
                onChange={(event) => setUseYear(event.target.value)}
                placeholder="2025"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Points available</label>
              <input
                type="number"
                min={0}
                value={pointsAvailable}
                onChange={(event) => setPointsAvailable(event.target.value)}
                placeholder="120"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">What can you offer?</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Home resort</label>
              <input
                type="text"
                value={homeResort}
                onChange={(event) => setHomeResort(event.target.value)}
                placeholder="Bay Lake Tower"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Resorts allowed</label>
              <input
                type="text"
                value={resortsAllowed}
                onChange={(event) => setResortsAllowed(event.target.value)}
                placeholder="Bay Lake Tower, Riviera, Polynesian"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <p className="text-xs text-slate-500">Comma-separated list is fine for now.</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Travel flexibility</label>
            <textarea
              rows={3}
              value={travelFlexibility}
              onChange={(event) => setTravelFlexibility(event.target.value)}
              placeholder="Any time between April 3–8 works."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Already have a reservation booked?</p>
              <p className="text-sm text-slate-600">Share the confirmation so we can place it quickly.</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={alreadyBooked}
                onChange={(event) => setAlreadyBooked(event.target.checked)}
              />
              Yes
            </label>
          </div>
          {alreadyBooked && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  Confirmation number
                </label>
                <input
                  type="text"
                  value={confirmationNumber}
                  onChange={(event) => setConfirmationNumber(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  placeholder="ABC12345"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Resort</label>
                  <input
                    type="text"
                    value={reservationDetails.resort}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, resort: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Room type</label>
                  <input
                    type="text"
                    value={reservationDetails.room_type}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, room_type: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">View</label>
                  <input
                    type="text"
                    value={reservationDetails.view}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, view: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Sleeps</label>
                  <input
                    type="text"
                    value={reservationDetails.sleeps}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, sleeps: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Check-in</label>
                  <input
                    type="date"
                    value={reservationDetails.check_in}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, check_in: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Check-out</label>
                  <input
                    type="date"
                    value={reservationDetails.check_out}
                    onChange={(event) =>
                      setReservationDetails((prev) => ({ ...prev, check_out: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Pricing preference</p>
          <label className="flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={fastestPossible}
              onChange={(event) => setFastestPossible(event.target.checked)}
            />
            Fastest possible placement (no minimum)
          </label>
          {!fastestPossible && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Minimum net to owner (USD)
              </label>
              <input
                type="number"
                min={0}
                value={minNetToOwner}
                onChange={(event) => setMinNetToOwner(event.target.value)}
                placeholder="2200"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={ackPricing} onChange={(event) => setAckPricing(event.target.checked)} />
            <span>I understand this is a private placement program and pricing may be lower due to urgency.</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={ackResponse} onChange={(event) => setAckResponse(event.target.checked)} />
            <span>I can respond quickly if PixieDVC needs confirmation.</span>
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting..." : "Submit urgent placement"}
        </button>
      </form>

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Your submissions</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Private placement requests</h2>
          <p className="text-sm text-slate-600">We will reach out if we need follow-up details.</p>
        </div>
        {submissions.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
            No urgent placements submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => (
              <div key={submission.id} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {submission.points_available} pts · {submission.urgency_window}
                  </p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                    {statusLabel[submission.status] ?? submission.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Submitted {new Date(submission.created_at).toLocaleDateString()}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  {submission.home_resort && <span>Home: {submission.home_resort}</span>}
                  {submission.points_expiry_date && <span>Expiry: {submission.points_expiry_date}</span>}
                  {submission.already_booked && <span>Reservation already booked</span>}
                  {submission.fastest_possible ? (
                    <span>Fastest placement</span>
                  ) : (
                    submission.min_net_to_owner_usd && <span>Min net: ${submission.min_net_to_owner_usd}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
