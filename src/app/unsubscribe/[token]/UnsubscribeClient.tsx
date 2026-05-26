'use client';

import { useActionState } from 'react';

import type { EmailSubscriberRow } from '@/lib/email-subscribers';

import { submitUnsubscribeAction, type UnsubscribeActionState } from './actions';

type Props = {
  token: string;
  subscriber: Pick<EmailSubscriberRow, 'email' | 'status' | 'email_preferences'>;
};

const INITIAL_STATE: UnsubscribeActionState = {
  status: 'idle',
  message: null,
};

export function UnsubscribeClient({ token, subscriber }: Props) {
  const [state, formAction, pending] = useActionState(submitUnsubscribeAction, INITIAL_STATE);
  const marketingEnabled = state.status === 'preferences_updated'
    ? true
    : Boolean(subscriber.email_preferences?.marketing ?? subscriber.status !== 'unsubscribed');

  return (
    <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">PixieDVC Preferences</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Email preferences</h1>
        <p className="text-sm leading-7 text-slate-600">
          Update how PixieDVC emails <span className="font-medium text-slate-900">{subscriber.email}</span>.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="marketing"
            defaultChecked={marketingEnabled}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
          />
          <span className="text-sm leading-6 text-slate-700">
            Keep receiving PixieDVC founder updates, resort alerts, and future campaign emails.
          </span>
        </label>
      </div>

      {state.message ? (
        <p className="mt-6 text-sm text-slate-700">{state.message}</p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form action={formAction} className="sm:flex-1">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="intent" value="preferences" />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Save preferences
          </button>
        </form>

        <form action={formAction} className="sm:flex-1">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="intent" value="unsubscribe" />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Unsubscribe from all marketing emails
          </button>
        </form>
      </div>
    </div>
  );
}
