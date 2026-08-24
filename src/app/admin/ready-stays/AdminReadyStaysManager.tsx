'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ResortOption = {
  id: string;
  name: string;
  slug: string | null;
};

type ReadyStayRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  status: 'draft' | 'active' | 'test' | 'sold' | 'expired' | 'paused' | 'removed';
  verification_status: 'not_submitted' | 'proof_uploaded' | 'submitted' | 'approved' | 'rejected' | null;
  verification_submitted_at: string | null;
  verification_approved_at: string | null;
  verification_rejected_at: string | null;
  verification_review_notes: string | null;
  reservation_proof_path: string | null;
  reservation_proof_name: string | null;
  reservation_proof_uploaded_at: string | null;
  reservation_proof_public_url?: string | null;
  featured: boolean;
  priority: number;
  sort_override: number | null;
  placement_home: boolean;
  placement_resort: boolean;
  placement_search: boolean;
  check_in: string;
  check_out: string;
  points: number;
  sleeps: number | null;
  image_url: string | null;
  badge: string | null;
  cta_label: string | null;
  href: string | null;
  expires_at: string | null;
  owner_id: string;
  rental_id: string;
  resort_id: string;
  room_type: string;
  season_type: string;
  owner_price_per_point_cents: number;
  guest_price_per_point_cents: number;
  original_guest_price_per_point_cents: number | null;
  price_reduced_at: string | null;
  created_at: string;
  updated_at: string;
  resorts?: {
    name?: string | null;
    slug?: string | null;
  } | null;
};

type Props = {
  rows: ReadyStayRow[];
  resorts: ResortOption[];
};

const STATUS_OPTIONS: ReadyStayRow['status'][] = ['draft', 'active', 'test', 'sold', 'expired', 'paused', 'removed'];

type RowEditor = {
  id: string;
  title: string;
  slug: string;
  status: ReadyStayRow['status'];
  featured: boolean;
  priority: number;
  sort_override: string;
  placement_home: boolean;
  placement_resort: boolean;
  placement_search: boolean;
  image_url: string;
  badge: string;
  cta_label: string;
  href: string;
  sleeps: number;
  expires_at: string;
  owner_price_per_point_cents: number;
  guest_price_per_point_cents: number;
  original_guest_price_per_point_cents: number;
  price_reduced_at: string;
};

function toEditor(row: ReadyStayRow): RowEditor {
  return {
    id: row.id,
    title: row.title ?? '',
    slug: row.slug ?? '',
    status: row.status,
    featured: Boolean(row.featured),
    priority: Number(row.priority ?? 0),
    sort_override: row.sort_override == null ? '' : String(row.sort_override),
    placement_home: Boolean(row.placement_home),
    placement_resort: Boolean(row.placement_resort),
    placement_search: Boolean(row.placement_search),
    image_url: row.image_url ?? row.reservation_proof_public_url ?? '',
    badge: row.badge ?? '',
    cta_label: row.cta_label ?? '',
    href: row.href ?? '',
    sleeps: Number(row.sleeps ?? 4),
    expires_at: row.expires_at ? row.expires_at.slice(0, 16) : '',
    owner_price_per_point_cents: Number(row.owner_price_per_point_cents ?? 0),
    guest_price_per_point_cents: Number(row.guest_price_per_point_cents ?? 0),
    original_guest_price_per_point_cents: Number(
      row.original_guest_price_per_point_cents ?? row.guest_price_per_point_cents ?? 0,
    ),
    price_reduced_at: row.price_reduced_at ? row.price_reduced_at.slice(0, 16) : "",
  };
}

function isoOrNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? new Date(trimmed).toISOString() : null;
}

function formatDateRange(checkIn: string, checkOut: string) {
  return `${checkIn} → ${checkOut}`;
}

function formatCurrencyFromCents(value: number) {
  return `$${(value / 100).toFixed(2)}`;
}

function formatDollars(value: number) {
  return `$${value.toFixed(2)}`;
}

function rowNeedsReview(row: ReadyStayRow) {
  return !isHistoricalReadyStay(row) && (row.status === 'draft' || row.verification_status === 'proof_uploaded');
}

export function isHistoricalReadyStay(row: Pick<ReadyStayRow, 'status' | 'verification_status'>) {
  return row.verification_status === 'rejected' || ['sold', 'expired', 'removed'].includes(row.status);
}

