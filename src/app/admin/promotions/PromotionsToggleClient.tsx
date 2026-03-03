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
    <div className="rounded-3xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#64748b' }}>
            {label}
          </p>
          <p className="mt-1 text-sm text-[#b4b4b4]">{description}</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isSaving}
          className={`inline-flex h-10 w-20 items-center rounded-full border transition ${
            enabled
              ? 'border-[#10a37f] bg-[#10a37f]'
              : 'border-[#3a3a3a] bg-[#212121]'
          } ${isSaving ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
          aria-pressed={enabled}
        >
          <span
            className={`ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#ececec] text-xs font-semibold shadow transition ${
              enabled ? 'translate-x-10 text-[#0d8c6d]' : 'translate-x-0 text-[#5f6368]'
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
