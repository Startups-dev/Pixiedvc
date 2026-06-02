import Link from 'next/link';

import { Card } from '@pixiedvc/design-system';
import { requireAdminUser } from '@/lib/admin';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { buildWelcomeSequencePreviewCards } from '@/lib/welcome-sequence-preview';

import { sendWelcomeSequenceTestAction } from './actions';

export const dynamic = 'force-dynamic';

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminWelcomeSequencePreviewPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await requireAdminUser('/admin/emails/welcome-sequence');
  const resolvedSearchParams = (await searchParams) ?? {};
  const successEmail = readParam(resolvedSearchParams.email)?.trim() ?? user.email ?? '';
  const sent = readParam(resolvedSearchParams.sent) === '1';
  const sentStep = readParam(resolvedSearchParams.step) ?? null;
  const error = readParam(resolvedSearchParams.error)?.trim() ?? '';

  const adminClient = getSupabaseAdminClient();
  const cards = buildWelcomeSequencePreviewCards();

  if (!adminClient) {
    return (
      <div className="min-h-screen bg-[#212121]">
        <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
          <header className="space-y-3">
            <Link href="/admin/emails" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
              ← Back to email logs
            </Link>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
              <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
                Welcome Sequence Previews
              </h1>
              <p className="text-sm text-[#b4b4b4]">Preview and send test versions of all six welcome sequence emails.</p>
            </div>
          </header>

          <Card surface="dark" className="border-[#3a3a3a] bg-[#2f2f2f] p-6 text-sm text-[#b4b4b4]">
            Missing service role key. Configure <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#212121]">
      <div className="mx-auto max-w-7xl space-y-8 px-6 py-12 text-[#ececec]">
        <header className="space-y-3">
          <Link href="/admin/emails" className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0] hover:text-[#ececec]">
            ← Back to email logs
          </Link>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Admin</p>
            <h1 className="text-3xl font-semibold" style={{ color: '#64748b' }}>
              Welcome Sequence Previews
            </h1>
            <p className="text-sm text-[#b4b4b4]">
              Preview the production welcome sequence copy and send isolated test emails without affecting subscriber progress.
            </p>
          </div>
        </header>

        {sent ? (
          <Card surface="dark" className="border-emerald-500/30 bg-emerald-500/12 p-4 text-sm text-emerald-200">
            Sent test email for day {sentStep ?? '—'} to <span className="font-semibold">{successEmail}</span>.
          </Card>
        ) : null}

        {error ? (
          <Card surface="dark" className="border-rose-500/30 bg-rose-500/12 p-4 text-sm text-rose-200">
            {error}
          </Card>
        ) : null}

        <section className="grid gap-6">
          {cards.map((card) => (
            <Card key={card.step} surface="dark" className="border-[#3a3a3a] bg-[#2a2a2a] p-6">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#8e8ea0]">{card.label}</p>
                  <h2 className="text-2xl font-semibold text-[#ececec]">{card.subject}</h2>
                  <p className="text-sm text-[#b4b4b4]">{card.previewText}</p>
                </div>

                <form action={sendWelcomeSequenceTestAction} className="w-full max-w-md space-y-3 rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4">
                  <input type="hidden" name="step" value={card.step} />
                  <div className="space-y-1">
                    <label htmlFor={`email-${card.step}`} className="text-xs uppercase tracking-[0.22em] text-[#8e8ea0]">
                      Test recipient
                    </label>
                    <input
                      id={`email-${card.step}`}
                      name="email"
                      type="email"
                      defaultValue={successEmail}
                      className="w-full rounded-xl border border-[#464646] bg-[#1f1f1f] px-4 py-3 text-sm text-[#ececec] outline-none placeholder:text-[#7d7d7d]"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <button type="submit" className="rounded-xl bg-[#64748b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7b8aa0]">
                    Send test email
                  </button>
                  <p className="text-xs text-[#8e8ea0]">
                    Logs to <code>outbound_emails</code> as a test send. Does not advance subscriber sequence state.
                  </p>
                </form>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8e8ea0]">Rendered HTML Preview</h3>
                  <div className="overflow-hidden rounded-2xl border border-[#3a3a3a] bg-white">
                    <iframe
                      title={`${card.label} HTML preview`}
                      srcDoc={card.html}
                      className="h-[760px] w-full bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8e8ea0]">Subject</h3>
                    <div className="rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4 text-sm text-[#ececec]">{card.subject}</div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8e8ea0]">Preview Text</h3>
                    <div className="rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4 text-sm text-[#ececec]">{card.previewText}</div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8e8ea0]">Plain Text</h3>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[#3a3a3a] bg-[#252525] p-4 text-xs leading-6 text-[#d7d7d7]">
                      {card.text}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
