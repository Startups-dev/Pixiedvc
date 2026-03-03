"use client";

import { useMemo, useState } from "react";

export type AffiliateApplicationRow = {
  id: string;
  display_name: string | null;
  email: string;
  website: string | null;
  social_links: string[] | null;
  traffic_estimate: string | null;
  promotion_description: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  approved_at: string | null;
  rejected_at: string | null;
};

type FilterKey = "pending" | "approved" | "rejected";

type ActionType = "approve_basic" | "approve_verified" | "approve_elite" | "reject";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function AdminAffiliateApplicationsClient({
  applications,
}: {
  applications: AffiliateApplicationRow[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(applications[0]?.id ?? null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<ActionType | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groupedCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const row of applications) {
      if (row.status === "pending") counts.pending += 1;
      if (row.status === "approved") counts.approved += 1;
      if (row.status === "rejected") counts.rejected += 1;
    }
    return counts;
  }, [applications]);

  const filtered = useMemo(
    () => applications.filter((row) => row.status === activeFilter),
    [applications, activeFilter],
  );

  const selected = useMemo(
    () => applications.find((row) => row.id === selectedId) ?? filtered[0] ?? null,
    [applications, filtered, selectedId],
  );

  async function runAction(action: ActionType) {
    if (!selected) return;

    const trimmedNotes = notes.trim();
    if (action === "reject" && !trimmedNotes) {
      setMessage("Reject reason is required.");
      return;
    }

    setSaving(action);
    setMessage(null);

    const response = await fetch("/api/admin/affiliates/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected.id,
        action,
        admin_notes: trimmedNotes || null,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSaving(null);

    if (!response.ok) {
      setMessage(payload?.error ?? "Unable to update application.");
      return;
    }

    setMessage("Application updated.");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-lg font-semibold" style={{ color: "#64748b" }}>
          Applications inbox
        </h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.key;
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  active
                    ? "border-[#10a37f] bg-[#10a37f]/15 text-[#10a37f]"
                    : "border-[#3a3a3a] bg-[#212121] text-[#b4b4b4] hover:text-[#ececec]"
                }`}
              >
                {filter.label} ({groupedCounts[filter.key]})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#212121]">
          <table className="min-w-full text-left text-sm text-[#b4b4b4]">
            <thead className="border-b border-[#3a3a3a] text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">
              <tr>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Display name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Traffic</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-[#8e8ea0]" colSpan={6}>
                    No applications in this status.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const active = selected?.id === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-b border-[#2f2f2f] transition hover:bg-[#1a1a1a] ${active ? "bg-[#171717]" : ""}`}
                      onClick={() => {
                        setSelectedId(row.id);
                        setNotes(row.admin_notes ?? "");
                        setMessage(null);
                      }}
                    >
                      <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                      <td className="px-4 py-3 font-semibold text-[#ececec]">{row.display_name ?? "—"}</td>
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.website ?? "—"}</td>
                      <td className="px-4 py-3">{row.traffic_estimate ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[#b4b4b4]">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4 rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4">
          {!selected ? (
            <p className="text-sm text-[#8e8ea0]">Select an application to review.</p>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Application detail</p>
                <h3 className="text-base font-semibold text-[#ececec]">{selected.display_name ?? "Unnamed applicant"}</h3>
                <p className="text-xs text-[#b4b4b4]">{selected.email}</p>
              </div>

              <div className="space-y-2 text-sm text-[#b4b4b4]">
                <p><span className="text-[#8e8ea0]">Website:</span> {selected.website ?? "—"}</p>
                <p><span className="text-[#8e8ea0]">Traffic:</span> {selected.traffic_estimate ?? "—"}</p>
                <div>
                  <p className="text-[#8e8ea0]">Social links</p>
                  {Array.isArray(selected.social_links) && selected.social_links.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-[#b4b4b4]">
                      {selected.social_links.map((link) => (
                        <li key={link}>{link}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[#b4b4b4]">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[#8e8ea0]">Promotion description</p>
                  <p className="mt-1 whitespace-pre-wrap text-[#b4b4b4]">{selected.promotion_description ?? "—"}</p>
                </div>
              </div>

              <label className="flex flex-col gap-1 text-sm text-[#b4b4b4]">
                Admin notes
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-[96px] rounded-xl border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm text-[#ececec]"
                  placeholder="Add context or rejection reason"
                />
              </label>

              {selected.status === "pending" ? (
                <div className="grid gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#10a37f] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-[#0d8c6d]"
                    disabled={saving !== null}
                    onClick={() => runAction("approve_basic")}
                  >
                    {saving === "approve_basic" ? "Approving…" : "Approve (Basic)"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-emerald-500/30 bg-emerald-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300"
                    disabled={saving !== null}
                    onClick={() => runAction("approve_verified")}
                  >
                    {saving === "approve_verified" ? "Approving…" : "Approve (Verified)"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-sky-500/30 bg-sky-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300"
                    disabled={saving !== null}
                    onClick={() => runAction("approve_elite")}
                  >
                    {saving === "approve_elite" ? "Approving…" : "Approve (Elite)"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-500/30 bg-rose-900/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300"
                    disabled={saving !== null}
                    onClick={() => runAction("reject")}
                  >
                    {saving === "reject" ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#8e8ea0]">
                  {selected.status === "approved"
                    ? `Approved on ${formatDate(selected.approved_at)}`
                    : selected.status === "rejected"
                      ? `Rejected on ${formatDate(selected.rejected_at)}`
                      : "No actions available."}
                </p>
              )}

              {message ? <p className="text-xs text-[#ececec]">{message}</p> : null}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