export function canEditReadyStayPricing(row: Pick<ReadyStayRow, 'status' | 'verification_status'>) {
  return !isHistoricalReadyStay(row) && ['active', 'test', 'paused'].includes(row.status);
}

export function canSoftRemoveReadyStay(row: Pick<ReadyStayRow, 'status' | 'verification_status'>) {
  return !isHistoricalReadyStay(row) && ['active', 'test', 'paused'].includes(row.status);
}

function getAdminStatusLabel(row: ReadyStayRow) {
  if (rowNeedsReview(row)) return 'submitted';
  if (row.status === 'active') return 'live';
  if (row.status === 'sold') return 'sold';
  if (row.verification_status === 'rejected') return 'needs info';
  return row.status;
}

export default function AdminReadyStaysManager({ rows, resorts }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [createForm, setCreateForm] = useState({
    owner_id: '',
    rental_id: '',
    resort_id: resorts[0]?.id ?? '',
    check_in: '',
    check_out: '',
    points: 0,
    room_type: '',
    season_type: 'normal',
    owner_price_per_point_cents: 0,
    guest_price_per_point_cents: 0,
    status: 'draft' as ReadyStayRow['status'],
    slug: '',
    title: '',
    short_description: '',
    sleeps: 4,
    image_url: '',
    badge: 'Ready to Book',
    cta_label: 'View Stay',
    href: '',
    featured: false,
    priority: 0,
    sort_override: '',
    placement_home: true,
    placement_resort: true,
    placement_search: false,
    expires_at: '',
  });

  const [editors, setEditors] = useState<Record<string, RowEditor>>(() => {
    const next: Record<string, RowEditor> = {};
    rows.forEach((row) => {
      next[row.id] = toEditor(row);
    });
    return next;
  });

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [rows]);
  function setRowEditor(id: string, patch: Partial<RowEditor>) {
    setEditors((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  }

function updateRowOwnerPrice(id: string, nextOwnerPrice: number) {
    const owner = Number.isFinite(nextOwnerPrice) ? Math.max(0, Math.round(nextOwnerPrice * 100)) : 0;
    setRowEditor(id, {
      owner_price_per_point_cents: owner,
      guest_price_per_point_cents: owner + 700,
    });
  }

  async function createRow() {
    if (!createForm.owner_id || !createForm.rental_id || !createForm.resort_id) {
      setError('owner_id, rental_id, and resort are required.');
      return;
    }
    if (!createForm.check_in || !createForm.check_out || !createForm.room_type) {
      setError('check_in, check_out, and room_type are required.');
      return;
    }

    setCreateLoading(true);
    setError(null);
    setNotice(null);

    const response = await fetch('/api/admin/ready-stays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createForm,
        sort_override: createForm.sort_override === '' ? null : Number(createForm.sort_override),
        expires_at: createForm.expires_at ? isoOrNull(createForm.expires_at) : null,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to create Ready Stay.');
      setCreateLoading(false);
      return;
    }

    setCreateLoading(false);
    setShowCreate(false);
    setNotice('Ready Stay created.');
    router.refresh();
  }

  async function removeListing(id: string) {
    if (!window.confirm('Remove this listing from public/admin active controls?')) return;

    setBusyId(id);
    setError(null);
    setNotice(null);

    const response = await fetch('/api/admin/ready-stays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to remove this listing.');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setNotice('Listing removed.');
    router.refresh();
  }

  async function approveSubmission(id: string) {
    setBusyId(id);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/admin/ready-stays/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to approve this Ready Stay.');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setNotice('Ready Stay approved and published.');
    router.refresh();
  }

  async function rejectSubmission(id: string) {
    const reason = window.prompt('Reason for denial');
    if (!reason || !reason.trim()) return;

    setBusyId(id);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/admin/ready-stays/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to deny this Ready Stay.');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setNotice('Owner notified and Ready Stay returned for more information.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: '#64748b' }}>Manage live placements</h2>
          <p className="text-sm text-[#b4b4b4]">Toggle visibility, featured state, ordering, and lower guest-facing listing prices when needed.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="rounded-full bg-[#10a37f] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0d8c6d]"
        >
          {showCreate ? 'Hide Create Form' : 'Create Ready Stay'}
        </button>
      </div>

      {error ? <p className="rounded-xl border border-[#7f1d1d] bg-[#450a0a] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-[#064e3b] bg-[#022c22] px-3 py-2 text-sm text-[#a7f3d0]">{notice}</p> : null}

      {showCreate ? (
        <section className="grid gap-3 rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-4 md:grid-cols-2">
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="owner_id" value={createForm.owner_id} onChange={(e) => setCreateForm((p) => ({ ...p, owner_id: e.target.value }))} />
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="rental_id" value={createForm.rental_id} onChange={(e) => setCreateForm((p) => ({ ...p, rental_id: e.target.value }))} />
          <select className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" value={createForm.resort_id} onChange={(e) => setCreateForm((p) => ({ ...p, resort_id: e.target.value }))}>
            {resorts.map((resort) => (
              <option key={resort.id} value={resort.id}>{resort.name}</option>
            ))}
          </select>
          <select className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" value={createForm.status} onChange={(e) => setCreateForm((p) => ({ ...p, status: e.target.value as ReadyStayRow['status'] }))}>
            {STATUS_OPTIONS.map((status) => (<option key={status} value={status}>{status}</option>))}
          </select>
          <input type="date" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" value={createForm.check_in} onChange={(e) => setCreateForm((p) => ({ ...p, check_in: e.target.value }))} />
          <input type="date" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" value={createForm.check_out} onChange={(e) => setCreateForm((p) => ({ ...p, check_out: e.target.value }))} />
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="title" value={createForm.title} onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))} />
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="slug" value={createForm.slug} onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))} />
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="room_type" value={createForm.room_type} onChange={(e) => setCreateForm((p) => ({ ...p, room_type: e.target.value }))} />
          <input className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="season_type" value={createForm.season_type} onChange={(e) => setCreateForm((p) => ({ ...p, season_type: e.target.value }))} />
          <input type="number" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="points" value={createForm.points} onChange={(e) => setCreateForm((p) => ({ ...p, points: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="sleeps" value={createForm.sleeps} onChange={(e) => setCreateForm((p) => ({ ...p, sleeps: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="owner_price_per_point_cents" value={createForm.owner_price_per_point_cents} onChange={(e) => setCreateForm((p) => ({ ...p, owner_price_per_point_cents: Number(e.target.value) }))} />
          <input type="number" className="rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="guest_price_per_point_cents" value={createForm.guest_price_per_point_cents} onChange={(e) => setCreateForm((p) => ({ ...p, guest_price_per_point_cents: Number(e.target.value) }))} />
          <input className="md:col-span-2 rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="image_url" value={createForm.image_url} onChange={(e) => setCreateForm((p) => ({ ...p, image_url: e.target.value }))} />
          <input className="md:col-span-2 rounded-lg border border-[#3a3a3a] bg-[#212121] px-3 py-2 text-sm" placeholder="href (optional)" value={createForm.href} onChange={(e) => setCreateForm((p) => ({ ...p, href: e.target.value }))} />
          <div className="md:col-span-2 flex flex-wrap gap-3 text-xs text-[#b4b4b4]">
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={createForm.featured} onChange={(e) => setCreateForm((p) => ({ ...p, featured: e.target.checked }))} /> Featured</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={createForm.placement_home} onChange={(e) => setCreateForm((p) => ({ ...p, placement_home: e.target.checked }))} /> Home</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={createForm.placement_resort} onChange={(e) => setCreateForm((p) => ({ ...p, placement_resort: e.target.checked }))} /> Resort</label>
            <label className="inline-flex items-center gap-2"><input type="checkbox" checked={createForm.placement_search} onChange={(e) => setCreateForm((p) => ({ ...p, placement_search: e.target.checked }))} /> Search</label>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="button" onClick={createRow} disabled={createLoading} className="rounded-full bg-[#10a37f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {createLoading ? 'Creating…' : 'Create Ready Stay'}
            </button>
          </div>
          <p className="md:col-span-2 text-[11px] text-[#8e8ea0]">
            Lowering owner price lowers the guest-facing listing price for this stay. Home placement is enabled by default for launch visibility.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4">
        {sortedRows.map((row) => {
          const editor = editors[row.id] ?? toEditor(row);
          const rowBusy = busyId === row.id;
          const requiresApproval = rowNeedsReview(row);
          const totalReservationCents = editor.guest_price_per_point_cents * row.points;
          const ownerPayoutPerPoint = editor.owner_price_per_point_cents / 100;
          const totalOwnerPayoutCents = editor.owner_price_per_point_cents * row.points;
          const platformEarningsPerPointCents =
            Math.max(0, editor.guest_price_per_point_cents - editor.owner_price_per_point_cents);
          const totalPlatformEarningsCents = platformEarningsPerPointCents * row.points;
          const isDeclined = row.verification_status === 'rejected';
          const isAccepted = row.status === 'active';
          const canEditPricing = canEditReadyStayPricing(row);
          const canRemove = canSoftRemoveReadyStay(row);

          return (
            <article key={row.id} className="rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-5">
              <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr_1fr]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-[#ececec]">{row.resorts?.name ?? row.resort_id}</p>
                      <p className="text-sm text-[#8e8ea0]">{formatDateRange(row.check_in, row.check_out)}</p>
                    </div>
                    <span className="rounded-full bg-[#212121] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8e8ea0]">
                      {getAdminStatusLabel(row)}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Reservation Proof</p>
                      {row.reservation_proof_public_url ? (
                        <a
                          href={row.reservation_proof_public_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-sm font-semibold text-[#ececec] underline underline-offset-4"
                        >
                          View uploaded confirmation
                        </a>
                      ) : (
                        <p className="mt-2 text-sm text-rose-300">Preview unavailable</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Room Type</p>
                      <p className="mt-2 text-sm text-[#ececec]">{row.room_type}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Points Needed</p>
                      <p className="mt-2 text-sm text-[#ececec]">{row.points} points</p>
                    </div>
                  <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Cost Per Point</p>
                    <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(editor.guest_price_per_point_cents)}</p>
                  </div>
                  <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Owner Payout / Point</p>
                    <p className="mt-2 text-sm text-[#ececec]">{formatDollars(ownerPayoutPerPoint)}</p>
                  </div>
                  <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Platform Take / Point</p>
                    <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(platformEarningsPerPointCents)}</p>
                  </div>
                  <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Total Reservation Cost</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(totalReservationCents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Total Owner Payout</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(totalOwnerPayoutCents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Total Platform Earnings</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatCurrencyFromCents(totalPlatformEarningsCents)}</p>
                    </div>
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Owner Payout / Point</p>
                      <p className="mt-2 text-sm text-[#ececec]">{formatDollars(ownerPayoutPerPoint)}</p>
                    </div>
                  </div>
                </div>
                </div>

                <div className="space-y-3">
                  {canEditPricing ? (
                    <div className="rounded-xl border border-[#3a3a3a] bg-[#212121] p-3">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8e8ea0]">Adjust Owner Payout / Point</p>
                      <input
                        type="number"
                        step="0.01"
                        className="mt-3 w-full rounded border border-[#3a3a3a] bg-[#2f2f2f] px-2 py-1 text-sm text-[#ececec]"
                        value={ownerPayoutPerPoint}
                        onChange={(e) => updateRowOwnerPrice(row.id, Number(e.target.value))}
                        placeholder="owner payout / pt"
                      />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    {requiresApproval ? (
                      <>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => approveSubmission(row.id)}
                          className="rounded-full bg-[#10a37f] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {rowBusy ? 'Saving…' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => rejectSubmission(row.id)}
                          className="rounded-full border border-[#7f1d1d] bg-[#450a0a] px-4 py-2 text-xs font-semibold text-[#fecaca] disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </>
                    ) : isAccepted ? (
                      <>
                        <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
                          Listing accepted.
                        </div>
                        {canRemove ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => removeListing(row.id)}
                            className="rounded-full border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-[#b4b4b4] disabled:opacity-50"
                          >
                            Remove Listing
                          </button>
                        ) : null}
                      </>
                    ) : isDeclined ? (
                      <>
                        <div className="space-y-3 rounded-xl border border-rose-800/60 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
                          <p>Listing declined.</p>
                          {row.verification_review_notes ? (
                            <div className="rounded-lg border border-rose-900/60 bg-black/10 px-3 py-2 text-rose-100">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-rose-300">Notes</p>
                              <p className="mt-2 text-sm">{row.verification_review_notes}</p>
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-xl border border-slate-700 bg-[#212121] px-4 py-3 text-sm text-[#b4b4b4]">
                          Listing status saved.
                        </div>
                        {canRemove ? (
                          <button
                            type="button"
                            disabled={rowBusy}
                            onClick={() => removeListing(row.id)}
                            className="rounded-full border border-slate-700 bg-transparent px-4 py-2 text-xs font-semibold text-[#b4b4b4] disabled:opacity-50"
                          >
                            Remove Listing
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
