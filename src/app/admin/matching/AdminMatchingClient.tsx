'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type MatchListRow = {
  match: {
    id: string;
    booking_id: string | null;
    status: string | null;
    points_reserved: number | null;
    created_at: string | null;
    expires_at: string | null;
  };
  booking: {
    id: string | null;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    total_points: number | null;
    primary_resort_id: string | null;
    lead_guest_email: string | null;
  } | null;
  owner: {
    id: string | null;
    display_name: string | null;
    email: string | null;
  } | null;
  rental: {
    id: string | null;
    status: string | null;
    dvc_confirmation_number: string | null;
    check_in: string | null;
  } | null;
  flags: {
    bookingCancelled: boolean;
    invalidMatch: boolean;
    payoutStatus: 'none' | 'pending' | 'released';
    hasRental: boolean;
    isExpiringSoon: boolean;
  };
};

type MatchListResponse = {
  ok: boolean;
  rows: MatchListRow[];
  totalCount: number;
  limit: number;
  offset: number;
};

const MATCH_STATUS_OPTIONS = [
  'pending_owner',
  'pending',
  'offered',
  'accepted',
  'declined',
  'expired',
];
const BOOKING_STATUS_OPTIONS = [
  'submitted',
  'pending_owner',
  'confirmed',
  'draft',
  'cancelled',
];
const SORT_OPTIONS = [
  { value: 'match_created_desc', label: 'Matched (newest)' },
  { value: 'match_created_asc', label: 'Matched (oldest)' },
  { value: 'check_in_asc', label: 'Check-in (earliest)' },
  { value: 'check_in_desc', label: 'Check-in (latest)' },
  { value: 'expires_asc', label: 'Expires (soonest)' },
  { value: 'expires_desc', label: 'Expires (latest)' },
];
const PAGE_LIMIT = 20;

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

