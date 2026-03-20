"use client";

import { useState } from "react";
import { affiliateInput, affiliatePrimaryButton, affiliateTextMuted } from "@/lib/affiliate-theme";

export default function AffiliatePayoutEmailForm({ initialEmail }: { initialEmail: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

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
      setMessage({ tone: "error", text: "Unable to update payout email." });
      return;
    }

    setMessage({ tone: "success", text: "Payout email updated." });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className={`flex flex-col gap-1.5 text-sm ${affiliateTextMuted}`}>
        <span className="font-semibold text-slate-300">PayPal/Wise email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={`${affiliateInput} text-slate-200 placeholder:text-slate-500`}
        />
      </label>
      <button
        type="submit"
        className={`rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-60 ${affiliatePrimaryButton}`}
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {message ? (
        <p
          className={`rounded-xl border px-3 py-2 text-xs ${
            message.tone === "success"
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-400/10 text-rose-200"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
