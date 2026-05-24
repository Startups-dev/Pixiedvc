"use client";

import { useMemo, useState } from "react";

type OutboundEmailRow = {
  id: string;
  template_key: string;
  recipient_email: string;
  recipient_user_id: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sent_at: string | null;
  failed_at: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function StatusBadge({ status }: { status: OutboundEmailRow["status"] }) {
  const classes =
    status === "sent"
      ? "border border-emerald-500/30 bg-emerald-500/12 text-emerald-300"
      : status === "failed"
        ? "border border-rose-500/30 bg-rose-500/12 text-rose-300"
        : "border border-amber-500/30 bg-amber-500/12 text-amber-200";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${classes}`}>
      {status}
    </span>
  );
}

export default function AdminEmailsClient({ rows }: { rows: OutboundEmailRow[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | OutboundEmailRow["status"]>("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [search, setSearch] = useState("");

  const templateOptions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.template_key))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (templateFilter !== "all" && row.template_key !== templateFilter) return false;
      if (!normalizedSearch) return true;

      return row.recipient_email.toLowerCase().includes(normalizedSearch);
    });
  }, [rows, search, statusFilter, templateFilter]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[28px] border border-[#3a3a3a] bg-[#2a2a2a] p-5 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8e8ea0]">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | OutboundEmailRow["status"])}
            className="w-full rounded-2xl border border-[#3a3a3a] bg-[#212121] px-4 py-3 text-sm text-[#ececec] outline-none transition focus:border-[#64748b]"
          >
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8e8ea0]">Template</span>
          <select
            value={templateFilter}
            onChange={(event) => setTemplateFilter(event.target.value)}
            className="w-full rounded-2xl border border-[#3a3a3a] bg-[#212121] px-4 py-3 text-sm text-[#ececec] outline-none transition focus:border-[#64748b]"
          >
            <option value="all">All templates</option>
            {templateOptions.map((templateKey) => (
              <option key={templateKey} value={templateKey}>
                {templateKey}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8e8ea0]">Recipient email</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipient email"
            className="w-full rounded-2xl border border-[#3a3a3a] bg-[#212121] px-4 py-3 text-sm text-[#ececec] outline-none transition placeholder:text-[#6f7480] focus:border-[#64748b]"
          />
        </label>
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-[28px] border border-[#3a3a3a] bg-[#2a2a2a] p-8 text-sm text-[#b4b4b4]">
          No outbound emails found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#3a3a3a] bg-[#2a2a2a]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#ececec]">
              <thead className="border-b border-[#3a3a3a] bg-[#252525] text-[11px] uppercase tracking-[0.22em] text-[#8e8ea0]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Created</th>
                  <th className="px-5 py-4 font-semibold">Template</th>
                  <th className="px-5 py-4 font-semibold">Recipient</th>
                  <th className="px-5 py-4 font-semibold">Subject</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Provider</th>
                  <th className="px-5 py-4 font-semibold">Sent</th>
                  <th className="px-5 py-4 font-semibold">Failed</th>
                  <th className="px-5 py-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#323232] align-top last:border-b-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.created_at)}</td>
                    <td className="px-5 py-4 font-medium text-[#ececec]">{row.template_key}</td>
                    <td className="px-5 py-4 text-[#d7dae0]">{row.recipient_email}</td>
                    <td className="px-5 py-4 text-[#bfc4cf]">{row.subject}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-5 py-4 text-[#b4b4b4]">{row.provider}</td>
                    <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.sent_at)}</td>
                    <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.failed_at)}</td>
                    <td className="px-5 py-4">
                      <details className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-[#a9afbb]">
                          Inspect
                        </summary>
                        <div className="mt-3 space-y-3 text-xs text-[#c5c9d2]">
                          <div>
                            <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-[#8e8ea0]">Provider message ID</p>
                            <p>{row.provider_message_id ?? "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-[#8e8ea0]">Related entity</p>
                            <p>
                              {row.related_entity_type ?? "—"}
                              {row.related_entity_id ? ` · ${row.related_entity_id}` : ""}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-[#8e8ea0]">Error message</p>
                            <p className="whitespace-pre-wrap break-words text-[#ffb4b4]">{row.error_message ?? "—"}</p>
                          </div>
                          <div>
                            <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-[#8e8ea0]">Metadata</p>
                            <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-[#3a3a3a] bg-[#191919] p-3 text-[11px] leading-5 text-[#d7dae0]">
                              {JSON.stringify(row.metadata ?? {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