export default function AdminMatchingClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [hasRental, setHasRental] = useState('all');
  const [payoutStatus, setPayoutStatus] = useState('all');
  const [matchCreatedFrom, setMatchCreatedFrom] = useState('');
  const [matchCreatedTo, setMatchCreatedTo] = useState('');
  const [matchExpiresFrom, setMatchExpiresFrom] = useState('');
  const [matchExpiresTo, setMatchExpiresTo] = useState('');
  const [checkInFrom, setCheckInFrom] = useState('');
  const [checkInTo, setCheckInTo] = useState('');
  const [sort, setSort] = useState('match_created_desc');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<MatchListRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => {
      window.clearTimeout(handle);
    };
  }, [search]);

  const filtersKey = useMemo(
    () =>
      [
        debouncedSearch,
        matchStatus,
        bookingStatus,
        hasRental,
        payoutStatus,
        matchCreatedFrom,
        matchCreatedTo,
        matchExpiresFrom,
        matchExpiresTo,
        checkInFrom,
        checkInTo,
        sort,
      ].join('|'),
    [
      debouncedSearch,
      matchStatus,
      bookingStatus,
      hasRental,
      payoutStatus,
      matchCreatedFrom,
      matchCreatedTo,
      matchExpiresFrom,
      matchExpiresTo,
      checkInFrom,
      checkInTo,
      sort,
    ],
  );

  useEffect(() => {
    setOffset(0);
  }, [filtersKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (matchStatus) params.set('matchStatus', matchStatus);
      if (bookingStatus) params.set('bookingStatus', bookingStatus);
      if (matchCreatedFrom) params.set('matchCreatedFrom', matchCreatedFrom);
      if (matchCreatedTo) params.set('matchCreatedTo', matchCreatedTo);
      if (matchExpiresFrom) params.set('matchExpiresFrom', matchExpiresFrom);
      if (matchExpiresTo) params.set('matchExpiresTo', matchExpiresTo);
      if (checkInFrom) params.set('checkInFrom', checkInFrom);
      if (checkInTo) params.set('checkInTo', checkInTo);
      if (hasRental) params.set('hasRental', hasRental);
      if (payoutStatus && payoutStatus !== 'all') params.set('payoutStatus', payoutStatus);
      if (sort) params.set('sort', sort);
      params.set('limit', String(PAGE_LIMIT));
      params.set('offset', String(offset));

      try {
        const res = await fetch(`/api/admin/matching?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as MatchListResponse | { error: string };

        if (!active) return;

        if (!res.ok || 'error' in payload) {
          setError(
            'error' in payload ? payload.error ?? 'Failed to load matches.' : 'Failed to load matches.',
          );
          setRows([]);
          setTotalCount(0);
          return;
        }

        setRows(payload.rows);
        setTotalCount(payload.totalCount);
      } catch {
        if (!active || controller.signal.aborted) return;
        setError('Unable to load matches.');
        setRows([]);
        setTotalCount(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [filtersKey, offset, refreshTick]);

  async function handleExpire(matchId: string) {
    setError(null);
    const confirmed = window.confirm(
      'Expire match now? This unwinds reserved points and makes it eligible for rematching.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/matching/${matchId}/expire`, { method: 'POST' });
      const payload = (await res.json()) as { error?: string } | { ok: boolean };
      if (!res.ok || 'error' in payload) {
        setError(
          'error' in payload ? payload.error ?? 'Failed to expire match.' : 'Failed to expire match.',
        );
        return;
      }
      setRefreshTick((tick) => tick + 1);
    } catch {
      setError('Failed to expire match.');
    }
  }

  async function handleDelete(matchId: string) {
    setError(null);
    const confirmed = window.confirm(
      'Delete match permanently? This removes the record. Only use if no rental exists.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/matching/${matchId}`, { method: 'DELETE' });
      const payload = (await res.json()) as { error?: string } | { ok: boolean };
      if (!res.ok || 'error' in payload) {
        setError(
          'error' in payload ? payload.error ?? 'Failed to delete match.' : 'Failed to delete match.',
        );
        return;
      }
      setRefreshTick((tick) => tick + 1);
    } catch {
      setError('Failed to delete match.');
    }
  }

  const page = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_LIMIT), 1);

  function clearFilters() {
    setSearch('');
    setMatchStatus('');
    setBookingStatus('');
    setHasRental('all');
    setPayoutStatus('all');
    setMatchCreatedFrom('');
    setMatchCreatedTo('');
    setMatchExpiresFrom('');
    setMatchExpiresTo('');
    setCheckInFrom('');
    setCheckInTo('');
    setSort('match_created_desc');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by match, booking, rental, or email"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={matchStatus}
            onChange={(event) => setMatchStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All match statuses</option>
            {MATCH_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={bookingStatus}
            onChange={(event) => setBookingStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All booking statuses</option>
            {BOOKING_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={hasRental}
            onChange={(event) => setHasRental(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All rentals</option>
            <option value="true">Has rental</option>
            <option value="false">No rental</option>
          </select>
          <select
            value={payoutStatus}
            onChange={(event) => setPayoutStatus(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All payout statuses</option>
            <option value="pending">Pending payout</option>
            <option value="released">Released payout</option>
          </select>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={matchCreatedFrom}
            onChange={(event) => setMatchCreatedFrom(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={matchCreatedTo}
            onChange={(event) => setMatchCreatedTo(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={matchExpiresFrom}
            onChange={(event) => setMatchExpiresFrom(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={matchExpiresTo}
            onChange={(event) => setMatchExpiresTo(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={checkInFrom}
            onChange={(event) => setCheckInFrom(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={checkInTo}
            onChange={(event) => setCheckInTo(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            onClick={clearFilters}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
            type="button"
          >
            Clear filters
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading matches…</p>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No matches found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const bookingCancelled = row.flags.bookingCancelled;
              const invalidMatch = row.flags.invalidMatch;
              const matchPending = ['pending_owner', 'pending', 'offered'].includes(row.match.status ?? '');
              const canExpire = matchPending && !row.flags.hasRental;
              const canDelete = !row.flags.hasRental;

              return (
                <div
                  key={row.match.id}
                  className={`flex flex-wrap items-center gap-4 rounded-2xl px-3 py-4 ${invalidMatch ? 'bg-rose-50/60' : ''}`}
                >
                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match</p>
                    <Link href={`/admin/matching/${row.match.id}`} className="text-sm font-semibold text-slate-900">
                      {row.match.id}
                    </Link>
                    <p className="text-xs text-slate-500">Status: {row.match.status ?? '—'}</p>
                    <p className="text-xs text-slate-500">Points: {row.match.points_reserved ?? '—'}</p>
                    {bookingCancelled ? (
                      <div className="mt-2 space-y-1">
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-700">
                          Booking cancelled
                        </span>
                        {invalidMatch ? (
                          <p className="text-xs font-semibold text-rose-600">Invalid match</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking</p>
                    <p className="text-sm text-slate-900">{row.booking?.id ?? '—'}</p>
                    <p className="text-xs text-slate-500">Status: {row.booking?.status ?? '—'}</p>
                    <p className="text-xs text-slate-500">
                      Dates: {formatDate(row.booking?.check_in ?? null)} → {formatDate(row.booking?.check_out ?? null)}
                    </p>
                  </div>

                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
                    <p className="text-sm text-slate-900">{row.owner?.display_name ?? row.owner?.id ?? '—'}</p>
                    <p className="text-xs text-slate-500">{row.owner?.email ?? '—'}</p>
                  </div>

                  <div className="min-w-[180px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rental</p>
                    <p className="text-sm text-slate-900">{row.rental?.id ?? '—'}</p>
                    <p className="text-xs text-slate-500">Status: {row.rental?.status ?? '—'}</p>
                    <p className="text-xs text-slate-500">DVC: {row.rental?.dvc_confirmation_number ?? '—'}</p>
                  </div>

                  <div className="min-w-[160px]">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Timeline</p>
                    <p className="text-xs text-slate-500">Matched: {formatDate(row.match.created_at ?? null)}</p>
                    <p className="text-xs text-slate-500">Expires: {formatDate(row.match.expires_at ?? null)}</p>
                    {row.flags.isExpiringSoon ? (
                      <p className="text-xs font-semibold text-amber-600">Expiring soon</p>
                    ) : null}
                  </div>

                  <div className="ml-auto flex min-w-[200px] flex-col items-end gap-2">
                    {bookingCancelled ? (
                      <p className="text-xs text-rose-600">Booking is cancelled — this match should be cleaned up.</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleExpire(row.match.id)}
                        disabled={!canExpire}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 disabled:opacity-40"
                      >
                        Expire
                      </button>
                      <button
                        onClick={() => handleDelete(row.match.id)}
                        disabled={!canDelete}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-40"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <p>
            Showing {rows.length} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1 || loading}
              onClick={() => setOffset(Math.max(offset - PAGE_LIMIT, 0))}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="rounded-full border border-slate-200 px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages || loading}
              onClick={() => setOffset(offset + PAGE_LIMIT)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
