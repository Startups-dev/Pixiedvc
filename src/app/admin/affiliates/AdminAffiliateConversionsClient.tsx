"use client";

import { useState } from "react";

export type AffiliateConversionRow = {
  id: string;
  status: string;
  booking_amount_usd: number | null;
  commission_rate: number;
  commission_amount_usd: number | null;
  confirmed_at: string | null;
  created_at: string;
  affiliate: { display_name: string } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function AdminAffiliateConversionsClient({
  conversions,
}: {
  conversions: AffiliateConversionRow[];
}) {
  const [savingId, setSavingId] = useState<string | null>(null);

  async function handleSave(id: string, status: string, bookingAmount: string) {
    setSavingId(id);
    const response = await fetch("/api/admin/affiliates/conversions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        booking_amount_usd: bookingAmount ? Number(bookingAmount) : null,
      }),
    });
    setSavingId(null);
    if (!response.ok) {
      alert("Unable to update conversion.");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Conversions</p>
          <h2 className="text-lg font-semibold text-slate-900">Recent affiliate bookings</h2>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-500">No guest PII</span>
      </div>

      <div className="space-y-3 text-sm text-slate-600">
        {conversions.length === 0 ? (
          <p>No conversions yet.</p>
        ) : (
          conversions.map((conversion) => (
            <ConversionRow key={conversion.id} conversion={conversion} onSave={handleSave} savingId={savingId} />
          ))
        )}
      </div>
    </div>
  );
}

function ConversionRow({
  conversion,
  onSave,
  savingId,
}: {
  conversion: AffiliateConversionRow;
  onSave: (id: string, status: string, bookingAmount: string) => void;
  savingId: string | null;
}) {
  const [status, setStatus] = useState(conversion.status);
  const [bookingAmount, setBookingAmount] = useState(
    conversion.booking_amount_usd ? String(conversion.booking_amount_usd) : "",
  );

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">{conversion.affiliate?.display_name ?? "Affiliate"}</p>
          <p className="text-xs text-slate-500">
            {conversion.confirmed_at
              ? new Date(conversion.confirmed_at).toLocaleDateString()
              : new Date(conversion.created_at).toLocaleDateString()}
          </p>
          <p className="text-xs text-slate-400">
            Commission {Math.round(conversion.commission_rate * 100)}%
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">
          {conversion.status}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Booking amount (USD)
          <input
            value={bookingAmount}
            onChange={(event) => setBookingAmount(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            placeholder="2500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="void">Void</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onSave(conversion.id, status, bookingAmount)}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            disabled={savingId === conversion.id}
          >
            {savingId === conversion.id ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {conversion.commission_amount_usd ? (
        <p className="mt-2 text-xs text-slate-500">
          Current commission: {formatCurrency(Number(conversion.commission_amount_usd))}
        </p>
      ) : null}
    </div>
  );
}
