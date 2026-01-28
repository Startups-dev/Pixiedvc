'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type RequestInboxRecord = {
  id: string;
  requestNumber: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  checkIn: string | null;
  checkOut: string | null;
  roomType: string | null;
  adults: number | null;
  children: number | null;
  maxPrice: number | null;
  resortName: string | null;
  renterName: string | null;
  renterEmail: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_match: 'Pending match',
  pending_owner: 'Pending owner',
  matched: 'Matched',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const FILTERS = [
  'all',
  'draft',
  'submitted',
  'pending_match',
  'pending_owner',
  'matched',
  'confirmed',
  'cancelled',
] as const;

export default function RequestsInboxClient({
  requests,
  statusCounts,
}: {
  requests: RequestInboxRecord[];
  statusCounts: Record<string, number>;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesFilter = filter === 'all' ? true : request.status === filter;
      if (!matchesFilter) return false;
      if (!text) return true;
      const haystack = `${request.renterName ?? ''} ${request.renterEmail ?? ''} ${request.resortName ?? ''}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [requests, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                filter === key
                  ? 'border-[#4b5563] bg-[#1c2230] text-[#e6e8ec]'
                  : 'border-[#23293a] bg-[#151922] text-[#9aa3b2] hover:text-[#e6e8ec]'
              }`}
            >
              {key === 'all' ? 'All' : STATUS_LABELS[key] ?? key} ({statusCounts[key] ?? 0})
            </button>
          ))}
        </div>
        <div className="w-full md:w-80">
          <input
            type="search"
            placeholder="Search guest, email, resort"
            className="w-full rounded-2xl border border-[#23293a] bg-[#0f1115] px-4 py-2 text-sm text-[#e6e8ec] placeholder:text-[#6b7280]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-[#23293a] bg-[#151922]">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr] gap-4 border-b border-[#23293a] px-6 py-4 text-xs uppercase tracking-[0.2em] text-[#6b7280] md:grid">
          <span>Guest</span>
          <span>Resort</span>
          <span>Dates</span>
          <span>Party</span>
          <span>Room</span>
          <span>Max $/pt</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-[#23293a]">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#9aa3b2]">
              No requests found. Try adjusting your filters or search.
            </div>
          ) : (
            filtered.map((request) => (
              <Link
                key={request.id}
                href={`/admin/requests/${request.id}`}
                onClick={() => setSelectedId(request.id)}
                className={`block px-6 py-4 transition ${
                  selectedId === request.id ? 'bg-[#1c2230]' : 'hover:bg-[#1c2230]'
                }`}
              >
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr] md:items-center">
                  <div>
                    <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full border border-[#23293a] px-2 text-[11px] font-semibold text-[#9aa3b2]">
                      {request.requestNumber ?? "—"}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[#e6e8ec]">
                      {request.renterName ?? request.renterEmail ?? 'Unknown guest'}
                    </p>
                    <p className="text-xs text-[#9aa3b2]">{request.renterEmail ?? 'No email'}</p>
                    <p className="mt-1 text-xs text-[#6b7280] md:hidden">{formatDates(request.checkIn, request.checkOut)}</p>
                  </div>
                  <div className="text-sm text-[#e6e8ec]">{request.resortName ?? 'Any resort'}</div>
                  <div className="text-sm text-[#e6e8ec]">{formatDates(request.checkIn, request.checkOut)}</div>
                  <div className="text-sm text-[#e6e8ec]">{partyLabel(request.adults, request.children)}</div>
                  <div className="text-sm text-[#e6e8ec]">{request.roomType ?? 'Any'}</div>
                  <div className="text-sm text-[#e6e8ec]">
                    {request.maxPrice ? `$${request.maxPrice.toFixed(2)}` : 'No max'}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center rounded-full border border-[#23293a] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9aa3b2]">
                      {STATUS_LABELS[request.status] ?? request.status}
                    </span>
                    <span className="hidden text-xs text-[#6b7280] md:inline">{formatUpdated(request.updatedAt)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatDates(checkIn: string | null, checkOut: string | null) {
  const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
  if (!checkIn && !checkOut) {
    return 'Flexible dates';
  }
  if (checkIn && checkOut) {
    return `${formatter.format(new Date(checkIn))} → ${formatter.format(new Date(checkOut))}`;
  }
  if (checkIn) {
    return formatter.format(new Date(checkIn));
  }
  return formatter.format(new Date(checkOut!));
}

function partyLabel(adults: number | null, children: number | null) {
  const a = adults ?? 0;
  const c = children ?? 0;
  const parts = [];
  if (a) {
    parts.push(`${a} adult${a === 1 ? '' : 's'}`);
  }
  if (c) {
    parts.push(`${c} kid${c === 1 ? '' : 's'}`);
  }
  return parts.length ? parts.join(' · ') : '—';
}

function formatUpdated(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}
