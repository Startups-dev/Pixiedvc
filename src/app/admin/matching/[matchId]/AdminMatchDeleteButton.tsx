'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  matchId: string;
  disabled?: boolean;
};

export default function AdminMatchDeleteButton({ matchId, disabled }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return null;
  }

  async function handleDelete() {
    setNotice(null);
    setError(null);
    const confirmed = window.confirm(
      'Delete match permanently? This removes the record. Only use if no rental exists.',
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/matching/${matchId}`, {
        method: 'DELETE',
      });
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
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleDelete}
        disabled={busy}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete match'}
      </button>
      {notice ? <p className="text-xs text-emerald-600">{notice}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
