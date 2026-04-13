"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@pixiedvc/design-system";

type ResortOption = {
  id: string;
  name: string;
};

export default function OwnerLiquidationOpportunityForm({ resorts }: { resorts: ResortOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    home_resort_id: resorts[0]?.id ?? "",
    points_available: "",
    expiration_date: "",
    urgency_level: "moderate",
    travel_window_start: "",
    travel_window_end: "",
    room_type: "",
    target_price_per_point_cents: "",
    flexibility_notes: "",
    newsletter_opt_in: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/owner/liquidation-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_resort_id: form.home_resort_id || null,
          points_available: Number(form.points_available),
          expiration_date: form.expiration_date,
          urgency_level: form.urgency_level,
          travel_window_start: form.travel_window_start || null,
          travel_window_end: form.travel_window_end || null,
          room_type: form.room_type || null,
          target_price_per_point_cents: form.target_price_per_point_cents
            ? Number(form.target_price_per_point_cents)
            : null,
          flexibility_notes: form.flexibility_notes || null,
          newsletter_opt_in: form.newsletter_opt_in,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to submit opportunity.");
      }
      setNotice("Last-minute liquidation opportunity submitted for review.");
      setForm((prev) => ({
        ...prev,
        points_available: "",
        expiration_date: "",
        travel_window_start: "",
        travel_window_end: "",
        room_type: "",
        target_price_per_point_cents: "",
        flexibility_notes: "",
      }));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit opportunity.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Home resort</span>
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.home_resort_id}
          onChange={(event) => setForm((prev) => ({ ...prev, home_resort_id: event.target.value }))}
        >
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Points available</span>
        <input
          type="number"
          min={1}
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.points_available}
          onChange={(event) => setForm((prev) => ({ ...prev, points_available: event.target.value }))}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Expiration date</span>
        <input
          type="date"
          required
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.expiration_date}
          onChange={(event) => setForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
          How quickly do you need to use these points?
        </span>
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.urgency_level}
          onChange={(event) => setForm((prev) => ({ ...prev, urgency_level: event.target.value }))}
        >
          <option value="not_urgent">Not urgent</option>
          <option value="moderate">Moderate</option>
          <option value="urgent">Urgent</option>
        </select>
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Target price / point (cents)</span>
        <input
          type="number"
          min={1}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.target_price_per_point_cents}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, target_price_per_point_cents: event.target.value }))
          }
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="font-semibold uppercase tracking-[0.14em] text-slate-700">How to price your points</p>
          <div className="mt-2 space-y-2">
            <p>
              <span className="font-semibold text-slate-800">60+ days left</span>
              <br />
              - Aim closer to market pricing
              <br />
              - Best if you are not in a rush
            </p>
            <p>
              <span className="font-semibold text-slate-800">30–60 days left</span>
              <br />
              - Consider pricing slightly lower to attract faster interest
            </p>
            <p>
              <span className="font-semibold text-slate-800">Under 30 days</span>
              <br />
              - Price more aggressively to improve the chances of booking in time
            </p>
          </div>
        </div>
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Travel window start</span>
        <input
          type="date"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.travel_window_start}
          onChange={(event) => setForm((prev) => ({ ...prev, travel_window_start: event.target.value }))}
        />
      </label>

      <label className="space-y-1">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Travel window end</span>
        <input
          type="date"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.travel_window_end}
          onChange={(event) => setForm((prev) => ({ ...prev, travel_window_end: event.target.value }))}
        />
      </label>

      <label className="space-y-1 md:col-span-2">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Room type (optional)</span>
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.room_type}
          onChange={(event) => setForm((prev) => ({ ...prev, room_type: event.target.value }))}
          placeholder="Studio, 1 Bedroom, or flexible"
        />
      </label>

      <label className="space-y-1 md:col-span-2">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Flexibility notes</span>
        <textarea
          className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          value={form.flexibility_notes}
          onChange={(event) => setForm((prev) => ({ ...prev, flexibility_notes: event.target.value }))}
          placeholder="Short-notice flexibility, resort swaps, date range notes, etc."
        />
      </label>

      <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
        <input
          type="checkbox"
          checked={form.newsletter_opt_in}
          onChange={(event) => setForm((prev) => ({ ...prev, newsletter_opt_in: event.target.checked }))}
        />
        Include this opportunity in curated newsletter consideration
      </label>

      {error ? <p className="text-sm text-rose-600 md:col-span-2">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700 md:col-span-2">{notice}</p> : null}

      <div className="md:col-span-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Last-Minute Opportunity"}
        </Button>
      </div>
    </form>
  );
}
