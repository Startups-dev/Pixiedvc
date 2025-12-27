'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export type GuestRequestRecord = {
  id: string;
  status: string;
  createdAt: string;
  checkIn: string | null;
  checkOut: string | null;
  roomType: string | null;
  adults: number | null;
  children: number | null;
  maxPrice: number | null;
  resortName: string | null;
  renterName: string | null;
  renterEmail: string | null;
  activity: ActivityEntry[];
};

export type ActivityEntry = {
  id: string;
  kind: 'note' | 'status_change';
  createdAt: string;
  author: string | null;
  body: string | null;
  fromStatus: string | null;
  toStatus: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  pending: 'Pending',
  matched: 'Matched',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

const FILTERS = ['all', 'submitted', 'pending', 'matched', 'confirmed', 'cancelled'] as const;

export default function GuestRequestBoard({
  requests,
  statusCounts,
}: {
  requests: GuestRequestRecord[];
  statusCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all');
  const [selectedId, setSelectedId] = useState(requests[0]?.id ?? null);
  const [note, setNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesFilter = filter === 'all' ? true : request.status === filter;
      if (!matchesFilter) {
        return false;
      }
      if (!text) {
        return true;
      }
      const haystack = `${request.resortName ?? ''} ${request.renterName ?? ''} ${request.renterEmail ?? ''}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [requests, search, filter]);

  const selected = useMemo(() => {
    if (!selectedId) {
      return filtered[0];
    }
    return filtered.find((request) => request.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  async function updateStatus(nextStatus: string) {
    if (!selected) {
      return;
    }
    setUpdatingStatus(true);
    const response = await fetch('/api/admin/guests/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: selected.id, status: nextStatus }),
    });
    setUpdatingStatus(false);
    if (!response.ok) {
      alert('Unable to update request status.');
      return;
    }
    router.refresh();
  }

  async function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !note.trim()) {
      return;
    }
    setSavingNote(true);
    const response = await fetch('/api/admin/guests/note', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requestId: selected.id, body: note }),
    });
    setSavingNote(false);
    if (!response.ok) {
      alert('Unable to save note');
      return;
    }
    setNote('');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] ${
              filter === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {key === 'all' ? 'All' : STATUS_LABELS[key] ?? key} ({statusCounts[key] ?? 0})
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Requests ({filtered.length})</h2>
            <input
              type="search"
              placeholder="Search by guest or resort"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-sm sm:w-72"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No requests match this filter.</p>
            ) : (
              filtered.map((request) => (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedId(request.id)}
                  className={`flex w-full flex-col gap-2 px-3 py-4 text-left transition hover:bg-slate-50 ${
                    selected?.id === request.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        {request.renterName ?? request.renterEmail ?? 'Unknown guest'}
                      </p>
                      <p className="text-xs text-slate-500">{request.resortName ?? 'Any resort'} · {formatDates(request.checkIn, request.checkOut)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {request.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Party size {partyLabel(request.adults, request.children)}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a request to view concierge tools.</p>
          ) : (
            <div className="space-y-5">
              <header>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Overview</p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {selected.renterName ?? selected.renterEmail ?? 'Unknown guest'}
                </h2>
                <p className="text-sm text-slate-500">{selected.resortName ?? 'Any resort'} · {formatDates(selected.checkIn, selected.checkOut)}</p>
                <p className="text-xs text-slate-500">{selected.renterEmail ?? 'No email'}</p>
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                <Stat label="Status" value={STATUS_LABELS[selected.status] ?? selected.status} />
                <Stat label="Room type" value={selected.roomType ?? 'Any'} />
                <Stat label="Party size" value={partyLabel(selected.adults, selected.children)} />
                <Stat
                  label="Max $/pt"
                  value={selected.maxPrice ? `$${selected.maxPrice.toFixed(2)}` : 'No max'}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Actions</p>
                <div className="flex flex-wrap gap-2">
                  {['pending', 'matched', 'confirmed', 'cancelled'].map((next) => (
                    <button
                      key={next}
                      type="button"
                      onClick={() => updateStatus(next)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold text-white shadow ${buttonTone(next)}`}
                      disabled={updatingStatus}
                    >
                      {updatingStatus ? 'Saving…' : STATUS_LABELS[next] ?? next}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddNote} className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Add concierge note</label>
                <textarea
                  className="min-h-[90px] w-full rounded-2xl border border-slate-200 p-3 text-sm"
                  placeholder="Log outreach attempts, guest preferences, etc."
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={savingNote}
                >
                  {savingNote ? 'Saving…' : 'Post note'}
                </button>
              </form>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900">Activity</p>
                {selected.activity.length === 0 ? (
                  <p className="text-sm text-slate-500">No activity yet.</p>
                ) : (
                  selected.activity.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-slate-100 p-3 text-sm text-slate-600">
                      <p className="text-xs text-slate-400">
                        {new Date(entry.createdAt).toLocaleString()} · {entry.author ?? 'System'}
                      </p>
                      {entry.kind === 'status_change' ? (
                        <p className="mt-1 text-slate-800">
                          Status {entry.fromStatus ?? '—'} → <span className="font-semibold">{entry.toStatus ?? '—'}</span>
                          {entry.body ? ` · ${entry.body}` : ''}
                        </p>
                      ) : (
                        <p className="mt-1 text-slate-800">{entry.body}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
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
  return parts.length ? parts.join(' · ') : 'No guests set';
}

function buttonTone(status: string) {
  switch (status) {
    case 'matched':
      return 'bg-indigo-600 hover:bg-indigo-700';
    case 'confirmed':
      return 'bg-emerald-600 hover:bg-emerald-700';
    case 'cancelled':
      return 'bg-rose-600 hover:bg-rose-700';
    default:
      return 'bg-amber-500 hover:bg-amber-600 text-slate-900';
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-3 text-sm text-slate-500">
      <p className="text-xs uppercase tracking-[0.2em]">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
