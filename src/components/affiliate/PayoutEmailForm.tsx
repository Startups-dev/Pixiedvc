"use client";

import { useState } from "react";

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
      setMessage({
        tone: "error",
        text: "We couldn’t update your payout email. Your previous details are still saved.",
      });
      return;
    }

    setMessage({ tone: "success", text: "Your payout email has been updated." });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex flex-col gap-2 text-[15px] leading-6 text-[#58657A]">
        <span className="font-semibold text-[#0F2148]">Payout email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-12 rounded-xl border border-[#0F2148]/12 bg-white px-4 text-[15px] text-[#0F2148] shadow-[0_8px_24px_rgba(15,33,72,0.04)] outline-none transition placeholder:text-[#8A94A6] focus:border-[#D6B45A]/70 focus:ring-2 focus:ring-[#D6B45A]/20"
        />
      </label>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0F2148] px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#173A72] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6B45A] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={saving}
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {message ? (
        <p
          className={`rounded-xl border px-3 py-2 text-[13px] leading-5 ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
