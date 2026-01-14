'use client';

import { useEffect, useState } from 'react';

type AuditRow = {
  id: string;
  created_at: string | null;
  admin_email: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  before: unknown | null;
  after: unknown | null;
  meta: unknown | null;
};

type AuditResponse = {
  ok: boolean;
  rows: AuditRow[];
  totalCount: number;
  limit: number;
  offset: number;
};

function formatTimestamp(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function AdminAuditTrail({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          entityType,
          entityId,
          limit: '50',
          offset: '0',
        });
        const res = await fetch(`/api/admin/audit?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as AuditResponse | { error: string };
        if (!active) return;
        if (!res.ok || 'error' in payload) {
          setError('Failed to load audit events.');
          setRows([]);
          return;
        }
        setRows(payload.rows);
      } catch {
        if (!active || controller.signal.aborted) return;
        setError('Failed to load audit events.');
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [entityType, entityId]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Audit trail</p>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading audit events…</p>
      ) : error ? (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No audit events yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{row.action ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {formatTimestamp(row.created_at)}
                    {row.admin_email ? ` · ${row.admin_email}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const payload = JSON.stringify(
                      { before: row.before, after: row.after, meta: row.meta },
                      null,
                      2,
                    );
                    try {
                      await navigator.clipboard.writeText(payload);
                    } catch {
                      // ignore
                    }
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  Copy JSON
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <details className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">Before</summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-600">
                    {JSON.stringify(row.before ?? {}, null, 2)}
                  </pre>
                </details>
                <details className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">After</summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-600">
                    {JSON.stringify(row.after ?? {}, null, 2)}
                  </pre>
                </details>
                <details className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">Meta</summary>
                  <pre className="mt-2 overflow-auto text-xs text-slate-600">
                    {JSON.stringify(row.meta ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
