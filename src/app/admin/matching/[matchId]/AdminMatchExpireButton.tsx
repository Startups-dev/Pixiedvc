'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  matchId: string;
  canExpire: boolean;
};

export default function AdminMatchExpireButton({ matchId, canExpire }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canExpire) {
    return null;
  }

  async function handleExpire() {
    setNotice(null);
    setError(null);
    const confirmed = window.confirm(
      'Expire match now? This unwinds reserved points and makes it eligible for rematching.',
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/matching/${matchId}/expire`, {
        method: 'POST',
      });
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
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleExpire}
        disabled={busy}
        className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 disabled:opacity-50"
      >
        {busy ? 'Expiring…' : 'Expire match now'}
      </button>
      {notice ? <p className="text-xs text-emerald-600">{notice}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
