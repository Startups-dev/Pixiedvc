"use client";

import { useMemo, useState } from "react";

type PrivateInventoryRow = {
  id: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  urgency_window: string;
  points_expiry_date: string | null;
  use_year: string | null;
  points_available: number;
  home_resort: string | null;
  resorts_allowed: string[] | null;
  travel_date_flexibility: string | null;
  already_booked: boolean;
  existing_confirmation_number: string | null;
  existing_reservation_details: Record<string, unknown> | null;
  min_net_to_owner_usd: number | null;
  fastest_possible: boolean;
  status: string;
  internal_notes: string | null;
  assigned_to: string | null;
  offered_to_guest_email: string | null;
  hold_until: string | null;
  closed_reason: string | null;
};

const statusOptions = [
  "submitted",
  "reviewed",
  "approved",
  "offered",
  "used",
  "closed",
  "rejected",
];

const urgencyOptions = ["24h", "48h", "7d"];

const shortId = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

export default function PrivateInventoryTable({ initial }: { initial: PrivateInventoryRow[] }) {
  const [rows, setRows] = useState<PrivateInventoryRow[]>(initial);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => (statusFilter === "all" ? true : row.status === statusFilter))
      .filter((row) => (urgencyFilter === "all" ? true : row.urgency_window === urgencyFilter))
      .sort((a, b) => {
        const aDate = a.points_expiry_date ? new Date(a.points_expiry_date).getTime() : Infinity;
        const bDate = b.points_expiry_date ? new Date(b.points_expiry_date).getTime() : Infinity;
        return aDate - bDate;
      });
  }, [rows, statusFilter, urgencyFilter]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const updateRow = async (id: string, updates: Partial<PrivateInventoryRow>) => {
    setIsSaving(true);
    setError(null);
    const response = await fetch("/api/admin/private-inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    if (!response.ok) {
      setError("Unable to update the record.");
      setIsSaving(false);
      return;
    }
    const payload = (await response.json()) as { ok: boolean; record?: PrivateInventoryRow };
    if (!payload.ok || !payload.record) {
      setError("Unable to update the record.");
      setIsSaving(false);
      return;
    }
    setRows((prev) => prev.map((row) => (row.id === id ? payload.record! : row)));
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Urgency</label>
          <select
            value={urgencyFilter}
            onChange={(event) => setUrgencyFilter(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <option value="all">All</option>
            {urgencyOptions.map((urgency) => (
              <option key={urgency} value={urgency}>
                {urgency}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Urgency</th>
              <th className="px-4 py-3">Booked</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                className={`border-t border-slate-100 ${
                  selectedId === row.id ? "bg-slate-50" : "bg-white"
                }`}
              >
                <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{shortId(row.owner_id)}</td>
                <td className="px-4 py-3">{row.points_available}</td>
                <td className="px-4 py-3">{row.points_expiry_date ?? "N/A"}</td>
                <td className="px-4 py-3">{row.urgency_window}</td>
                <td className="px-4 py-3">{row.already_booked ? "Yes" : "No"}</td>
                <td className="px-4 py-3">
                  {row.fastest_possible ? "Fastest" : row.min_net_to_owner_usd ? `$${row.min_net_to_owner_usd}` : "N/A"}
                </td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">{row.assigned_to ? shortId(row.assigned_to) : "N/A"}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-slate-700 underline underline-offset-4"
                    onClick={() => setSelectedId(row.id)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">
                  No submissions match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="space-y-4 rounded-md border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submission detail</p>
              <h2 className="text-lg font-semibold text-slate-900">
                {selected.points_available} pts · {selected.urgency_window}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-semibold text-slate-500 underline underline-offset-4"
            >
              Close
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Owner:</span> {selected.owner_id}</p>
              <p><span className="font-semibold text-slate-900">Home resort:</span> {selected.home_resort ?? "N/A"}</p>
              <p><span className="font-semibold text-slate-900">Resorts allowed:</span> {selected.resorts_allowed?.join(", ") ?? "N/A"}</p>
              <p><span className="font-semibold text-slate-900">Flexibility:</span> {selected.travel_date_flexibility ?? "N/A"}</p>
              <p><span className="font-semibold text-slate-900">Use year:</span> {selected.use_year ?? "N/A"}</p>
              <p><span className="font-semibold text-slate-900">Expiry:</span> {selected.points_expiry_date ?? "N/A"}</p>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-semibold text-slate-900">Already booked:</span> {selected.already_booked ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Confirmation:</span> {selected.existing_confirmation_number ?? "N/A"}</p>
              <p><span className="font-semibold text-slate-900">Reservation details:</span></p>
              <pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                {selected.existing_reservation_details ? JSON.stringify(selected.existing_reservation_details, null, 2) : "N/A"}
              </pre>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</label>
              <select
                value={selected.status}
                onChange={(event) => updateRow(selected.id, { status: event.target.value })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Assigned to (user id)</label>
              <input
                type="text"
                value={selected.assigned_to ?? ""}
                onChange={(event) => updateRow(selected.id, { assigned_to: event.target.value || null })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Offered to guest email</label>
              <input
                type="email"
                value={selected.offered_to_guest_email ?? ""}
                onChange={(event) => updateRow(selected.id, { offered_to_guest_email: event.target.value || null })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Hold until</label>
              <input
                type="datetime-local"
                value={selected.hold_until ?? ""}
                onChange={(event) => updateRow(selected.id, { hold_until: event.target.value || null })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Internal notes</label>
              <textarea
                rows={3}
                value={selected.internal_notes ?? ""}
                onChange={(event) => updateRow(selected.id, { internal_notes: event.target.value || null })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Closed reason</label>
              <input
                type="text"
                value={selected.closed_reason ?? ""}
                onChange={(event) => updateRow(selected.id, { closed_reason: event.target.value || null })}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
