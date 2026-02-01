"use client";

import { useMemo, useState } from "react";

type RentalRow = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  resort_code: string | null;
  booking_package: Record<string, unknown> | null;
  owner_user_id: string | null;
};

type PayoutRow = {
  id: string;
  rental_id: string;
  owner_user_id: string | null;
  stage: number | null;
  amount_cents: number | null;
  status: string | null;
  eligible_at: string | null;
  released_at: string | null;
  created_at: string | null;
  rentals?: RentalRow | null;
};

function formatCurrency(cents: number | null) {
  if (typeof cents !== "number") return "—";
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function getResortName(pkg?: Record<string, unknown> | null) {
  if (!pkg) return "—";
  const name = pkg.resort_name ?? pkg.resortName ?? pkg.resort;
  return typeof name === "string" && name.trim().length ? name : "—";
}

export default function PayoutsClient({ initialRows }: { initialRows: PayoutRow[] }) {
  const [rows, setRows] = useState<PayoutRow[]>(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(
    () => rows.filter((row) => row.status === "eligible"),
    [rows],
  );
  const pending = useMemo(
    () => rows.filter((row) => row.status === "pending"),
    [rows],
  );

  const handleRelease = async (payoutId: string) => {
    setBusyId(payoutId);
    setError(null);
    try {
      const response = await fetch("/api/admin/payouts/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout_id: payoutId }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to release payout.");
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === payoutId
            ? { ...row, status: "released", released_at: new Date().toISOString() }
            : row,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to release payout.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Ready to release (70%)</h2>
        {eligible.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">No eligible payouts.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Resort</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Eligible</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {eligible.map((row) => {
                  const rental = row.rentals ?? null;
                  const resortName = getResortName(rental?.booking_package);
                  const dateRange = `${formatDate(rental?.check_in)} → ${formatDate(rental?.check_out)}`;
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-slate-800">{resortName}</td>
                      <td className="px-4 py-3 text-slate-600">{dateRange}</td>
                      <td className="px-4 py-3 text-slate-600">{row.stage ?? 70}%</td>
                      <td className="px-4 py-3 text-slate-800">{formatCurrency(row.amount_cents)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(row.eligible_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => handleRelease(row.id)}
                          className="inline-flex items-center rounded-full bg-[#0B1B3A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[#0B1B3A]/90 disabled:opacity-50"
                        >
                          {busyId === row.id ? "Releasing…" : "Mark Paid"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Upcoming (30% at check-in)</h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">No pending payouts.</div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Resort</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => {
                  const rental = row.rentals ?? null;
                  const resortName = getResortName(rental?.booking_package);
                  const dateRange = `${formatDate(rental?.check_in)} → ${formatDate(rental?.check_out)}`;
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-4 py-3 font-medium text-slate-800">{resortName}</td>
                      <td className="px-4 py-3 text-slate-600">{dateRange}</td>
                      <td className="px-4 py-3 text-slate-600">{row.stage ?? 30}%</td>
                      <td className="px-4 py-3 text-slate-800">{formatCurrency(row.amount_cents)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(rental?.check_in)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
