import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
} from "@/lib/testing/private-testing";

function StateNotice({ state }: { state: string | null }) {
  if (!state) return null;

  const messages: Record<string, string> = {
    "consent-required": "Both checkboxes are required before continuing.",
    "save-error": "We could not save your intake response. Please try again.",
    "invalid-link": "This private testing link is no longer active.",
  };

  const message = messages[state];
  if (!message) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
      {message}
    </div>
  );
}

export default async function PrivateTestIntakePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { state?: string };
}) {
  const token = params.token.trim().toLowerCase();
  const state = searchParams?.state ?? null;
  const invite = await getPrivateTestInviteByToken(token);

  if (!isInviteUsable(invite)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Private Test Link Unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">
            This test link is inactive or expired. Please request a fresh private link from the PixieDVC team.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/test/private/${token}`)}`);
  }

  const session = await ensurePrivateTestSession(invite, user.id);
  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Unable To Start Test</h1>
          <p className="mt-3 text-sm text-slate-600">We could not start your test session. Please try again.</p>
        </div>
      </main>
    );
  }

  if (session.status === "completed" || session.flow_completion_status === "completed") {
    redirect(`/test/private/${token}/complete`);
  }

  if (session.confidentiality_accepted && session.consent_accepted) {
    redirect(`/test/private/${token}`);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-14">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Private User Testing</p>
        <h1 className="text-3xl font-semibold text-slate-900">Confidentiality and consent</h1>
        <p className="text-sm text-slate-600">
          Before starting, confirm you understand this is a private test experience and agree to data collection for
          product testing analysis.
        </p>
      </header>

      <StateNotice state={state} />

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <form action="/api/testing/intake" method="post" className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="tester_email" value={user.email ?? ""} />

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Your name</span>
            <input
              name="tester_name"
              defaultValue={String((session.intake_answers?.tester_name as string | undefined) ?? "")}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Prior DVC experience</span>
            <select
              name="prior_dvc_experience"
              defaultValue={String((session.intake_answers?.prior_dvc_experience as string | undefined) ?? "")}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select one</option>
              <option value="none">None</option>
              <option value="some">Some familiarity</option>
              <option value="experienced">Experienced</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Primary goal for this test</span>
            <input
              name="primary_goal"
              defaultValue={String((session.intake_answers?.primary_goal as string | undefined) ?? "")}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder={invite.flow_type === "guest" ? "Book a stay for my trip" : "List points or understand owner flow"}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Testing on</span>
            <select
              name="device_type"
              defaultValue={String((session.intake_answers?.device_type as string | undefined) ?? "")}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select one</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="both">Both</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Notes (optional)</span>
            <textarea
              name="notes"
              rows={3}
              defaultValue={String((session.intake_answers?.notes as string | undefined) ?? "")}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input name="confidentiality_accepted" type="checkbox" className="mt-1" required />
            <span>
              I agree not to share the platform URL, screenshots, recordings, flows, content, or features from this
              private PixieDVC test.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input name="consent_accepted" type="checkbox" className="mt-1" required />
            <span>I consent to PixieDVC storing my responses for product testing analysis.</span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center rounded-xl bg-[#0F2148] px-5 py-2.5 text-sm font-semibold !text-white"
            >
              Accept and continue
            </button>
            <Link href="/" className="text-sm font-semibold text-slate-600 underline-offset-2 hover:underline">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
