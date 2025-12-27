'use client';

import { FormEvent, useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase';

type DisplayNameFormProps = {
  userId: string;
  initialValue: string;
};

export default function DisplayNameForm({ userId, initialValue }: DisplayNameFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState(initialValue ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) {
      setError('Display name cannot be empty.');
      setStatus('error');
      return;
    }

    setStatus('saving');
    setError(null);

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        display_name: value.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertError) {
      setStatus('error');
      setError(upsertError.message);
      return;
    }

    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-[#0f2148] p-6 text-white/90 shadow-[0_20px_40px_rgba(15,33,72,0.45)]">
      <div>
        <label htmlFor="display-name" className="block text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
          Display name
        </label>
        <input
          id="display-name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-base text-white placeholder:text-white/50 focus:border-white/50 focus:outline-none"
          placeholder="Jane Pixie"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-[#4b6aff] to-[#8f79ff] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(75,106,255,0.35)] transition hover:shadow-[0_12px_26px_rgba(75,106,255,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </button>
        {status === 'saved' ? <span className="text-sm text-emerald-300">Saved!</span> : null}
        {status === 'error' && error ? <span className="text-sm text-red-300">{error}</span> : null}
      </div>
    </form>
  );
}
