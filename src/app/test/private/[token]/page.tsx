import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  getPrivateTestSurveyBySession,
  isInviteUsable,
  PRIVATE_TEST_FLOW_CONTENT,
  updatePrivateTestSessionProgress,
} from "@/lib/testing/private-testing";

import GuestReturnSurvey from "./GuestReturnSurvey";

function StateNotice({ state, ownerTone = false }: { state: string | null; ownerTone?: boolean }) {
  if (!state) return null;

  const messages: Record<string, string> = {
    "intake-saved": "You are are registered for testing",
    submitted: "Survey submitted. Thank you for participating in private testing.",
    "consent-required": "Complete confidentiality and consent before continuing.",
    "save-error": "We could not save your response. Please try again.",
    "invalid-link": "This private testing link is no longer active.",
  };

  const message = messages[state];
  if (!message) return null;
  const isSuccess = state === "intake-saved";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white/90 text-slate-700"
      } ${ownerTone && !isSuccess ? "border-white/20 bg-white/10 text-slate-100 backdrop-blur" : ""}`}
    >
      {message}
    </div>
  );
}

const GUEST_TASKS = [
  "Explore PixieDVC naturally from a guest perspective and describe what you think the platform does.",
  "Identify the reservation types offered and explain the difference in your own words.",
  "Decide which reservation type you would choose first and why.",
  "Try to find a stay that matches your trip goals and note any friction points.",
  "Continue naturally through the booking/request flow until you either complete it or hesitate.",
  "Return here and complete the survey with candid feedback.",
];

function getFirstName(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const [first] = trimmed.split(/\s+/);
  return first || null;
}

export default async function PrivateTestPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { state?: string };
}) {
  const { token } = params;
  const { state } = searchParams ?? {};
  const normalizedToken = token.trim().toLowerCase();
  const invite = await getPrivateTestInviteByToken(normalizedToken);

  if (!isInviteUsable(invite)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Private Test Link Unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">
            This test link is inactive or expired. Please request a fresh private link from the PixieDVC team.
          </p>
          <div className="mt-6">
            <Link href="/" className="text-sm font-semibold text-[#0F2148] underline-offset-2 hover:underline">
              Return to PixieDVC
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/test/private/${normalizedToken}`)}`);
  }

  let session = await ensurePrivateTestSession(invite, user.id);
  if (!session) {
    redirect(`/test/private/${normalizedToken}/intake?state=save-error`);
  }

  if (session.status === "completed" || session.flow_completion_status === "completed") {
    redirect(`/test/private/${normalizedToken}/complete`);
  }

  if (!session.consent_accepted || !session.confidentiality_accepted) {
    redirect(`/test/private/${normalizedToken}/intake`);
  }

  if (session.flow_completion_status !== "instructions_viewed" && session.flow_completion_status !== "platform_launched") {
    await updatePrivateTestSessionProgress({
      sessionId: session.id,
      flowCompletionStatus: "instructions_viewed",
      eventType: "instructions_viewed",
      eventPayload: { flow_type: invite.flow_type },
    });
    session = { ...session, flow_completion_status: "instructions_viewed" };
  }

  const survey = await getPrivateTestSurveyBySession(session.id);
  if (survey) {
    redirect(`/test/private/${normalizedToken}/complete`);
  }

  const flowContent = PRIVATE_TEST_FLOW_CONTENT[invite.flow_type];
  const isOwnerFlow = invite.flow_type === "owner";
  const intakeName = typeof session.intake_answers?.tester_name === "string" ? session.intake_answers.tester_name : null;
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;
  const emailName = user.email ? user.email.split("@")[0] : null;
  const testerFirstName = getFirstName(intakeName) ?? getFirstName(metadataName) ?? getFirstName(emailName) ?? "there";
  const launchHref = `/api/testing/launch?token=${encodeURIComponent(normalizedToken)}&next=${encodeURIComponent(
    flowContent.platformHref,
  )}`;

  return (
    <div className={isOwnerFlow ? "min-h-screen bg-gradient-to-b from-[#061632] via-[#0A2148] to-[#0B1B3A]" : ""}>
    <main className={`mx-auto max-w-4xl space-y-8 px-6 py-14 ${isOwnerFlow ? "text-slate-100" : ""}`}>
      {isOwnerFlow ? null : (
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Private User Testing</p>
          <h1 className="text-3xl font-semibold text-slate-900">PixieDVC {flowContent.title}</h1>
          <p className="max-w-3xl text-sm text-slate-600">{flowContent.intro}</p>
        </header>
      )}

      <StateNotice state={state ?? null} ownerTone={isOwnerFlow} />

      {invite.flow_type === "guest" ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Guest testing tasks</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {GUEST_TASKS.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ol>
          <div className="mt-6">
            <Link
              href={launchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700"
            >
              Launch guest platform flow
            </Link>
          </div>
        </section>
      ) : (
        <section className="space-y-10 rounded-[20px] border border-white/20 bg-white/10 p-8 shadow-[0_20px_60px_rgba(4,10,24,0.45)] backdrop-blur-xl">
          <div className="space-y-3">
            <p className="max-w-3xl text-base font-medium text-slate-100">
              Welcome {testerFirstName} — thank you for helping test PixieDVC
            </p>
            <h2>
              <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-4 py-1.5 text-sm font-extrabold uppercase tracking-[0.2em] !text-white">
                Owner Experience Test
              </span>
            </h2>
            <p className="text-sm text-slate-100/90">
              You’re testing the owner experience as if you were listing your points.
            </p>
            <p className="text-sm text-slate-100/90">
              Go through the process naturally.
            </p>
            <p className="text-sm text-slate-100/90">
              If anything feels unclear, slow, or uncertain, take note of it.
            </p>
            <p className="text-sm text-slate-100/90">
              When you’re done (or decide to stop), return here and complete the questions.
            </p>
          </div>

          <div className="space-y-3">
            <h3>
              <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] !text-white">
                What to do
              </span>
            </h3>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-100/90">
              <li>
                <span className="font-semibold !text-white">Sign up or log in</span>
              </li>
              <li>
                <span className="font-semibold !text-white">Use the main site:</span>
                <span className="block">
                  <Link href="https://www.pixiedvc.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-200 underline underline-offset-2">
                    👉 https://www.pixiedvc.com
                  </Link>
                </span>
              </li>
              <li>
                <span className="font-semibold !text-white">Complete the owner onboarding</span>
                <span className="block">Set up your account as if you were preparing to rent your points.</span>
              </li>
              <li>
                <span className="font-semibold !text-white">Create 3 Ready Stays</span>
                <span className="block">Add three sample listings.</span>
              </li>
              <li>
                <span className="font-semibold !text-white">Review a booking request</span>
                <span className="block">Open a booking request or package.</span>
              </li>
              <li>
                <span className="font-semibold !text-white">Accept the booking package</span>
                <span className="block">Go through the process as if it were a real booking.</span>
              </li>
            </ol>
          </div>

          <div className="space-y-3 rounded-2xl border border-amber-300/40 bg-amber-200/10 p-4">
            <h3>
              <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] !text-white">
                Important
              </span>
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-100/90">
              <li>This is a test — no real information is needed</li>
              <li>Names can be fake</li>
              <li>Points can be approximate</li>
              <li>Confirmation numbers can be fake</li>
              <li>Dates can be realistic but don’t need to be exact</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3>
              <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] !text-white">
                What to pay attention to
              </span>
            </h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-100/90">
              <li>anything confusing</li>
              <li>anything that slows you down</li>
              <li>anything that makes you hesitate</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3>
              <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.2em] !text-white">
                After you finish
              </span>
            </h3>
            <p className="text-sm text-slate-100/90">Return here and complete the questions with your honest feedback.</p>
          </div>

          <div>
            <Link
              href={launchHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold !text-white"
            >
              Launch owner platform flow
            </Link>
          </div>
        </section>
      )}

      {invite.flow_type === "guest" ? (
        <GuestReturnSurvey token={normalizedToken} submittedByEmail={user.email ?? ""} />
      ) : (
        <section className="rounded-[20px] border border-white/20 bg-white/10 p-8 shadow-[0_20px_60px_rgba(4,10,24,0.45)] backdrop-blur-xl">
          <h2>
            <span className="inline-block rounded-md border border-[#1b3b7a] bg-[#0F2148] px-4 py-1.5 text-sm font-extrabold uppercase tracking-[0.2em] !text-white">
              Owner Experience Test
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-200/90">
            Complete this after testing the owner experience. Your feedback helps us improve PixieDVC before launch.
          </p>
          <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100">
            Site link:{" "}
            <Link href={launchHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-200 underline underline-offset-2">
              {flowContent.platformHref}
            </Link>
          </div>

          <form
            action="/api/testing/survey"
            method="post"
            className="mt-6 grid gap-6 text-slate-100 [&_section]:space-y-4 [&_section]:rounded-2xl [&_section]:border [&_section]:border-white/15 [&_section]:bg-white/5 [&_section]:p-5 [&_p]:text-slate-300/85 [&_label>span]:text-slate-100 [&_textarea]:border-white/20 [&_textarea]:bg-white/10 [&_textarea]:text-slate-100 [&_textarea]:placeholder:text-slate-300/60 [&_select]:border-white/20 [&_select]:bg-[#0A1D3E]/70 [&_select]:text-slate-100 [&_input]:border-white/20 [&_input]:bg-[#0A1D3E]/70 [&_input]:text-slate-100"
          >
            <input type="hidden" name="token" value={normalizedToken} />
            <input type="hidden" name="submitted_by_email" value={user.email ?? ""} />

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">1. First Impression & Understanding</h3>
                <p className="mt-1 text-xs text-slate-500">Capture immediate understanding and early confusion.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">First impression: what do you think this platform does?</span>
                <textarea name="first_impression" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What is unclear?</span>
                <textarea name="what_is_unclear" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How easy was it to understand? (1–5, where 1 is very hard to understand and 5 is very easy to understand)</span>
                <select name="understanding_easy_score" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What do you think PixieDVC does for owners?</span>
                <textarea name="owner_platform_understanding" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">2. Listing Flow Understanding</h3>
                <p className="mt-1 text-xs text-slate-500">Check how clearly listing steps are understood.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How do you think owners list points here?</span>
                <textarea name="owner_listing_how_it_works" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What steps do you think are required?</span>
                <textarea name="listing_required_steps" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How clear is the listing flow? (1–5)</span>
                <select name="listing_flow_clarity_score" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What part of the listing process was confusing?</span>
                <textarea name="listing_confusing_part" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">3. Earnings & Monetization</h3>
                <p className="mt-1 text-xs text-slate-500">Understand confidence around pricing and payout structure.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How do you think owners make money here?</span>
                <textarea name="owner_earnings_understanding" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What do you think determines pricing?</span>
                <textarea name="owner_pricing_factors" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How clear is payout / earnings? (1–5)</span>
                <select name="payout_clarity_score" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What is unclear about how you get paid?</span>
                <textarea name="payout_unclear_details" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">4. Payout Preferences</h3>
                <p className="mt-1 text-xs text-slate-500">Capture preferred payout path and blockers.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Which payout method would you feel most comfortable receiving?</span>
                <select name="preferred_payout_method" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="e_transfer">E-transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Would lack of your preferred payout method stop you from listing?</span>
                <select name="payout_method_blocker" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What payout method would increase your confidence the most?</span>
                <textarea name="payout_confidence_method" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">5. Trust, Safety & Control</h3>
                <p className="mt-1 text-xs text-slate-500">Understand trust drivers and risk perception.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How safe does this feel for your points? (1–5)</span>
                <select name="points_safety_score" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What concerns you most about listing?</span>
                <textarea name="biggest_concern" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What would increase your trust?</span>
                <textarea name="trust_increase_needs" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What would make you comfortable listing today?</span>
                <textarea name="listing_comfort_requirements" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">How much do you trust this platform? (1–10)</span>
                <input type="number" min={1} max={10} name="trust_score" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">6. Friction & Hesitation</h3>
                <p className="mt-1 text-xs text-slate-500">Capture drop-off risks and hesitation moments.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">At what point did you feel uncertain or hesitant?</span>
                <textarea name="uncertain_point" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What made you hesitate?</span>
                <textarea name="login_hesitation_reason" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What almost stopped you from continuing?</span>
                <textarea name="almost_stopped_you" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What confused you the most?</span>
                <textarea name="biggest_confusion" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">7. Flow Completion</h3>
                <p className="mt-1 text-xs text-slate-500">Track completion outcomes and blockers.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Were you able to continue through the owner/listing flow?</span>
                <select name="continued_owner_flow" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="yes">Yes</option>
                  <option value="partially">Partially</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">If not, where did you stop?</span>
                <textarea name="flow_stop_point" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">If yes, did anything feel unnecessary or too long?</span>
                <textarea name="flow_unnecessary_steps" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">8. Account & Onboarding Experience</h3>
                <p className="mt-1 text-xs text-slate-500">Understand account timing and onboarding friction.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">If account creation/login happened, did it feel necessary at that point?</span>
                <textarea name="login_necessity_feedback" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Would you prefer to explore more before signing up?</span>
                <textarea name="explore_before_signup_preference" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What would make onboarding smoother?</span>
                <textarea name="onboarding_smoother_changes" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">9. Alternatives & Behavior</h3>
                <p className="mt-1 text-xs text-slate-500">Compare current behavior vs PixieDVC value.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">If PixieDVC did not exist, what would you do instead?</span>
                <textarea name="alternative_if_not_pixiedvc" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What makes this different from what you would normally do?</span>
                <textarea name="alternative_behavior_difference" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">10. Positive Signals</h3>
                <p className="mt-1 text-xs text-slate-500">Capture what worked and why.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What did you like most?</span>
                <textarea name="favorite_part" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What felt easy or intuitive?</span>
                <textarea name="positive_easy_intuitive" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">What would make you recommend this to another owner?</span>
                <textarea name="positive_recommendation_trigger" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
              <div>
                <h3 className="inline-flex rounded-md border border-[#1b3b7a] bg-[#0F2148] px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] !text-white">11. Final Decision</h3>
                <p className="mt-1 text-xs text-slate-500">Capture final listing intent.</p>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Would you list your points on PixieDVC?</span>
                <select name="would_list_points" className="mt-1.5 h-12 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required>
                  <option value="">Select one</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Why?</span>
                <textarea name="would_list_reason" rows={3} className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" required />
              </label>
            </section>

            <button
              type="submit"
              className="inline-flex min-h-12 items-center rounded-xl border border-white/20 bg-white/15 px-5 py-2.5 text-sm font-semibold !text-white"
            >
              Submit survey
            </button>
          </form>
        </section>
      )}
    </main>
    </div>
  );
}
