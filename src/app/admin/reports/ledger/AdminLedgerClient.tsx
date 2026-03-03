'use client';

import { useEffect, useMemo, useState } from 'react';

type LedgerRow = {
  date: string | null;
  last_tx_at: string | null;
  match_id: string;
  booking_request_id: string | null;
  gross_cents: number;
  platform_cents: number;
  owner_cents: number;
  tax_cents: number;
  processors: string[];
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING';
};

type Totals = {
  gross_cents: number;
  platform_cents: number;
  owner_cents: number;
  tax_cents: number;
};

type LedgerResponse = {
  ok: boolean;
  rows: LedgerRow[];
  totals: Totals;
};

function toDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function copyToClipboard(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', 'true');
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch {
    return false;
  }
}

const SORT_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'gross_cents', label: 'Gross' },
  { key: 'platform_cents', label: 'Platform' },
  { key: 'owner_cents', label: 'Owner' },
  { key: 'tax_cents', label: 'Taxes' },
] as const;

type SortKey = 'date' | 'gross_cents' | 'platform_cents' | 'owner_cents' | 'tax_cents';

type SortDir = 'asc' | 'desc';

export default function AdminLedgerClient() {
  const now = new Date();
  const defaultEnd = toDateInput(now);
  const defaultStart = toDateInput(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [totals, setTotals] = useState<Totals>({
    gross_cents: 0,
    platform_cents: 0,
    owner_cents: 0,
    tax_cents: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/reports/ledger?start=${startDate}&end=${endDate}`,
          { signal: controller.signal },
        );
        const payload = (await res.json()) as LedgerResponse | { error?: string };
        if (!active) return;
        if (!res.ok || 'error' in payload) {
          setError(
            'error' in payload ? payload.error ?? 'Failed to load ledger.' : 'Failed to load ledger.',
          );
          setRows([]);
          return;
        }
        setRows(payload.rows);
        setTotals(payload.totals);
      } catch {
        if (!active || controller.signal.aborted) return;
        setError('Failed to load ledger.');
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
  }, [startDate, endDate]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      if (sortKey === 'date') {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return sortDir === 'asc' ? da - db : db - da;
      }
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  }, [rows, sortKey, sortDir]);

  function setPresetDays(days: number) {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
  }

  function setPresetThisMonth() {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setStartDate(toDateInput(start));
    setEndDate(toDateInput(end));
  }

  function exportCsv() {
    const exportUrl = `/api/admin/reports/ledger/export?start=${startDate}&end=${endDate}`;
    fetch(exportUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Export failed');
        }
        const blob = await res.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `ledger-${startDate}-to-${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // ignore export errors for now
      });
  }

  return (
    <div className="admin-ledger-theme space-y-6">
      <div className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
            <h1 className="text-2xl font-semibold" style={{ color: '#64748b' }}>
              Finance ledger
            </h1>
            <p className="text-sm text-[#b4b4b4]">
              Aggregated inbound payments per match for the selected date range.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPresetDays(7)}
              className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1 text-xs text-[#b4b4b4] transition hover:border-[#4a4a4a] hover:text-[#ececec]"
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => setPresetDays(30)}
              className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1 text-xs text-[#b4b4b4] transition hover:border-[#4a4a4a] hover:text-[#ececec]"
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={setPresetThisMonth}
              className="rounded-full border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-1 text-xs text-[#b4b4b4] transition hover:border-[#4a4a4a] hover:text-[#ececec]"
            >
              This month
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-full border border-[#0d8c6d] bg-[#10a37f] px-3 py-1 text-xs text-white transition hover:bg-[#0d8c6d]"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
            Start
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-2 block rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm text-[#ececec]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
            End
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-2 block rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm text-[#ececec]"
            />
          </label>
          <label className="text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
            Sort
            <select
              value={`${sortKey}:${sortDir}`}
              onChange={(event) => {
                const [key, dir] = event.target.value.split(':') as [SortKey, SortDir];
                setSortKey(key);
                setSortDir(dir);
              }}
              className="mt-2 block rounded-2xl border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm text-[#ececec]"
            >
              {SORT_COLUMNS.flatMap((col) => [
                <option key={`${col.key}-desc`} value={`${col.key}:desc`}>
                  {col.label} (desc)
                </option>,
                <option key={`${col.key}-asc`} value={`${col.key}:asc`}>
                  {col.label} (asc)
                </option>,
              ])}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#3a3a3a] text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Match</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Platform</th>
                <th className="px-4 py-3 text-right">Owner</th>
                <th className="px-4 py-3 text-right">Taxes</th>
                <th className="px-4 py-3">Processors</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[#b4b4b4]">
                    Loading ledger…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[#b4b4b4]">
                    No transactions in this range.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => (
                  <tr key={row.match_id} className="border-b border-[#3a3a3a]">
                    <td className="px-4 py-3 text-[#b4b4b4]">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/admin/matching/${row.match_id}`}
                        className="text-[#ececec] hover:text-[#b4b4b4]"
                      >
                        {row.match_id}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#b4b4b4]">
                      <div className="flex items-center gap-2">
                        <span>{row.booking_request_id ?? '—'}</span>
                        {row.booking_request_id ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(row.booking_request_id ?? '')}
                            className="rounded-full border border-[#3a3a3a] bg-[#212121] px-2 py-0.5 text-[10px] text-[#b4b4b4] hover:text-[#ececec]"
                            title="Copy booking ID"
                          >
                            Copy
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#ececec]">
                      {formatUsd(row.gross_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#b4b4b4]">
                      {formatUsd(row.platform_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#b4b4b4]">
                      {formatUsd(row.owner_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#b4b4b4]">
                      {formatUsd(row.tax_cents)}
                    </td>
                    <td className="px-4 py-3 text-[#b4b4b4]">
                      {row.processors.length ? row.processors.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          row.payment_status === 'PAID'
                            ? 'bg-[#12372f] text-[#34d399]'
                            : row.payment_status === 'PARTIAL'
                              ? 'bg-[#3f3418] text-[#fbbf24]'
                              : 'bg-[#212121] text-[#b4b4b4]'
                        }`}
                      >
                        {row.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#3a3a3a] bg-[#2a2a2a] text-sm font-semibold text-[#ececec]">
                <td className="px-4 py-3" colSpan={3}>
                  Totals · Rows: {sortedRows.length}
                </td>
                <td className="px-4 py-3 text-right">{formatUsd(totals.gross_cents)}</td>
                <td className="px-4 py-3 text-right">{formatUsd(totals.platform_cents)}</td>
                <td className="px-4 py-3 text-right">{formatUsd(totals.owner_cents)}</td>
                <td className="px-4 py-3 text-right">{formatUsd(totals.tax_cents)}</td>
                <td className="px-4 py-3" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
