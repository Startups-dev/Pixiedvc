"use client";

import { useMemo, useState } from "react";

export type AffiliateOption = {
  id: string;
  display_name: string;
  email: string;
  payout_email: string | null;
  referral_code: string | null;
  slug: string;
  commission_rate: number;
};

export type PayoutRunRow = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
};

export type PayoutItemRow = {
  id: string;
  payout_run_id: string;
  affiliate_id: string;
  amount_usd: number;
  booking_count: number;
  booking_request_ids: string[];
  status: string;
  paid_at: string | null;
  payout_reference: string | null;
  created_at: string;
};

type PaidModalState = {
  item: PayoutItemRow;
  reference: string;
  paidDate: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

function escapeCsv(value: string) {
  if (/["]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  if (/[\n,]/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

export default function AdminAffiliatePayoutsClient({
  affiliates,
  payoutRuns,
  payoutItems,
}: {
  affiliates: AffiliateOption[];
  payoutRuns: PayoutRunRow[];
  payoutItems: PayoutItemRow[];
}) {
  const [form, setForm] = useState({ periodStart: "", periodEnd: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [paidModal, setPaidModal] = useState<PaidModalState | null>(null);

  const affiliateLookup = useMemo(() => new Map(affiliates.map((affiliate) => [affiliate.id, affiliate])), [affiliates]);

  const itemsByRun = useMemo(() => {
    const map = new Map<string, PayoutItemRow[]>();
    payoutItems.forEach((item) => {
      const bucket = map.get(item.payout_run_id) ?? [];
      bucket.push(item);
      map.set(item.payout_run_id, bucket);
    });
    return map;
  }, [payoutItems]);

  const handleGenerate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/affiliates/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period_start: form.periodStart, period_end: form.periodEnd }),
    });

    setSaving(false);
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to generate payout run.");
      return;
    }

    const warnings: string[] = [];
    if (payload?.missing_amount_field) warnings.push("Booking amount field missing; totals set to 0.");
    if (payload?.missing_amount_count) {
      warnings.push(`Missing booking amounts for ${payload.missing_amount_count} bookings; totals set to 0.`);
    }
    if (payload?.unmatched_referrals) warnings.push(`${payload.unmatched_referrals} bookings had unknown referral codes.`);
    if (payload?.status_filter_applied === false) warnings.push("Booking status column missing; totals unverified.");

    setMessage(warnings.length ? warnings.join(" ") : "Payout run generated.");
    window.location.reload();
  };

  const handleMarkRunPaid = async (runId: string) => {
    if (!confirm("Mark this payout run as paid? This will not update individual items.")) {
      return;
    }

    const response = await fetch("/api/admin/affiliates/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_run_paid", run_id: runId }),
    });

    if (response.ok) {
      window.location.reload();
    }
  };

  const handleVoidItem = async (itemId: string) => {
    if (!confirm("Void this payout item?")) {
      return;
    }

    const response = await fetch("/api/admin/affiliates/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "void_item", item_id: itemId }),
    });

    if (response.ok) {
      window.location.reload();
    }
  };

  const handleMarkPaid = (item: PayoutItemRow) => {
    const today = new Date();
    const paidDate = today.toISOString().slice(0, 10);
    setPaidModal({ item, reference: item.payout_reference ?? "", paidDate });
  };

  const submitMarkPaid = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paidModal) return;

    const paidAt = paidModal.paidDate ? new Date(`${paidModal.paidDate}T00:00:00Z`).toISOString() : null;
    const response = await fetch("/api/admin/affiliates/payouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark_item_paid",
        item_id: paidModal.item.id,
        payout_reference: paidModal.reference.trim() || null,
        paid_at: paidAt,
      }),
    });

    if (response.ok) {
      setPaidModal(null);
      window.location.reload();
    }
  };

  const handleExportCsv = (runId: string) => {
    const items = itemsByRun.get(runId) ?? [];
    if (items.length === 0) return;

    const header = ["affiliate", "payout_email", "amount", "booking_count", "reference"];
    const rows = items.map((item) => {
      const affiliate = affiliateLookup.get(item.affiliate_id);
      const display = affiliate?.display_name ?? "Affiliate";
      const code = affiliate?.referral_code ?? affiliate?.slug ?? "";
      const label = code ? `${display} (${code})` : display;

      return [
        label,
        affiliate?.payout_email ?? "",
        String(Number(item.amount_usd ?? 0)),
        String(item.booking_count ?? 0),
        item.payout_reference ?? "",
      ];
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `affiliate-payout-run-${runId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleGenerate} className="space-y-4 text-sm text-slate-700">
        <h2 className="text-lg font-semibold text-slate-900">Create payout run</h2>
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
        <p className="text-xs text-slate-500">
          Uses booking_requests.created_at with status confirmed when available. Referral codes are matched to affiliates by referral_code or slug.
        </p>
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          disabled={saving}
        >
          {saving ? "Generating…" : "Generate totals"}
        </button>
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      </form>

      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-slate-900">Payout runs</h2>
        {payoutRuns.length === 0 ? (
          <p className="text-sm text-muted">No payout runs yet.</p>
        ) : (
          payoutRuns.map((run) => {
            const runItems = itemsByRun.get(run.id) ?? [];
            const amountUnavailable = run.notes?.includes("Missing booking amount") ?? false;
            const amountWarning = run.notes?.match(/Missing booking amount/) ? run.notes : null;

            return (
              <div key={run.id} className="space-y-4 rounded-2xl border border-slate-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{run.status}</p>
                    <p className="text-base font-semibold text-slate-900">
                      {new Date(run.period_start).toLocaleDateString()} – {new Date(run.period_end).toLocaleDateString()}
                    </p>
                    {run.notes ? <p className="text-xs text-slate-500">{run.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExportCsv(run.id)}
                      className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                    >
                      Export CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkRunPaid(run.id)}
                      className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                    >
                      Mark run as paid
                    </button>
                  </div>
                </div>

                {amountWarning ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                    {amountWarning}
                  </div>
                ) : null}

                {runItems.length === 0 ? (
                  <p className="text-sm text-slate-500">No qualifying bookings in this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs text-slate-600">
                      <thead className="border-b border-slate-100 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        <tr>
                          <th className="px-2 py-2">Affiliate</th>
                          <th className="px-2 py-2">Payout email</th>
                          <th className="px-2 py-2">Bookings</th>
                          <th className="px-2 py-2">Total booking</th>
                          <th className="px-2 py-2">Commission rate</th>
                          <th className="px-2 py-2">Amount owed</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runItems.map((item) => {
                          const affiliate = affiliateLookup.get(item.affiliate_id);
                          const referralLabel = affiliate?.referral_code ?? affiliate?.slug ?? "";
                          const displayName = affiliate?.display_name ?? "Affiliate";
                          const commissionRate = Number(affiliate?.commission_rate ?? 0);
                          const totalBooking = amountUnavailable || commissionRate <= 0 ? null : Number(item.amount_usd ?? 0) / commissionRate;

                          return (
                            <tr key={item.id} className="border-b border-slate-100">
                              <td className="px-2 py-2">
                                <p className="font-semibold text-slate-900">{displayName}</p>
                                <p className="text-xs text-slate-400">{referralLabel}</p>
                              </td>
                              <td className="px-2 py-2">{affiliate?.payout_email ?? "—"}</td>
                              <td className="px-2 py-2">{item.booking_count}</td>
                              <td className="px-2 py-2">
                                {totalBooking === null ? "—" : formatCurrency(totalBooking)}
                              </td>
                              <td className="px-2 py-2">{(commissionRate * 100).toFixed(1)}%</td>
                              <td className="px-2 py-2 font-semibold text-slate-900">{formatCurrency(Number(item.amount_usd ?? 0))}</td>
                              <td className="px-2 py-2">
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleMarkPaid(item)}
                                    className="text-xs font-semibold text-emerald-700 hover:underline"
                                  >
                                    Mark paid
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVoidItem(item.id)}
                                    className="text-xs font-semibold text-rose-600 hover:underline"
                                  >
                                    Void
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {paidModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Mark payout as paid</h3>
            <form onSubmit={submitMarkPaid} className="mt-4 space-y-3 text-sm">
              <label className="flex flex-col gap-1">
                Reference (optional)
                <input
                  value={paidModal.reference}
                  onChange={(event) => setPaidModal({ ...paidModal, reference: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1">
                Paid date
                <input
                  type="date"
                  value={paidModal.paidDate}
                  onChange={(event) => setPaidModal({ ...paidModal, paidDate: event.target.value })}
                  className="rounded-2xl border border-slate-200 px-3 py-2"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaidModal(null)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
