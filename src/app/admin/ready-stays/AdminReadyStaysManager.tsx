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
  status: 'draft' | 'active' | 'sold' | 'expired' | 'paused' | 'removed';
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

const STATUS_OPTIONS: ReadyStayRow['status'][] = ['draft', 'active', 'sold', 'expired', 'paused', 'removed'];

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
    image_url: row.image_url ?? '',
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
    const owner = Number.isFinite(nextOwnerPrice) ? Math.max(0, Math.round(nextOwnerPrice)) : 0;
    setRowEditor(id, {
      owner_price_per_point_cents: owner,
      guest_price_per_point_cents: owner + 700,
    });
  }

  async function saveRow(id: string) {
    const row = editors[id];
    if (!row) return;

    setBusyId(id);
    setError(null);
    setNotice(null);

    const response = await fetch('/api/admin/ready-stays', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        featured: row.featured,
        priority: row.priority,
        sort_override: row.sort_override === '' ? null : Number(row.sort_override),
        placement_home: row.placement_home,
        placement_resort: row.placement_resort,
        placement_search: row.placement_search,
        image_url: row.image_url,
        badge: row.badge,
        cta_label: row.cta_label,
        href: row.href,
        sleeps: row.sleeps,
        expires_at: row.expires_at ? isoOrNull(row.expires_at) : null,
        owner_price_per_point_cents: row.owner_price_per_point_cents,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to save row.');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setNotice('Ready Stay updated.');
    router.refresh();
  }

  async function archiveRow(id: string) {
    if (!window.confirm('Archive this Ready Stay? It will be removed from public placements.')) return;

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
      setError(payload.error ?? 'Unable to archive row.');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    setNotice('Ready Stay archived.');
    router.refresh();
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

      <div className="overflow-x-auto rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f]">
        <table className="min-w-full text-left text-xs text-[#b4b4b4]">
          <thead className="border-b border-[#3a3a3a] bg-[#212121] uppercase tracking-[0.2em] text-[#8e8ea0]">
            <tr>
              <th className="px-3 py-2">Stay</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Placements</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Media/CTA</th>
              <th className="px-3 py-2">Pricing</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const editor = editors[row.id] ?? toEditor(row);
              const rowBusy = busyId === row.id;
              return (
                <tr key={row.id} className="border-b border-[#3a3a3a] align-top">
                  <td className="space-y-2 px-3 py-3">
                    <p className="font-semibold text-[#ececec]">{row.resorts?.name ?? row.resort_id}</p>
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.title} onChange={(e) => setRowEditor(row.id, { title: e.target.value })} placeholder="title" />
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.slug} onChange={(e) => setRowEditor(row.id, { slug: e.target.value })} placeholder="slug" />
                    <p className="text-[11px] text-[#8e8ea0]">{row.check_in} → {row.check_out}</p>
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <select className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.status} onChange={(e) => setRowEditor(row.id, { status: e.target.value as ReadyStayRow['status'] })}>
                      {STATUS_OPTIONS.map((status) => (<option key={status} value={status}>{status}</option>))}
                    </select>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editor.featured} onChange={(e) => setRowEditor(row.id, { featured: e.target.checked })} /> Featured</label>
                  </td>
                  <td className="space-y-1 px-3 py-3">
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editor.placement_home} onChange={(e) => setRowEditor(row.id, { placement_home: e.target.checked })} /> Home</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editor.placement_resort} onChange={(e) => setRowEditor(row.id, { placement_resort: e.target.checked })} /> Resort</label>
                    <label className="inline-flex items-center gap-2"><input type="checkbox" checked={editor.placement_search} onChange={(e) => setRowEditor(row.id, { placement_search: e.target.checked })} /> Search</label>
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <input type="number" className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.priority} onChange={(e) => setRowEditor(row.id, { priority: Number(e.target.value) })} placeholder="priority" />
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.sort_override} onChange={(e) => setRowEditor(row.id, { sort_override: e.target.value })} placeholder="sort override" />
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.image_url} onChange={(e) => setRowEditor(row.id, { image_url: e.target.value })} placeholder="image url" />
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.href} onChange={(e) => setRowEditor(row.id, { href: e.target.value })} placeholder="href" />
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.badge} onChange={(e) => setRowEditor(row.id, { badge: e.target.value })} placeholder="badge" />
                    <input className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1" value={editor.cta_label} onChange={(e) => setRowEditor(row.id, { cta_label: e.target.value })} placeholder="cta label" />
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <label className="block text-[11px] text-[#8e8ea0]">Owner payout / pt</label>
                    <input
                      type="number"
                      className="w-full rounded border border-[#3a3a3a] bg-[#212121] px-2 py-1"
                      value={editor.owner_price_per_point_cents}
                      onChange={(e) => updateRowOwnerPrice(row.id, Number(e.target.value))}
                      placeholder="owner payout / pt"
                    />
                    <p className="text-[11px] text-[#b4b4b4]">
                      Guest listing: ${(editor.guest_price_per_point_cents / 100).toFixed(2)}/pt
                    </p>
                    <p className="text-[11px] text-[#8e8ea0]">
                      Original guest: ${(editor.original_guest_price_per_point_cents / 100).toFixed(2)}/pt
                    </p>
                    {editor.guest_price_per_point_cents < editor.original_guest_price_per_point_cents ? (
                      <p className="text-[11px] font-semibold text-[#86efac]">
                        Price reduced
                        {editor.price_reduced_at ? ` • ${new Date(editor.price_reduced_at).toLocaleDateString()}` : ""}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[#8e8ea0]">No active markdown</p>
                    )}
                  </td>
                  <td className="space-y-2 px-3 py-3">
                    <button type="button" disabled={rowBusy} onClick={() => saveRow(row.id)} className="w-full rounded bg-[#10a37f] px-3 py-1 font-semibold text-white disabled:opacity-50">
                      {rowBusy ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" disabled={rowBusy} onClick={() => archiveRow(row.id)} className="w-full rounded border border-[#7f1d1d] bg-[#450a0a] px-3 py-1 font-semibold text-[#fecaca] disabled:opacity-50">
                      Archive
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
