"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@pixiedvc/design-system";

function formatCurrencyFromCents(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export default function ReadyStayMarkdownForm({
  readyStayId,
  initialOwnerPricePerPointCents,
  points,
}: {
  readyStayId: string;
  initialOwnerPricePerPointCents: number;
  points: number;
}) {
  const router = useRouter();
  const [ownerPricePerPointDollars, setOwnerPricePerPointDollars] = useState(
    String(Math.round(initialOwnerPricePerPointCents / 100)),
  );
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerPricePerPointCents = Math.round(Number(ownerPricePerPointDollars || "0") * 100);
  const estimatedOwnerPayout =
    Number.isFinite(ownerPricePerPointCents) && ownerPricePerPointCents > 0 ? ownerPricePerPointCents * points : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/owner/ready-stays", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: readyStayId,
          owner_price_per_point_cents: ownerPricePerPointCents,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Unable to update listing price.");
      }

      setEditing(false);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update listing price.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="mt-1 text-sm text-ink">{formatCurrencyFromCents(ownerPricePerPointCents)}</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing((current) => !current);
          }}
          className="text-sm font-semibold text-[#0F2148] underline underline-offset-4"
        >
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-sm text-muted">
            Adjust your payout per point. Lower payouts may improve placement speed.
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner payout / point</span>
            <input
              type="number"
              min={0}
              step={1}
              value={ownerPricePerPointDollars}
              onChange={(event) => setOwnerPricePerPointDollars(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            Estimated owner payout:{" "}
            <span className="font-semibold text-ink">{formatCurrencyFromCents(estimatedOwnerPayout)}</span>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating..." : "Update Owner Payout"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
