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
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  voided_by: string | null;
  voided_at: string | null;
  void_reason: string | null;
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

  async function handleSave(
    id: string,
    status: string,
    bookingAmount: string,
    reviewNotes: string,
    voidReason: string,
  ) {
    if (status === "void" && !voidReason.trim()) {
      alert("Void reason is required.");
      return;
    }
    setSavingId(id);
    const response = await fetch("/api/admin/affiliates/conversions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        status,
        booking_amount_usd: bookingAmount ? Number(bookingAmount) : null,
        review_notes: reviewNotes.trim() || null,
        void_reason: voidReason.trim() || null,
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
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Conversions</p>
          <h2 className="text-lg font-semibold" style={{ color: "#64748b" }}>Recent affiliate bookings</h2>
        </div>
        <span className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">No guest PII</span>
      </div>

      <div className="space-y-3 text-sm text-[#b4b4b4]">
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
  onSave: (
    id: string,
    status: string,
    bookingAmount: string,
    reviewNotes: string,
    voidReason: string,
  ) => void;
  savingId: string | null;
}) {
  const [status, setStatus] = useState(conversion.status);
  const [bookingAmount, setBookingAmount] = useState(
    conversion.booking_amount_usd ? String(conversion.booking_amount_usd) : "",
  );
  const [reviewNotes, setReviewNotes] = useState(conversion.review_notes ?? "");
  const [voidReason, setVoidReason] = useState(conversion.void_reason ?? "");

  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-[#ececec]">{conversion.affiliate?.display_name ?? "Affiliate"}</p>
          <p className="text-xs text-[#8e8ea0]">
            {conversion.confirmed_at
              ? new Date(conversion.confirmed_at).toLocaleDateString()
              : new Date(conversion.created_at).toLocaleDateString()}
          </p>
          <p className="text-xs text-[#8e8ea0]">
            Commission {Math.round(conversion.commission_rate * 100)}%
          </p>
          {conversion.reviewed_at ? (
            <p className="text-xs text-[#8e8ea0]">
              Reviewed {new Date(conversion.reviewed_at).toLocaleString()} by {conversion.reviewed_by ?? "admin"}
            </p>
          ) : null}
          {conversion.voided_at ? (
            <p className="text-xs text-[#8e8ea0]">
              Voided {new Date(conversion.voided_at).toLocaleString()} by {conversion.voided_by ?? "admin"}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#b4b4b4]">
          {conversion.status}
        </span>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
          Booking amount (USD)
          <input
            value={bookingAmount}
            onChange={(event) => setBookingAmount(event.target.value)}
            className="rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm text-[#ececec] placeholder:text-[#8e8ea0]"
            placeholder="2500"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
          Status
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm text-[#ececec]"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="void">Void</option>
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => onSave(conversion.id, status, bookingAmount, reviewNotes, voidReason)}
            className="rounded-full bg-[#10a37f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d8c6d]"
            disabled={savingId === conversion.id}
          >
            {savingId === conversion.id ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
          Review notes
          <textarea
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            className="min-h-20 rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm normal-case tracking-normal text-[#ececec] placeholder:text-[#8e8ea0]"
            placeholder="Optional notes for approval review"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
          Void reason
          <textarea
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            className="min-h-20 rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm normal-case tracking-normal text-[#ececec] placeholder:text-[#8e8ea0]"
            placeholder="Required when status is Void"
          />
        </label>
      </div>

      {conversion.commission_amount_usd ? (
        <p className="mt-2 text-xs text-[#8e8ea0]">
          Current commission: {formatCurrency(Number(conversion.commission_amount_usd))}
        </p>
      ) : null}
    </div>
  );
}
