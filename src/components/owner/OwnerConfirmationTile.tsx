"use client";

import { useState } from "react";

import { Button } from "@pixiedvc/design-system";

type OwnerConfirmationTileProps = {
  rentalId: string;
  initialConfirmationNumber?: string | null;
};

export default function OwnerConfirmationTile({
  rentalId,
  initialConfirmationNumber,
}: OwnerConfirmationTileProps) {
  const [confirmationNumber, setConfirmationNumber] = useState(initialConfirmationNumber ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(Boolean(initialConfirmationNumber));

  if (process.env.NODE_ENV !== "production") {
    console.log("[owner-match] confirmation-ui component", { file: "OwnerConfirmationTile" });
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const cleaned = confirmationNumber.trim();

    if (cleaned.length < 6) {
      setError("Please enter a valid confirmation number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/owner/rentals/${rentalId}/confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation_number: cleaned }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Save confirmation failed");
      }

      setSaved(true);
      window.location.reload();
    } catch (err) {
      setError("We couldn’t save that just now. Please try again.");
      if (process.env.NODE_ENV !== "production") {
        console.error("Owner confirmation save failed", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Next step</p>
      <h3 className="mt-2 text-lg font-semibold text-ink">Enter Disney confirmation number</h3>
      <p className="mt-2 text-sm text-slate-600">
        Submitting your confirmation number starts agreement drafting and unlocks next steps.
      </p>
      {saved ? (
        <p className="mt-4 text-xs font-semibold text-emerald-700">Confirmation number received.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="flex flex-col gap-2 text-xs font-semibold text-slate-600">
            DVC confirmation number
            <input
              value={confirmationNumber}
              onChange={(event) => setConfirmationNumber(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"
              placeholder="Enter confirmation number"
            />
          </label>
          {error ? <p className="text-xs text-rose-600">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save confirmation number"}
          </Button>
        </form>
      )}
    </div>
  );
}
