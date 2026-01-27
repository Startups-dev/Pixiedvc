"use client";

import { useState } from "react";

export default function ExceptionRequestForm({ rentalId }: { rentalId: string }) {
  const [type, setType] = useState("modification");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    const response = await fetch(`/api/owner/rentals/${rentalId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, message: message.trim() || null }),
    });

    if (!response.ok) {
      setStatus("Unable to submit request.");
      setLoading(false);
      return;
    }

    setStatus("Request sent to concierge.");
    setLoading(false);
    setMessage("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Request type</label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs"
        >
          <option value="modification">Modification</option>
          <option value="cancellation">Cancellation</option>
        </select>
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Share what needs to change. We'll follow up quickly."
        className="min-h-[90px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-ink"
      />
      <button
        type="submit"
        className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
        disabled={loading}
      >
        {loading ? "Sending…" : "Send request"}
      </button>
      {status ? <p className="text-xs text-emerald-700">{status}</p> : null}
    </form>
  );
}
