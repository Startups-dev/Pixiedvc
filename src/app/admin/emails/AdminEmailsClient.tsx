"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  retry_count: number;
  last_retry_at: string | null;
};

const RETRY_COOLDOWN_MS = 15_000;
const MAX_RETRY_COUNT = 5;

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
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"all" | OutboundEmailRow["status"]>("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Record<string, { type: "success" | "error"; message: string }>>({});
  const [activeRetryId, setActiveRetryId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  function retryDisabledReason(row: OutboundEmailRow) {
    if (row.status !== "failed") return "Only failed emails can be retried.";
    if ((row.retry_count ?? 0) >= MAX_RETRY_COUNT) return "Retry limit reached.";
    if (row.last_retry_at) {
      const elapsedMs = Date.now() - new Date(row.last_retry_at).getTime();
      if (Number.isFinite(elapsedMs) && elapsedMs >= 0 && elapsedMs < RETRY_COOLDOWN_MS) {
        return "Please wait a few seconds before retrying again.";
      }
    }
    return null;
  }

  function handleRetry(row: OutboundEmailRow) {
    const disabledReason = retryDisabledReason(row);
    if (disabledReason) {
      setFeedback((current) => ({
        ...current,
        [row.id]: { type: "error", message: disabledReason },
      }));
      return;
    }

    setActiveRetryId(row.id);
    setFeedback((current) => {
      const next = { ...current };
      delete next[row.id];
      return next;
    });

    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/emails/${row.id}/retry`, {
          method: "POST",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          setFeedback((current) => ({
            ...current,
            [row.id]: {
              type: "error",
              message: payload.error ?? "Retry failed.",
            },
          }));
          return;
        }

        setFeedback((current) => ({
          ...current,
          [row.id]: {
            type: "success",
            message: "Email resend completed.",
          },
        }));
        router.refresh();
      } catch (error) {
        setFeedback((current) => ({
          ...current,
          [row.id]: {
            type: "error",
            message: error instanceof Error ? error.message : "Retry failed.",
          },
        }));
      } finally {
        setActiveRetryId(null);
      }
    });
  }

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
                  <th className="px-5 py-4 font-semibold">Retries</th>
                  <th className="px-5 py-4 font-semibold">Sent</th>
                  <th className="px-5 py-4 font-semibold">Failed</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
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
                    <td className="px-5 py-4 text-[#b4b4b4]">
                      <div>{row.retry_count ?? 0}</div>
                      <div className="mt-1 text-[11px] text-[#8e8ea0]">{formatDateTime(row.last_retry_at)}</div>
                    </td>
                    <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.sent_at)}</td>
                    <td className="px-5 py-4 text-[#b4b4b4]">{formatDateTime(row.failed_at)}</td>
                    <td className="px-5 py-4">
                      {row.status === "failed" ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleRetry(row)}
                            disabled={isPending || activeRetryId === row.id || !!retryDisabledReason(row)}
                            className="rounded-full bg-[#10a37f] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-[#0d8c6d] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {activeRetryId === row.id ? "Retrying..." : "Retry Send"}
                          </button>
                          {feedback[row.id] ? (
                            <p className={`text-xs ${feedback[row.id]?.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
                              {feedback[row.id]?.message}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-[#6f7480]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <details className="rounded-2xl border border-[#3a3a3a] bg-[#212121] p-3">
                        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.2em] text-[#a9afbb]">
                          Inspect
                        </summary>
                        <div className="mt-3 space-y-3 text-xs text-[#c5c9d2]">
                          <div>
                            <p className="mb-1 font-semibold uppercase tracking-[0.18em] text-[#8e8ea0]">Retry metadata</p>
                            <p>
                              Retry count: {row.retry_count ?? 0}
                              <br />
                              Last retry: {formatDateTime(row.last_retry_at)}
                            </p>
                          </div>
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
