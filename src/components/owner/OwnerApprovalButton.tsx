"use client";

import { useState } from "react";

type OwnerApprovalButtonProps = {
  rentalId: string;
  disabled?: boolean;
  missing?: string[];
};

export default function OwnerApprovalButton({ rentalId, disabled = false, missing = [] }: OwnerApprovalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;
    setLoading(true);
    setMessage(null);
    setError(false);

    const response = await fetch(`/api/owner/rentals/${rentalId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(true);
      setMessage(payload?.error ?? "Unable to record approval. Please try again.");
      setLoading(false);
      return;
    }

    setMessage("Booking package approved.");
    setLoading(false);
    window.location.reload();
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled || loading}
      >
        {loading ? "Saving…" : "Approve booking package"}
      </button>
      {disabled && missing.length > 0 ? (
        <div className="text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Missing:</span>{" "}
          {missing.map((item) => item).join(", ")}
        </div>
      ) : null}
      {message ? (
        <p className={`text-xs ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>
      ) : null}
    </div>
  );
}
