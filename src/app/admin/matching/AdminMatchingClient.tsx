'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import PresetBar from './PresetBar';
import AdminAuditTrail from './[matchId]/AdminAuditTrail';
import MatchListTile, { type MatchListTileRow } from './MatchListTile';
import { MATCHING_PRESETS, type MatchingPresetKey } from './presets';

type MatchListResponse = {
  ok: boolean;
  rows: MatchListTileRow[];
  totalCount: number;
  limit: number;
  offset: number;
};

type MatchDetail = {
  match: {
    id: string;
    status: string | null;
    created_at: string | null;
    expires_at: string | null;
    responded_at: string | null;
    points_reserved: number | null;
    owner_membership_id: string | number | null;
    booking_id: string | null;
    owner_id: string | null;
  } | null;
  booking: {
    id: string;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    created_at: string | null;
    guest_total_cents: number | null;
    est_cash: number | null;
    deposit_due: number | null;
    deposit_paid_at?: string | null;
    deposit_status?: string | null;
    booking_paid_at?: string | null;
    booking_status?: string | null;
    checkin_paid_at?: string | null;
    checkin_status?: string | null;
    deposit_paid?: boolean | null;
    booking_paid?: boolean | null;
    checkin_paid?: boolean | null;
    total_points: number | null;
    primary_resort_id: string | null;
    lead_guest_email: string | null;
    lead_guest_name: string | null;
    phone: string | null;
  } | null;
  owner: {
    id: string;
    display_name: string | null;
    email: string | null;
  } | null;
  rental: {
    id: string;
    status: string | null;
    check_in: string | null;
    check_out: string | null;
    dvc_confirmation_number: string | null;
  } | null;
  milestones: Array<{
    code: string | null;
    status: string | null;
    occurred_at: string | null;
  }>;
  payouts: Array<{
    stage: number | null;
    amount_cents: number | null;
    status: string | null;
    eligible_at: string | null;
    released_at: string | null;
  }>;
  paymentSchedule: {
    total_cents: number | null;
    lodging_total_cents: number | null;
    total_tax_cents: number | null;
    grand_total_cents: number | null;
    deposit_cents: number | null;
    due_booking_cents: number | null;
    due_checkin_cents: number | null;
    rows: Array<{
      key: 'deposit' | 'booking' | 'checkin' | 'taxes' | 'total';
      label: string;
      amount_cents: number | null;
      status: 'PAID' | 'PENDING' | '—';
      processor: string | '—';
    }>;
    warnings: string[];
    missing: string[];
    deposit_source: 'default' | 'request';
  };
  transactions: Array<{
    id: string;
    txn_type: string | null;
    direction: string | null;
    amount_cents: number | null;
    status: string | null;
    processor: string | null;
    processor_ref: string | null;
    meta: Record<string, unknown> | null;
    paid_at: string | null;
    created_at: string | null;
    splits: Array<{
      recipient_type: string | null;
      owner_id: number | null;
      jurisdiction_id: string | null;
      amount_cents: number | null;
    }>;
  }>;
  taxBreakdown: {
    jurisdictionName: string | null;
    lines: Array<{
      tax_type: string;
      rate_bps: number;
      tax_cents: number;
    }>;
    warnings: string[];
  };
  expectedSplits: {
    platform_fee_cents: number | null;
    owner_receivable_cents: number | null;
    tax_liability_cents: number;
    warnings: string[];
  };
  flags: {
    bookingCancelled: boolean;
    invalidMatch: boolean;
    hasRental: boolean;
    payoutStatus: 'none' | 'pending' | 'released';
    isExpiringSoon: boolean;
  };
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

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatUsd(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getPaymentBadge(
  status?: string | boolean | null,
  amountPresent?: boolean,
): { label: 'PAID' | 'PENDING'; variant: 'success' | 'warning' | 'muted' } | null {
  if (!amountPresent) return null;
  if (status === true) return { label: 'PAID', variant: 'success' };
  if (status === false) return { label: 'PENDING', variant: 'warning' };
  if (typeof status === 'string') {
    const normalized = status.toLowerCase();
    if (['paid', 'succeeded', 'complete', 'completed', 'paid'].includes(normalized)) {
      return { label: 'PAID', variant: 'success' };
    }
    if (['pending', 'due', 'unpaid'].includes(normalized)) {
      return { label: 'PENDING', variant: 'warning' };
    }
  }
  return { label: 'PENDING', variant: 'warning' };
}

function parseAmountToCents(value: string) {
  const normalized = value.replace(/[^0-9.]/g, '');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}

function getStatusChips(options: {
  matchStatus?: string | null;
  bookingCancelled?: boolean;
  hasRental?: boolean;
  payoutStatus?: 'none' | 'pending' | 'released';
}) {
  const chips: string[] = [];
  if (options.matchStatus === 'pending_owner') chips.push('Pending owner');
  if (options.bookingCancelled) chips.push('Cancelled booking');
  if (options.hasRental) chips.push('Has rental');
  if (options.payoutStatus === 'released') chips.push('Paid');
  return chips;
}

function ActionTile({
  label,
  description,
  onClick,
  disabled,
  tone = 'default',
  disabledReason,
}: {
  label: string;
  description: string;
  onClick: () => void;
  disabled: boolean;
  tone?: 'default' | 'danger' | 'primary';
  disabledReason?: string;
}) {
  const toneClasses =
    tone === 'danger'
      ? 'border-rose-200 text-rose-700'
      : tone === 'primary'
        ? 'border-indigo-200 text-indigo-700'
        : 'border-slate-200 text-slate-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : undefined}
      className={`rounded-2xl border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${toneClasses}`}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      {disabled && disabledReason ? (
        <p className="mt-2 text-xs text-slate-400">{disabledReason}</p>
      ) : null}
    </button>
  );
}

export default function AdminMatchingClient() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scope, setScope] = useState<'matches' | 'unmatched_guests' | 'unmatched_owners'>(
    'matches',
  );
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
  const [checkOutFrom, setCheckOutFrom] = useState('');
  const [checkOutTo, setCheckOutTo] = useState('');
  const [sort, setSort] = useState('match_created_desc');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<MatchListTileRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [selectedPresetKey, setSelectedPresetKey] = useState<MatchingPresetKey | null>(null);
  const [presetHint, setPresetHint] = useState<string | null>(null);
  const isApplyingPreset = useRef(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshTick, setDetailRefreshTick] = useState(0);
  const [txnTypeFilter, setTxnTypeFilter] = useState('all');
  const [txnStatusFilter, setTxnStatusFilter] = useState('all');
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualType, setManualType] = useState<'deposit' | 'booking' | 'checkin'>('deposit');
  const [manualAmount, setManualAmount] = useState('');
  const [manualPaidAt, setManualPaidAt] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    if (!actionNotice) return;
    const handle = window.setTimeout(() => setActionNotice(null), 3000);
    return () => window.clearTimeout(handle);
  }, [actionNotice]);

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch('');
      return;
    }

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
        checkOutFrom,
        checkOutTo,
        sort,
        scope,
      ].join('|'),
    [
      scope,
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
      checkOutFrom,
      checkOutTo,
      sort,
    ],
  );

  useEffect(() => {
    setOffset(0);
  }, [filtersKey]);

  useEffect(() => {
    if (isApplyingPreset.current) return;
    if (selectedPresetKey) {
      setSelectedPresetKey(null);
      setPresetHint(null);
    }
  }, [filtersKey, selectedPresetKey]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (scope) params.set('scope', scope);
      if (matchStatus) params.set('matchStatus', matchStatus);
      if (bookingStatus) params.set('bookingStatus', bookingStatus);
      if (matchCreatedFrom) params.set('matchCreatedFrom', matchCreatedFrom);
      if (matchCreatedTo) params.set('matchCreatedTo', matchCreatedTo);
      if (matchExpiresFrom) params.set('matchExpiresFrom', matchExpiresFrom);
      if (matchExpiresTo) params.set('matchExpiresTo', matchExpiresTo);
      if (checkInFrom) params.set('checkInFrom', checkInFrom);
      if (checkInTo) params.set('checkInTo', checkInTo);
      if (checkOutFrom) params.set('checkOutFrom', checkOutFrom);
      if (checkOutTo) params.set('checkOutTo', checkOutTo);
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

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedRowId(null);
      return;
    }
    if (!selectedRowId || !rows.some((row) => row.row_id === selectedRowId)) {
      setSelectedRowId(rows[0].row_id);
    }
  }, [rows, selectedRowId]);

  useEffect(() => {
    if (!selectedRowId) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    const selectedRow = rows.find((row) => row.row_id === selectedRowId);
    if (!selectedRow || selectedRow.kind !== 'match' || !selectedRow.match?.id) {
      setDetail(null);
      setDetailError(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/admin/matching/${selectedRow.match.id}`, {
          signal: controller.signal,
        });
        const payload = (await res.json()) as { ok?: boolean; error?: string } | MatchDetail;
        if (!active) return;
        if (!res.ok || 'error' in payload) {
          setDetailError(
            'error' in payload ? payload.error ?? 'Failed to load detail.' : 'Failed to load detail.',
          );
          setDetail(null);
          return;
        }
        setDetail(payload as MatchDetail);
      } catch {
        if (!active || controller.signal.aborted) return;
        setDetailError('Failed to load detail.');
        setDetail(null);
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    loadDetail();

    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedRowId, detailRefreshTick, rows]);

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
      setActionNotice('Match expired.');
      setRefreshTick((tick) => tick + 1);
      setDetailRefreshTick((tick) => tick + 1);
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
      setActionNotice('Match deleted.');
      setRefreshTick((tick) => tick + 1);
      setDetailRefreshTick((tick) => tick + 1);
    } catch {
      setError('Failed to delete match.');
    }
  }

  async function handleRematch(matchId: string) {
    setError(null);
    const confirmed = window.confirm(
      'Rematch now? This will expire the current match and free reserved points so the booking can be matched again.',
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/matching/${matchId}/rematch`, { method: 'POST' });
      const payload = (await res.json()) as { error?: string } | { ok: boolean };
      if (!res.ok || 'error' in payload) {
        setError(
          'error' in payload ? payload.error ?? 'Failed to rematch.' : 'Failed to rematch.',
        );
        return;
      }
      setActionNotice('Match rematch requested.');
      setRefreshTick((tick) => tick + 1);
      setDetailRefreshTick((tick) => tick + 1);
    } catch {
      setError('Failed to rematch.');
    }
  }

  function openManualModal() {
    const nextType = getDefaultManualType();
    const expectedCents = getExpectedAmountCents(nextType);
    setManualType(nextType);
    setManualAmount(expectedCents !== null ? (expectedCents / 100).toFixed(2) : '');
    setManualPaidAt(formatDateTimeLocal(new Date()));
    setManualNotes('');
    setManualError(null);
    setManualModalOpen(true);
  }

  async function handleManualSubmit() {
    if (!detailMatch?.id) return;
    setManualError(null);
    setManualSubmitting(true);

    const amountCents = manualAmount.trim() ? parseAmountToCents(manualAmount) : null;
    const payload = {
      txn_type: manualType,
      amount_cents: amountCents,
      paid_at: manualPaidAt ? new Date(manualPaidAt).toISOString() : null,
      note: manualNotes.trim() ? manualNotes.trim() : null,
    };

    try {
      const res = await fetch(
        `/api/admin/matching/${detailMatch.id}/transactions/manual`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok || data.error) {
        setManualError(data.error ?? 'Failed to create manual transaction.');
        return;
      }
      setManualModalOpen(false);
      setActionNotice('Transaction marked as paid.');
      setDetailRefreshTick((tick) => tick + 1);
    } catch {
      setManualError('Failed to create manual transaction.');
    } finally {
      setManualSubmitting(false);
    }
  }

  const page = Math.floor(offset / PAGE_LIMIT) + 1;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_LIMIT), 1);

  function clearFilters({ keepPreset }: { keepPreset?: boolean } = {}) {
    setSearch('');
    setDebouncedSearch('');
    setScope('matches');
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
    setCheckOutFrom('');
    setCheckOutTo('');
    setSort('match_created_desc');
    setOffset(0);
    if (!keepPreset) {
      setSelectedPresetKey(null);
      setPresetHint(null);
    }
  }

  function applyPreset(presetKey: MatchingPresetKey) {
    const preset = MATCHING_PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;

    isApplyingPreset.current = true;
    clearFilters({ keepPreset: true });

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const params = preset.params;
    if (params.matchStatus) setMatchStatus(params.matchStatus);
    if (params.bookingStatus) setBookingStatus(params.bookingStatus);
    if (params.hasRental) setHasRental(params.hasRental);
    if (params.payoutStatus) setPayoutStatus(params.payoutStatus);
    if (params.__scope === 'unmatched_guests' || params.__scope === 'unmatched_owners') {
      setScope(params.__scope);
    } else {
      setScope('matches');
    }

    if (params.__relativeExpiresToHours) {
      const hours = Number(params.__relativeExpiresToHours);
      if (!Number.isNaN(hours)) {
        const target = new Date(now.getTime() + hours * 60 * 60 * 1000);
        setMatchExpiresTo(formatDateParam(target));
      }
    }

    if (params.__expiresToday) {
      const todayParam = formatDateParam(today);
      setMatchExpiresFrom(todayParam);
      setMatchExpiresTo(todayParam);
    }

    if (params.__relativeCheckInDays) {
      const days = Number(params.__relativeCheckInDays);
      if (!Number.isNaN(days)) {
        const target = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
        setCheckInFrom(formatDateParam(today));
        setCheckInTo(formatDateParam(target));
      }
    }

    if (params.__relativeMatchCreatedOlderHours) {
      const hours = Number(params.__relativeMatchCreatedOlderHours);
      if (!Number.isNaN(hours)) {
        const target = new Date(now.getTime() - hours * 60 * 60 * 1000);
        setMatchCreatedTo(formatDateParam(target));
      }
    }

    setSelectedPresetKey(presetKey);
    setPresetHint(preset.hint);
    setOffset(0);

    window.setTimeout(() => {
      isApplyingPreset.current = false;
    }, 0);
  }

  const detailMatch = detail?.match ?? null;
  const detailBooking = detail?.booking ?? null;
  const detailOwner = detail?.owner ?? null;
  const detailRental = detail?.rental ?? null;
  const detailFlags = detail?.flags;
  const selectedRow = rows.find((row) => row.row_id === selectedRowId) ?? null;
  const selectedIsUnmatched = selectedRow?.kind !== 'match';
  const detailStatusChips = getStatusChips({
    matchStatus: detailMatch?.status ?? null,
    bookingCancelled: detailFlags?.bookingCancelled ?? false,
    hasRental: detailFlags?.hasRental ?? false,
    payoutStatus: detailFlags?.payoutStatus ?? 'none',
  });
  const canExpireDetail =
    !detailFlags?.hasRental && ['pending_owner', 'pending'].includes(detailMatch?.status ?? '');
  const canDeleteDetail = !detailFlags?.hasRental;
  const canRematchDetail =
    !detailFlags?.hasRental &&
    ['pending_owner', 'pending', 'declined', 'expired'].includes(detailMatch?.status ?? '');

  const paymentSchedule = detail?.paymentSchedule ?? null;
  const taxBreakdown = detail?.taxBreakdown ?? null;
  const expectedSplits = detail?.expectedSplits ?? null;
  const paymentWarnings =
    paymentSchedule?.warnings?.filter(
      (warning) =>
        ![
          'Missing jurisdiction',
          'No tax rates configured',
          'No lodging tax rates',
        ].includes(warning),
    ) ?? [];
  const taxWarningCopy = (() => {
    if (!taxBreakdown?.warnings?.length) return null;
    if (taxBreakdown.warnings.includes('Missing jurisdiction')) {
      return 'Tax not configured for this resort yet.';
    }
    return taxBreakdown.warnings.join('. ');
  })();
  const paidInboundTypes = new Set(
    (detail?.transactions ?? [])
      .filter((txn) => txn.direction === 'in' && txn.status === 'succeeded' && txn.txn_type)
      .map((txn) => txn.txn_type as 'deposit' | 'booking' | 'checkin'),
  );
  const hasAllManualTypes = ['deposit', 'booking', 'checkin'].every((type) =>
    paidInboundTypes.has(type as 'deposit' | 'booking' | 'checkin'),
  );
  const getExpectedAmountCents = (type: 'deposit' | 'booking' | 'checkin') => {
    if (!paymentSchedule) return null;
    if (type === 'deposit') return paymentSchedule.deposit_cents ?? null;
    if (type === 'booking') return paymentSchedule.due_booking_cents ?? null;
    return paymentSchedule.due_checkin_cents ?? null;
  };
  const getDefaultManualType = () =>
    (['deposit', 'booking', 'checkin'] as const).find(
      (type) => !paidInboundTypes.has(type) && getExpectedAmountCents(type) !== null,
    ) ?? 'deposit';
  const filteredTransactions =
    detail?.transactions?.filter((txn) => {
      if (txnTypeFilter !== 'all' && txn.txn_type !== txnTypeFilter) return false;
      if (txnStatusFilter !== 'all' && txn.status !== txnStatusFilter) return false;
      return true;
    }) ?? [];

  return (
    <div className="space-y-6">
      <PresetBar
        selectedKey={selectedPresetKey}
        onSelectPreset={applyPreset}
        onClearPreset={() => {
          setSelectedPresetKey(null);
          setPresetHint(null);
        }}
        hint={presetHint}
      />
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4 lg:flex-row">
        <div className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm lg:w-[40%] lg:overflow-y-auto">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-2">
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
              <button
                onClick={clearFilters}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600"
                type="button"
              >
                Clear filters
              </button>
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((open) => !open)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700"
              >
                <span>Advanced filters</span>
                <svg
                  viewBox="0 0 20 20"
                  className={`h-4 w-4 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.1l3.71-3.87a.75.75 0 1 1 1.08 1.04l-4.25 4.43a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z"
                  />
                </svg>
              </button>
              {isAdvancedOpen ? (
                <div className="grid gap-4 border-t border-slate-200 px-4 py-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match dates</p>
                    <div className="grid gap-2 md:grid-cols-2">
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
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Stay dates</p>
                    <div className="grid gap-2 md:grid-cols-2">
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
                      <input
                        type="date"
                        value={checkOutFrom}
                        onChange={(event) => setCheckOutFrom(event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={checkOutTo}
                        onChange={(event) => setCheckOutTo(event.target.value)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {(() => {
            const chips: Array<{ key: string; label: string; onClear: () => void }> = [];
            const searchValue = search.trim() || debouncedSearch;
            if (scope !== 'matches') {
              chips.push({
                key: 'scope',
                label: scope === 'unmatched_guests' ? 'Unmatched guests' : 'Unmatched owners',
                onClear: () => {
                  setScope('matches');
                  setOffset(0);
                },
              });
            }
            if (searchValue) {
              chips.push({
                key: 'q',
                label: `Search: ${searchValue}`,
                onClear: () => {
                  setSearch('');
                  setDebouncedSearch('');
                  setOffset(0);
                },
              });
            }
            if (matchStatus) {
              chips.push({
                key: 'matchStatus',
                label: `Match: ${matchStatus}`,
                onClear: () => {
                  setMatchStatus('');
                  setOffset(0);
                },
              });
            }
            if (bookingStatus) {
              chips.push({
                key: 'bookingStatus',
                label: `Booking: ${bookingStatus}`,
                onClear: () => {
                  setBookingStatus('');
                  setOffset(0);
                },
              });
            }
            if (hasRental !== 'all') {
              chips.push({
                key: 'hasRental',
                label: hasRental === 'true' ? 'Rentals: yes' : 'Rentals: no',
                onClear: () => {
                  setHasRental('all');
                  setOffset(0);
                },
              });
            }
            if (payoutStatus !== 'all') {
              chips.push({
                key: 'payoutStatus',
                label: `Payout: ${payoutStatus}`,
                onClear: () => {
                  setPayoutStatus('all');
                  setOffset(0);
                },
              });
            }
            if (sort !== 'match_created_desc') {
              const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? sort;
              chips.push({
                key: 'sort',
                label: `Sort: ${sortLabel}`,
                onClear: () => {
                  setSort('match_created_desc');
                  setOffset(0);
                },
              });
            }
            if (matchCreatedFrom) {
              chips.push({
                key: 'matchCreatedFrom',
                label: `Matched from: ${matchCreatedFrom}`,
                onClear: () => {
                  setMatchCreatedFrom('');
                  setOffset(0);
                },
              });
            }
            if (matchCreatedTo) {
              chips.push({
                key: 'matchCreatedTo',
                label: `Matched to: ${matchCreatedTo}`,
                onClear: () => {
                  setMatchCreatedTo('');
                  setOffset(0);
                },
              });
            }
            if (matchExpiresFrom) {
              chips.push({
                key: 'matchExpiresFrom',
                label: `Expires from: ${matchExpiresFrom}`,
                onClear: () => {
                  setMatchExpiresFrom('');
                  setOffset(0);
                },
              });
            }
            if (matchExpiresTo) {
              chips.push({
                key: 'matchExpiresTo',
                label: `Expires to: ${matchExpiresTo}`,
                onClear: () => {
                  setMatchExpiresTo('');
                  setOffset(0);
                },
              });
            }
            if (checkInFrom) {
              chips.push({
                key: 'checkInFrom',
                label: `Check-in from: ${checkInFrom}`,
                onClear: () => {
                  setCheckInFrom('');
                  setOffset(0);
                },
              });
            }
            if (checkInTo) {
              chips.push({
                key: 'checkInTo',
                label: `Check-in to: ${checkInTo}`,
                onClear: () => {
                  setCheckInTo('');
                  setOffset(0);
                },
              });
            }
            if (checkOutFrom) {
              chips.push({
                key: 'checkOutFrom',
                label: `Check-out from: ${checkOutFrom}`,
                onClear: () => {
                  setCheckOutFrom('');
                  setOffset(0);
                },
              });
            }
            if (checkOutTo) {
              chips.push({
                key: 'checkOutTo',
                label: `Check-out to: ${checkOutTo}`,
                onClear: () => {
                  setCheckOutTo('');
                  setOffset(0);
                },
              });
            }

            if (chips.length === 0) return null;

            return (
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active filters</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      onClick={chip.onClear}
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      <span>{chip.label}</span>
                      <span aria-hidden="true" className="text-slate-400">
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            {loading ? (
              <p className="text-sm text-slate-500">Loading matches…</p>
            ) : error ? (
              <p className="text-sm text-rose-600">{error}</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-500">No matches found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <MatchListTile
                    key={row.row_id}
                    row={row}
                    isSelected={selectedRowId === row.row_id}
                    onSelect={() => setSelectedRowId(row.row_id)}
                  />
                ))}
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

        <div className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm lg:w-[60%] lg:overflow-y-auto">
          {!selectedRowId ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Select a match from the left to view details.
            </div>
          ) : detailLoading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              Loading match detail…
            </div>
          ) : detailError ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm">
              {detailError}
            </div>
          ) : detailMatch ? (
            <>
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match detail</p>
                    <p className="text-lg font-semibold text-slate-900">{detailMatch.id}</p>
                    <p className="text-xs text-slate-500">
                      Status: {detailMatch.status ?? '—'} · Matched:{' '}
                      {formatDate(detailMatch.created_at ?? null)}
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                      {detailBooking?.lead_guest_name ?? 'No Guest'} →{' '}
                      {detailOwner?.display_name ?? 'Unassigned'}
                    </p>
                  </div>
                  {detailStatusChips.length ? (
                    <div className="flex flex-wrap gap-2">
                      {detailStatusChips.map((chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.2em]">
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                    Booking request: {formatDate(detailBooking?.created_at ?? null)}
                  </span>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
                    Match date: {formatDate(detailMatch?.created_at ?? null)}
                  </span>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                    Check-in: {formatDate(detailBooking?.check_in ?? null)}
                  </span>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
                    Check-out: {formatDate(detailBooking?.check_out ?? null)}
                  </span>
                </div>
                {detailFlags?.invalidMatch ? (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    <p className="font-semibold">Booking cancelled</p>
                    <p>This match is now invalid. Use Expire or Delete to clean it up.</p>
                  </div>
                ) : null}
                {detailFlags?.hasRental ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    Rental exists — cannot modify match here.
                  </div>
                ) : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Control grid</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ActionTile
                    label="Rematch"
                    description="Expire this match and free points so it can be matched again."
                    onClick={() => handleRematch(detailMatch.id)}
                    disabled={!canRematchDetail}
                    tone="primary"
                    disabledReason={
                      detailFlags?.hasRental
                        ? 'Rental exists — cannot rematch.'
                        : 'Match status is not eligible for rematch.'
                    }
                  />
                  <ActionTile
                    label="Expire"
                    description="Expire the match and unwind reserved points."
                    onClick={() => handleExpire(detailMatch.id)}
                    disabled={!canExpireDetail}
                    tone="danger"
                    disabledReason={
                      detailFlags?.hasRental
                        ? 'Rental exists — cannot expire.'
                        : 'Match status is not eligible for expire.'
                    }
                  />
                  <ActionTile
                    label="Delete"
                    description="Delete the match record permanently."
                    onClick={() => handleDelete(detailMatch.id)}
                    disabled={!canDeleteDetail}
                    tone="default"
                    disabledReason={detailFlags?.hasRental ? 'Rental exists — cannot delete.' : undefined}
                  />
                </div>
                {actionNotice ? (
                  <p className="mt-3 text-sm font-semibold text-emerald-600">{actionNotice}</p>
                ) : null}
                {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>ID: {detailBooking?.id ?? '—'}</p>
                    <p>Status: {detailBooking?.status ?? '—'}</p>
                    <p>Check-in: {detailBooking?.check_in ?? '—'}</p>
                    <p>Check-out: {detailBooking?.check_out ?? '—'}</p>
                    <p>Total points: {detailBooking?.total_points ?? '—'}</p>
                    <p>Resort: {detailBooking?.primary_resort_id ?? '—'}</p>
                    <p>Guest: {detailBooking?.lead_guest_name ?? '—'}</p>
                    <p>Email: {detailBooking?.lead_guest_email ?? '—'}</p>
                    <p>Phone: {detailBooking?.phone ?? '—'}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>ID: {detailMatch?.id ?? '—'}</p>
                    <p>Status: {detailMatch?.status ?? '—'}</p>
                    <p>Points reserved: {detailMatch?.points_reserved ?? '—'}</p>
                    <p>Matched at: {detailMatch?.created_at ?? '—'}</p>
                    <p>Expires at: {detailMatch?.expires_at ?? '—'}</p>
                    <p>Responded at: {detailMatch?.responded_at ?? '—'}</p>
                    <p>Owner ID: {detailMatch?.owner_id ?? '—'}</p>
                    <p>Owner membership: {detailMatch?.owner_membership_id ?? '—'}</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p>ID: {detailOwner?.id ?? '—'}</p>
                    <p>Name: {detailOwner?.display_name ?? '—'}</p>
                    <p>Email: {detailOwner?.email ?? '—'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payments</p>
                  <button
                    type="button"
                    onClick={openManualModal}
                    disabled={hasAllManualTypes || !detailMatch}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      hasAllManualTypes
                        ? 'All payment rows are already marked as paid.'
                        : undefined
                    }
                  >
                    + Manual
                  </button>
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  {paymentSchedule ? (
                    <>
                      {paymentSchedule.rows.map((row) => {
                        const badge = getPaymentBadge(
                          row.status === '—' ? null : row.status,
                          row.amount_cents !== null,
                        );
                        const badgeClass = (variant: 'success' | 'warning' | 'muted') =>
                          variant === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : variant === 'muted'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-700';
                        const amountLabel =
                          row.amount_cents === null ? null : row.amount_cents / 100;
                        const showTotalRow = row.key === 'total';
                        const showTaxesRow = row.key === 'taxes';
                        const showProcessor = !showTotalRow && !showTaxesRow;
                        const showStatus = !showTotalRow && !showTaxesRow;

                        return (
                          <div
                            key={row.key}
                            className={`grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 ${
                              showTotalRow ? 'border-t border-slate-100 pt-2 text-sm font-semibold' : ''
                            }`}
                          >
                            <span>{row.label}</span>
                            <span className={showTotalRow ? 'font-semibold' : ''}>
                              {formatUsd(amountLabel)}
                            </span>
                            {showStatus && badge ? (
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${badgeClass(
                                  badge.variant,
                                )}`}
                              >
                                {badge.label}
                              </span>
                            ) : (
                              <span />
                            )}
                            {showProcessor ? (
                              <span className="text-xs text-slate-500">
                                {row.processor === '—' ? '—' : row.processor}
                              </span>
                            ) : (
                              <span />
                            )}
                          </div>
                        );
                      })}
                      {paymentSchedule.missing.length ? (
                        <p className="text-xs text-slate-500">
                          {paymentSchedule.missing.join('. ')}
                        </p>
                      ) : null}
                      {paymentWarnings.length ? (
                        <p className="text-xs text-rose-600">{paymentWarnings.join('. ')}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Payments unavailable.</p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Expected splits
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Platform fee (expected)</span>
                    <span>
                      {formatUsd(
                        expectedSplits?.platform_fee_cents === null
                          ? null
                          : expectedSplits.platform_fee_cents / 100,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Owner receivable (expected)</span>
                    <span>
                      {formatUsd(
                        expectedSplits?.owner_receivable_cents === null
                          ? null
                          : expectedSplits.owner_receivable_cents / 100,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Tax liability (expected)</span>
                    <span>
                      {formatUsd(
                        expectedSplits?.tax_liability_cents === null
                          ? null
                          : expectedSplits.tax_liability_cents / 100,
                      )}
                    </span>
                  </div>
                  {expectedSplits?.warnings?.length ? (
                    <p className="text-xs text-amber-600">
                      {expectedSplits.warnings.join('. ')}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <details className="group">
                  <summary className="flex cursor-pointer items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                    <span>Tax breakdown</span>
                    <span className="text-[10px] text-slate-400 transition group-open:-rotate-180">
                      ▾
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p className="text-xs text-slate-500">
                      Jurisdiction: {taxBreakdown?.jurisdictionName ?? '—'}
                    </p>
                    {!taxBreakdown?.jurisdictionName ? (
                      <p className="text-xs text-slate-500">
                        No tax jurisdiction set — taxes currently calculated as $0.00.
                      </p>
                    ) : null}
                    {taxBreakdown?.lines?.length ? (
                      <div className="space-y-1">
                        {taxBreakdown.lines.map((line, index) => (
                          <div
                            key={`${line.tax_type}-${index}`}
                            className="flex items-center justify-between gap-3"
                          >
                            <span>
                              {line.tax_type} · {(line.rate_bps / 100).toFixed(2)}%
                            </span>
                            <span>
                              {formatUsd(
                                line.tax_cents === null ? null : line.tax_cents / 100,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No tax rates configured.</p>
                    )}
                    {taxWarningCopy ? (
                      <p className="text-xs text-slate-500">{taxWarningCopy}</p>
                    ) : null}
                  </div>
                </details>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Transactions</p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={txnTypeFilter}
                      onChange={(event) => setTxnTypeFilter(event.target.value)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                    >
                      <option value="all">All types</option>
                      <option value="deposit">Deposit</option>
                      <option value="booking">Booking</option>
                      <option value="checkin">Check-in</option>
                      <option value="tax_collect">Tax collect</option>
                      <option value="tax_remit">Tax remit</option>
                      <option value="owner_payout">Owner payout</option>
                      <option value="promo_bonus">Promo bonus</option>
                      <option value="manual_adjustment">Manual adjustment</option>
                    </select>
                    <select
                      value={txnStatusFilter}
                      onChange={(event) => setTxnStatusFilter(event.target.value)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                    >
                      <option value="all">All statuses</option>
                      <option value="pending">Pending</option>
                      <option value="succeeded">Succeeded</option>
                      <option value="failed">Failed</option>
                      <option value="refunded">Refunded</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <p className="text-sm text-slate-500">No transactions yet.</p>
                  ) : (
                    filteredTransactions.map((txn) => {
                      const noteValue =
                        txn.meta && typeof txn.meta.note === 'string' ? txn.meta.note : null;
                      const hasDetails =
                        txn.splits.length > 0 || txn.meta !== null || Boolean(noteValue);
                      const metaPayload =
                        txn.meta !== null ? JSON.stringify(txn.meta, null, 2) : null;

                      return (
                        <div key={txn.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="grid gap-2 text-xs text-slate-600 md:grid-cols-6">
                          <div>
                            <p className="font-semibold text-slate-500">Date</p>
                            <p>{formatDate(txn.paid_at ?? txn.created_at ?? null)}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Type</p>
                            <p>{txn.txn_type ?? '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Direction</p>
                            <p>{txn.direction ?? '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Amount</p>
                            <p>
                              {formatUsd(
                                txn.amount_cents === null ? null : txn.amount_cents / 100,
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Status</p>
                            <p>{txn.status ?? '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-500">Processor</p>
                            <p>{txn.processor ?? '—'}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          Ref: {txn.processor_ref ?? '—'}
                        </div>
                        {hasDetails ? (
                          <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600">
                            <summary className="cursor-pointer font-semibold text-slate-700">
                              Details
                            </summary>
                            <div className="mt-2 space-y-3">
                              {txn.splits.length ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-600">Splits</p>
                                  {txn.splits.map((split, index) => (
                                    <div
                                      key={`${txn.id}-split-${index}`}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <span>
                                        {split.recipient_type ?? '—'}
                                        {split.owner_id ? ` · Owner ${split.owner_id}` : ''}
                                        {split.jurisdiction_id
                                          ? ` · Jurisdiction ${split.jurisdiction_id}`
                                          : ''}
                                      </span>
                                      <span>
                                        {formatUsd(
                                          split.amount_cents === null
                                            ? null
                                            : split.amount_cents / 100,
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {noteValue ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-600">Notes</p>
                                  <p className="text-xs text-slate-500">{noteValue}</p>
                                </div>
                              ) : null}
                              {metaPayload ? (
                                <div className="space-y-1">
                                  <p className="font-semibold text-slate-600">Meta</p>
                                  <pre className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                                    {metaPayload}
                                  </pre>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Rental</p>
                {detailRental ? (
                  <div className="mt-3 grid gap-4 text-sm text-slate-700 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p>ID: {detailRental.id}</p>
                      <p>Status: {detailRental.status ?? '—'}</p>
                      <p>Check-in: {detailRental.check_in ?? '—'}</p>
                      <p>Check-out: {detailRental.check_out ?? '—'}</p>
                      <p>DVC: {detailRental.dvc_confirmation_number ?? '—'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Milestones</p>
                      {detail?.milestones?.length ? (
                        <div className="space-y-1">
                          {detail.milestones.map((milestone, index) => (
                            <p key={`${milestone.code ?? 'milestone'}-${index}`}>
                              {milestone.code ?? '—'} · {milestone.status ?? '—'} ·{' '}
                              {formatDate(milestone.occurred_at ?? null)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No milestones yet.</p>
                      )}
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Payouts</p>
                      {detail?.payouts?.length ? (
                        <div className="space-y-1">
                          {detail.payouts.map((payout, index) => (
                            <p key={`${payout.stage ?? 'stage'}-${index}`}>
                              Stage {payout.stage ?? '—'} · {payout.status ?? '—'} ·{' '}
                              {payout.amount_cents ?? 0}¢
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">No payout entries.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">No rental attached.</p>
                )}
              </div>

              <AdminAuditTrail entityType="booking_match" entityId={detailMatch.id} />
            </>
          ) : selectedRow && selectedIsUnmatched ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Lead detail
              </p>
              <div className="mt-3 space-y-2">
                <p>
                  Guest:{' '}
                  <span className="font-semibold text-slate-800">
                    {selectedRow.booking?.lead_guest_name ?? 'No Guest'}
                  </span>
                </p>
                <p>
                  Owner:{' '}
                  <span className="font-semibold text-slate-800">
                    {selectedRow.owner?.display_name ?? 'Unassigned'}
                  </span>
                </p>
                <p>Booking status: {selectedRow.booking?.status ?? '—'}</p>
                <p>Check-in: {selectedRow.booking?.check_in ?? '—'}</p>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                No match exists yet for this lead. Use your matching workflow to create one.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
              No match selected.
            </div>
          )}
        </div>
      </div>
      {manualModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">Mark payment as paid</p>
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <div className="mt-4 space-y-4 text-sm text-slate-700">
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Type
                <select
                  value={manualType}
                  onChange={(event) => {
                    const nextType = event.target.value as 'deposit' | 'booking' | 'checkin';
                    const expectedCents = getExpectedAmountCents(nextType);
                    setManualType(nextType);
                    setManualAmount(
                      expectedCents !== null ? (expectedCents / 100).toFixed(2) : '',
                    );
                    setManualError(null);
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option
                    value="deposit"
                    disabled={
                      paidInboundTypes.has('deposit') || getExpectedAmountCents('deposit') === null
                    }
                  >
                    Deposit
                    {getExpectedAmountCents('deposit') === null ? ' (Missing total)' : ''}
                  </option>
                  <option
                    value="booking"
                    disabled={
                      paidInboundTypes.has('booking') || getExpectedAmountCents('booking') === null
                    }
                  >
                    Booking
                    {getExpectedAmountCents('booking') === null ? ' (Missing total)' : ''}
                  </option>
                  <option
                    value="checkin"
                    disabled={
                      paidInboundTypes.has('checkin') || getExpectedAmountCents('checkin') === null
                    }
                  >
                    Check-in
                    {getExpectedAmountCents('checkin') === null ? ' (Missing total)' : ''}
                  </option>
                </select>
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Amount (USD)
                <input
                  value={manualAmount}
                  onChange={(event) => setManualAmount(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="0.00"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Paid at
                <input
                  type="datetime-local"
                  value={manualPaidAt}
                  onChange={(event) => setManualPaidAt(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                Notes (optional)
                <textarea
                  value={manualNotes}
                  onChange={(event) => setManualNotes(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                />
              </label>
              {manualError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {manualError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setManualModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={
                    manualSubmitting ||
                    (!manualAmount.trim() && getExpectedAmountCents(manualType) === null) ||
                    (manualAmount.trim() !== '' && parseAmountToCents(manualAmount) === null)
                  }
                  className="rounded-full bg-slate-900 px-4 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {manualSubmitting ? 'Saving…' : 'Mark as paid'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
