'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  matchId: string;
  matchStatus: string | null;
  hasRental: boolean;
  bookingId: string | null;
};

export default function AdminMatchControlPanel({
  matchId,
  matchStatus,
  hasRental,
  bookingId,
}: Props) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canExpire = !hasRental && ['pending_owner', 'pending'].includes(matchStatus ?? '');
  const canDelete = !hasRental;
  const canRematch =
    !hasRental && ['pending_owner', 'pending', 'declined', 'expired'].includes(matchStatus ?? '');

  function resetMessages() {
    setNotice(null);
    setError(null);
  }

  async function handleExpire() {
    resetMessages();
    const confirmed = window.confirm(
      'Expire match now? This unwinds reserved points and makes it eligible for rematching.',
    );
    if (!confirmed) return;

    setBusyAction('expire');
    try {
      const res = await fetch(`/api/admin/matching/${matchId}/expire`, { method: 'POST' });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || payload.error) {
        setError(payload.error ?? 'Failed to expire match.');
        return;
      }
      setNotice('Match expired.');
      router.refresh();
    } catch {
      setError('Failed to expire match.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete() {
    resetMessages();
    const confirmed = window.confirm(
      'Delete match permanently? This removes the record. Only use if no rental exists.',
    );
    if (!confirmed) return;

    setBusyAction('delete');
    try {
      const res = await fetch(`/api/admin/matching/${matchId}`, { method: 'DELETE' });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || payload.error) {
        setError(payload.error ?? 'Failed to delete match.');
        return;
      }
      setNotice('Match deleted.');
      router.push('/admin/matching');
      router.refresh();
    } catch {
      setError('Failed to delete match.');
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRematch() {
    resetMessages();
    const confirmed = window.confirm(
      'Rematch now? This will expire the current match and free reserved points so the booking can be matched again.',
    );
    if (!confirmed) return;

    setBusyAction('rematch');
    try {
      const res = await fetch(`/api/admin/matching/${matchId}/rematch`, { method: 'POST' });
      const payload = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || payload.error) {
        setError(payload.error ?? 'Failed to rematch.');
        return;
      }
      setNotice('Rematch requested.');
      router.refresh();
    } catch {
      setError('Failed to rematch.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Admin control</p>
      <div className="mt-4 space-y-3">
        <button
          onClick={handleExpire}
          disabled={!canExpire || busyAction !== null}
          className="w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
          type="button"
        >
          {busyAction === 'expire' ? 'Expiring…' : 'Expire match now'}
        </button>
        {!canExpire ? (
          <p className="text-xs text-slate-500">
            {hasRental
              ? 'Rental exists — cannot modify match here.'
              : 'Match status is not eligible for expire.'}
          </p>
        ) : null}

        <button
          onClick={handleRematch}
          disabled={!canRematch || busyAction !== null}
          className="w-full rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 disabled:opacity-50"
          type="button"
        >
          {busyAction === 'rematch' ? 'Rematching…' : 'Rematch'}
        </button>
        {!canRematch ? (
          <p className="text-xs text-slate-500">
            {hasRental
              ? 'Rental exists — cannot rematch.'
              : 'Match status is not eligible for rematch.'}
          </p>
        ) : null}

        <button
          onClick={handleDelete}
          disabled={!canDelete || busyAction !== null}
          className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
          type="button"
        >
          {busyAction === 'delete' ? 'Deleting…' : 'Delete match'}
        </button>
        {!canDelete ? (
          <p className="text-xs text-slate-500">
            Rental exists — cannot delete match.
          </p>
        ) : null}
      </div>

      {bookingId ? (
        <p className="mt-4 text-xs text-slate-500">Booking ID: {bookingId}</p>
      ) : null}
      {notice ? <p className="mt-3 text-xs text-emerald-600">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
