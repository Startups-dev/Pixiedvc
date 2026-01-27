"use client";

import { useMemo, useState } from "react";

export type AffiliateOption = {
  id: string;
  display_name: string;
  email: string;
};

export type PayoutRow = {
  id: string;
  affiliate_id: string;
  period_start: string;
  period_end: string;
  status: string;
  total_amount_usd: number;
  paypal_reference: string | null;
  created_at: string;
  paid_at: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function AdminPayoutsClient({
  affiliates,
  payouts,
}: {
  affiliates: AffiliateOption[];
  payouts: PayoutRow[];
}) {
  const [form, setForm] = useState({
    affiliateId: affiliates[0]?.id ?? "",
    periodStart: "",
    periodEnd: "",
    status: "processing",
    paypalReference: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const affiliateLookup = useMemo(
    () => new Map(affiliates.map((affiliate) => [affiliate.id, affiliate])),
    [affiliates],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        affiliate_id: form.affiliateId,
        period_start: form.periodStart,
        period_end: form.periodEnd,
        status: form.status,
        paypal_reference: form.paypalReference.trim() || null,
      }),
    });

    setSaving(false);
    if (!response.ok) {
      setMessage("Unable to create payout. Check dates and status.");
      return;
    }

    setMessage("Payout created.");
    window.location.reload();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Create payout</h2>
        <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-700">
          <label className="flex flex-col gap-1">
            Affiliate
            <select
              value={form.affiliateId}
              onChange={(event) => setForm({ ...form, affiliateId: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
              required
            >
              {affiliates.map((affiliate) => (
                <option key={affiliate.id} value={affiliate.id}>
                  {affiliate.display_name} ({affiliate.email})
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              Period start
              <input
                type="date"
                value={form.periodStart}
                onChange={(event) => setForm({ ...form, periodStart: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
                required
              />
            </label>
            <label className="flex flex-col gap-1">
              Period end
              <input
                type="date"
                value={form.periodEnd}
                onChange={(event) => setForm({ ...form, periodEnd: event.target.value })}
                className="rounded-2xl border border-slate-200 px-3 py-2"
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            Status
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
            >
              <option value="scheduled">Scheduled</option>
              <option value="processing">Processing</option>
              <option value="paid">Paid</option>
              <option value="void">Void</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            PayPal reference (optional)
            <input
              value={form.paypalReference}
              onChange={(event) => setForm({ ...form, paypalReference: event.target.value })}
              className="rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
            disabled={saving}
          >
            {saving ? "Creating…" : "Create payout"}
          </button>
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Payout history</h2>
        <div className="space-y-3 text-sm text-slate-600">
          {payouts.length === 0 ? (
            <p>No payouts yet.</p>
          ) : (
            payouts.map((payout) => (
              <div key={payout.id} className="rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {affiliateLookup.get(payout.affiliate_id)?.display_name ?? "Affiliate"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(payout.period_start).toLocaleDateString()} – {new Date(payout.period_end).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
                    {payout.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{formatCurrency(Number(payout.total_amount_usd ?? 0))}</span>
                  <span className="text-xs text-slate-500">
                    {payout.paypal_reference ? `PayPal ${payout.paypal_reference}` : "PayPal ref pending"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
