"use client";

import { useState } from "react";

export default function AffiliatePayoutEmailForm({ initialEmail }: { initialEmail: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/affiliate/payout-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payout_email: email.trim() || null }),
    });

    setSaving(false);
    if (!response.ok) {
      setMessage("Unable to update payout email.");
      return;
    }

    setMessage("Payout email updated.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        PayPal/Wise email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-ink"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
    </form>
  );
}
