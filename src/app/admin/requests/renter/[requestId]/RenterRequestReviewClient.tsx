"use client";

import { useState } from "react";

type ReviewStatus = "unreviewed" | "available" | "unavailable" | "needs_clarification";

export default function RenterRequestReviewClient({ requestId, status: initialStatus }: { requestId: string; status: ReviewStatus }) {
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function update(availabilityStatus: Exclude<ReviewStatus, "unreviewed">) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reservations/availability", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, availabilityStatus }),
      });
      if (!response.ok) throw new Error("Could not save availability review.");
      setStatus(availabilityStatus);
    } catch {
      setError("Could not save availability review. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 border-t border-slate-700 pt-4 text-sm">
      <p>Status: <strong>{status.replaceAll("_", " ")}</strong></p>
      <p className="mt-1 text-xs text-slate-400">Availability review does not confirm a reservation.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={saving} onClick={() => void update("available")} className="rounded border border-emerald-500 px-3 py-2 disabled:opacity-50">Dates available</button>
        <button disabled={saving} onClick={() => void update("unavailable")} className="rounded border border-rose-500 px-3 py-2 disabled:opacity-50">Dates unavailable</button>
        <button disabled={saving} onClick={() => void update("needs_clarification")} className="rounded border border-slate-500 px-3 py-2 disabled:opacity-50">Needs clarification</button>
      </div>
      {error ? <p role="alert" className="mt-3 text-rose-300">{error}</p> : null}
    </div>
  );
}
