'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Card } from '@pixiedvc/design-system';

type ResortOption = {
  id: string;
  name: string;
  slug: string | null;
  calculator_code: string | null;
};

type TestRow = {
  id: string;
  title: string | null;
  status: string;
  check_in: string;
  check_out: string;
  room_type: string | null;
  points: number;
  is_visible_publicly: boolean;
  test_notes: string | null;
  test_guest_total_cents: number | null;
  test_owner_payout_cents: number | null;
  created_at: string;
  resorts?: { name?: string | null; slug?: string | null } | null;
};

function formatCurrency(cents: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents ?? 0) / 100);
}

export default function AdminTestingClient({
  resorts,
  rows,
}: {
  adminUserId: string;
  resorts: ResortOption[];
  rows: TestRow[];
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    resortId: resorts[0]?.id ?? '',
    roomType: 'Studio',
    checkIn: '',
    checkOut: '',
    guestPrice: '1',
    ownerPayout: '0',
    points: '1',
    notes: '',
    visibility: 'admin' as 'admin' | 'public',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function createTestStay() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch('/api/admin/testing/ready-stays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resortId: form.resortId,
        roomType: form.roomType,
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        guestPrice: Number(form.guestPrice || '1'),
        ownerPayout: Number(form.ownerPayout || '0'),
        points: Number(form.points || '1'),
        notes: form.notes,
        visibility: form.visibility,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to create test stay.');
      setBusy(false);
      return;
    }

    setBusy(false);
    setNotice('Test Ready Stay created.');
    router.refresh();
  }

  async function deleteListing(id: string) {
    if (!window.confirm('Delete this test listing and its linked test rental?')) return;
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch('/api/admin/testing/ready-stays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? 'Unable to delete test stay.');
      setBusy(false);
      return;
    }

    setBusy(false);
    setNotice('Test Ready Stay deleted.');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.28em] text-[#8e8ea0]">Create Test Ready Stay</p>
          <h2 className="text-lg font-semibold text-[#ececec]">Create Test Ready Stay</h2>
          <p className="text-sm text-[#b4b4b4]">
            Use this to create temporary QA listings for guest flow, checkout, Stripe, and email testing.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Resort</span>
            <select className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.resortId} onChange={(e) => setForm((prev) => ({ ...prev, resortId: e.target.value }))}>
              {resorts.map((resort) => (
                <option key={resort.id} value={resort.id}>{resort.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Room type</span>
            <input className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.roomType} onChange={(e) => setForm((prev) => ({ ...prev, roomType: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Check-in date</span>
            <input type="date" className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.checkIn} onChange={(e) => setForm((prev) => ({ ...prev, checkIn: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Check-out date</span>
            <input type="date" className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.checkOut} onChange={(e) => setForm((prev) => ({ ...prev, checkOut: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Guest price</span>
            <input type="number" step="0.01" className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.guestPrice} onChange={(e) => setForm((prev) => ({ ...prev, guestPrice: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Owner payout</span>
            <input type="number" step="0.01" className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.ownerPayout} onChange={(e) => setForm((prev) => ({ ...prev, ownerPayout: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1]">
            <span>Number of points</span>
            <input type="number" min="1" className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.points} onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))} />
          </label>
          <label className="space-y-2 text-sm text-[#cbd5e1] md:col-span-2 xl:col-span-2">
            <span>Notes</span>
            <textarea className="min-h-[110px] w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-3 py-2" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </label>
          <div className="space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#212121] p-4 text-sm text-[#cbd5e1]">
            <p className="font-semibold text-[#ececec]">Visibility</p>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" checked={form.visibility === 'admin'} onChange={() => setForm((prev) => ({ ...prev, visibility: 'admin' }))} />
              <span>Admin only</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="visibility" checked={form.visibility === 'public'} onChange={() => setForm((prev) => ({ ...prev, visibility: 'public' }))} />
              <span>Public test mode</span>
            </label>
            {form.visibility === 'public' ? (
              <div className="rounded-xl border border-[#f5c965]/30 bg-[#3a2d12] px-3 py-3 text-xs text-[#f6d88a]">
                This test listing may be visible to real visitors. Use only on staging or for controlled testing.
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-[#ff6b6b]">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-[#86efac]">{notice}</p> : null}

        <div className="mt-6">
          <button type="button" disabled={busy} onClick={createTestStay} className="rounded-full bg-[#10a37f] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Creating...' : 'Create Test Ready Stay'}
          </button>
        </div>
      </Card>

      <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#8e8ea0]">Test Listings</p>
            <h2 className="text-lg font-semibold text-[#ececec]">All test listings</h2>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-[#3a3a3a] text-sm text-[#dbe4f0]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">
                <th className="px-3 py-3">Listing</th>
                <th className="px-3 py-3">Dates</th>
                <th className="px-3 py-3">Price</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3">Public</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#5b3b00] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f5c965]">Test</span>
                      <div>
                        <p className="font-semibold text-[#ececec]">{row.resorts?.name ?? 'Resort'}</p>
                        <p className="text-xs text-[#8e8ea0]">{row.room_type ?? row.title ?? row.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[#b4b4b4]">{row.check_in} → {row.check_out}</td>
                  <td className="px-3 py-3 text-[#b4b4b4]">{formatCurrency(row.test_guest_total_cents)} / payout {formatCurrency(row.test_owner_payout_cents)}</td>
                  <td className="px-3 py-3 text-[#b4b4b4]">{row.status}</td>
                  <td className="px-3 py-3 text-[#b4b4b4]">{new Date(row.created_at).toLocaleDateString('en-US')}</td>
                  <td className="px-3 py-3 text-[#b4b4b4]">{row.is_visible_publicly ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/ready-stays/${row.id}`} className="rounded-full border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#dbe4f0] hover:text-white">View</Link>
                      <Link href="/admin/ready-stays" className="rounded-full border border-[#3a3a3a] px-3 py-1.5 text-xs text-[#dbe4f0] hover:text-white">Edit</Link>
                      <button type="button" onClick={() => deleteListing(row.id)} className="rounded-full border border-[#5b2626] px-3 py-1.5 text-xs text-[#ffb4b4] hover:text-white">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
