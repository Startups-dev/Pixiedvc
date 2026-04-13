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
  originalGuestPricePerPointCents,
  currentGuestPricePerPointCents,
}: {
  readyStayId: string;
  initialOwnerPricePerPointCents: number;
  originalGuestPricePerPointCents: number | null;
  currentGuestPricePerPointCents: number;
}) {
  const router = useRouter();
  const [ownerPricePerPointCents, setOwnerPricePerPointCents] = useState(initialOwnerPricePerPointCents);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const projectedGuestPrice = ownerPricePerPointCents + 700;

  const hasMarkdown =
    originalGuestPricePerPointCents != null && currentGuestPricePerPointCents < originalGuestPricePerPointCents;

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

      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update listing price.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-muted">
        Lower the guest-facing listing price for this Ready Stay to improve sell-through.
      </p>
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner payout / point</span>
        <input
          type="number"
          min={0}
          step={1}
          value={ownerPricePerPointCents}
          onChange={(event) => setOwnerPricePerPointCents(Number(event.target.value))}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-ink"
        />
      </label>
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Guest listing price after update:{" "}
        <span className="font-semibold text-ink">{formatCurrencyFromCents(projectedGuestPrice)}</span>
        {" /pt"}
      </div>
      {hasMarkdown ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Price currently reduced</p>
      ) : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Updating..." : "Update Listing Price"}
      </Button>
    </form>
  );
}
