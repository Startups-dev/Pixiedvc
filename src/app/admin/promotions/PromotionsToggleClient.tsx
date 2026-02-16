'use client';

import { useEffect, useState } from 'react';

type Props = {
  label: string;
  description: string;
  settingKey: 'promotions_guest_enrollment_enabled' | 'promotions_owner_enrollment_enabled';
  initialEnabled: boolean;
};

export default function PromotionsToggleClient({
  label,
  description,
  settingKey,
  initialEnabled,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/admin/promotions?key=${settingKey}`);
        if (!response.ok) {
          throw new Error('Unable to load setting');
        }
        const data = (await response.json()) as { enabled?: boolean };
        if (isMounted && typeof data.enabled === 'boolean') {
          setEnabled(data.enabled);
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [settingKey]);

  const handleToggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setIsSaving(true);
    setStatus('idle');

    try {
      const response = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: settingKey, enabled: next }),
      });

      if (!response.ok) {
        throw new Error('Unable to update setting');
      }
      setStatus('saved');
    } catch {
      setEnabled((prev) => !prev);
      setStatus('error');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setStatus('idle');
      }, 1600);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          className={`inline-flex h-10 w-20 items-center rounded-full border transition ${
            enabled
              ? 'border-emerald-400 bg-emerald-400'
              : 'border-slate-300 bg-slate-200'
          } ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
          aria-pressed={enabled}
        >
          <span
            className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold shadow transition ${
              enabled ? 'translate-x-10 text-emerald-600' : 'translate-x-0 text-slate-500'
            }`}
          >
            {enabled ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>
      {status === 'saved' ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Saved
        </p>
      ) : null}
      {status === 'error' ? (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
          Save failed
        </p>
      ) : null}
    </div>
  );
}
