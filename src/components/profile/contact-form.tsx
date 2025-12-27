'use client';

import { FormEvent, useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase';

type ContactFormProps = {
  userId: string;
  initialPhone: string | null;
};

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '').trim();
}

export default function ContactForm({ userId, initialPhone }: ContactFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setError(null);

    const normalized = phone ? normalizePhone(phone) : null;

    if (normalized && normalized.length < 7) {
      setStatus('error');
      setError('Enter a valid phone number (at least 7 digits).');
      return;
    }

    const { error: upsertError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        phone: normalized,
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
          Phone number
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="(407) 555-0199"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-base text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <p className="mt-2 text-xs text-slate-500">
          We use this to reach you for booking confirmations and last-minute questions. Leave blank to remove the number on file.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-[#4b6aff] to-[#8f79ff] px-5 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(75,106,255,0.35)] transition hover:shadow-[0_12px_26px_rgba(75,106,255,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…' : 'Save phone'}
        </button>
        {status === 'saved' ? <span className="text-sm text-emerald-600">Saved!</span> : null}
        {status === 'error' && error ? <span className="text-sm text-red-500">{error}</span> : null}
      </div>
    </form>
  );
}
