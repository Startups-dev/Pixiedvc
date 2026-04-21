"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  owner_user_id: string;
  status: string;
  points_available: number;
  expiration_date: string;
  urgency_level: "not_urgent" | "moderate" | "urgent";
  target_price_per_point_cents: number | null;
  flexibility_notes: string | null;
  newsletter_opt_in: boolean;
  featured_in_newsletter: boolean;
  admin_approved: boolean;
  public_visibility: boolean;
  admin_notes: string | null;
  created_at: string;
  home_resort?: { name?: string | null } | null;
  owner_profile?: {
    email?: string | null;
    display_name?: string | null;
    phone?: string | null;
    role?: string | null;
  } | null;
};

const STATUS_OPTIONS = ["pending_review", "approved", "rejected", "featured", "closed"] as const;

function getExpirationMeta(expirationDate: string) {
  const date = new Date(expirationDate);
  if (Number.isNaN(date.getTime())) {
    return { label: "Expiration date unavailable", tone: "normal" as const };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const exp = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.ceil((exp - today) / 86_400_000);

  if (diffDays < 0) {
    return { label: `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`, tone: "high" as const };
  }
  if (diffDays === 0) {
    return { label: "Expires today", tone: "high" as const };
  }
  if (diffDays <= 30) {
    return { label: `Expires in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "high" as const };
  }
  if (diffDays <= 60) {
    return { label: `Expires in ${diffDays} days`, tone: "medium" as const };
  }
  return { label: `Expires in ${diffDays} days`, tone: "normal" as const };
}

function formatUrgency(value: Row["urgency_level"]) {
  if (value === "urgent") return "Urgent";
  if (value === "not_urgent") return "Not urgent";
  return "Moderate";
}

export default function AdminLiquidationOpportunitiesClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.id, row.admin_notes ?? ""])),
  );

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [rows],
  );

  async function patchRow(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/liquidation-opportunities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to update.");
      setNotice("Opportunity updated.");
      router.refresh();
    } catch (patchError) {
      setError(patchError instanceof Error ? patchError.message : "Unable to update.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-xl border border-[#7f1d1d] bg-[#450a0a] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-[#064e3b] bg-[#022c22] px-3 py-2 text-sm text-[#a7f3d0]">{notice}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f]">
        <table className="min-w-full text-left text-xs text-[#b4b4b4]">
          <thead className="border-b border-[#3a3a3a] bg-[#212121] uppercase tracking-[0.2em] text-[#8e8ea0]">
            <tr>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Deal</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Flags</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const busy = busyId === row.id;
              const expirationMeta = getExpirationMeta(row.expiration_date);
              const expirationToneClass =
                expirationMeta.tone === "high"
                  ? "text-[#fecaca]"
                  : expirationMeta.tone === "medium"
                    ? "text-[#fde68a]"
                    : "text-[#8e8ea0]";
              return (
                <tr key={row.id} className="border-b border-[#3a3a3a] align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#ececec]">{row.owner_profile?.display_name ?? "Owner"}</p>
                    <p className="text-[11px] text-[#8e8ea0]">{row.owner_profile?.email ?? "No email"}</p>
                    <p className="text-[11px] text-[#8e8ea0]">{row.owner_profile?.phone ?? "No phone"}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#6f6f7f]">
                      {row.owner_profile?.role ?? "owner"} · {row.owner_user_id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="space-y-1 px-3 py-3">
                    <p className="font-semibold text-[#ececec]">{row.home_resort?.name ?? "Resort TBD"}</p>
                    <p>{row.points_available} pts</p>
                    <p>Expires: {new Date(row.expiration_date).toLocaleDateString()}</p>
                    <p className={`text-[11px] font-semibold ${expirationToneClass}`}>{expirationMeta.label}</p>
                    <p className="text-[11px] text-[#8e8ea0]">Owner urgency: {formatUrgency(row.urgency_level)}</p>
                    <p>
                      Target:{" "}
                      {row.target_price_per_point_cents
                        ? `$${(row.target_price_per_point_cents / 100).toFixed(2)}/pt`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-[#8e8ea0]">
                      Flexibility: {row.flexibility_notes?.trim() ? row.flexibility_notes : "—"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      className="rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1"
                      value={row.status}
                      onChange={(event) => patchRow(row.id, { status: event.target.value })}
                      disabled={busy}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="space-y-1 px-3 py-3">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.admin_approved}
                        disabled={busy}
                        onChange={(event) => patchRow(row.id, { admin_approved: event.target.checked })}
                      />
                      Approved
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.featured_in_newsletter}
                        disabled={busy}
                        onChange={(event) =>
                          patchRow(row.id, { featured_in_newsletter: event.target.checked })
                        }
                      />
                      Featured newsletter
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.public_visibility}
                        disabled={busy}
                        onChange={(event) => patchRow(row.id, { public_visibility: event.target.checked })}
                      />
                      Public listing
                    </label>
                    <p className="text-[11px] text-[#8e8ea0]">
                      Owner opted into newsletter: {row.newsletter_opt_in ? "yes" : "no"}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <textarea
                      className="min-h-[72px] w-[220px] rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1"
                      value={notes[row.id] ?? ""}
                      onChange={(event) => setNotes((prev) => ({ ...prev, [row.id]: event.target.value }))}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => patchRow(row.id, { admin_notes: notes[row.id] ?? "" })}
                      className="rounded bg-[#10a37f] px-3 py-1 font-semibold text-white disabled:opacity-50"
                    >
                      {busy ? "Saving…" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
