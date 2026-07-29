import { getSubscriberByUnsubscribeToken } from '@/lib/email-subscribers';

import { UnsubscribeClient } from './UnsubscribeClient';

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const subscriber = await getSubscriberByUnsubscribeToken(token).catch(() => null);

  if (!subscriber) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-20">
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">HannaDVC Preferences</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Invalid link</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            This unsubscribe link is invalid or expired.
          </p>
        </div>
      </main>
    );
  }

  if (subscriber.status === 'unsubscribed') {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-20">
        <div className="mx-auto max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">HannaDVC Preferences</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">You&rsquo;re already unsubscribed</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            We&rsquo;ve already stopped marketing emails for {subscriber.email}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-6 py-20">
      <UnsubscribeClient
        token={token}
        subscriber={{
          email: subscriber.email,
          status: subscriber.status,
          email_preferences: subscriber.email_preferences,
        }}
      />
    </main>
  );
}
