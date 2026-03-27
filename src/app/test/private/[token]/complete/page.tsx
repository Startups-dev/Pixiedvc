import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
} from "@/lib/testing/private-testing";

export default async function PrivateTestCompletePage({ params }: { params: { token: string } }) {
  const token = params.token.trim().toLowerCase();
  const invite = await getPrivateTestInviteByToken(token);

  if (!isInviteUsable(invite)) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Private Test Link Unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">This test link is inactive or expired.</p>
        </div>
      </main>
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/test/private/${token}/complete`)}`);
  }

  const session = await ensurePrivateTestSession(invite, user.id);
  const isGuestFlow = invite.flow_type === "guest";

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {isGuestFlow ? "Thank You" : "Private User Testing"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {isGuestFlow ? "You’ve completed the Guest Experience Test" : "Thank you for completing this test"}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          {isGuestFlow
            ? "Thank you for taking the time to explore PixieDVC and share your feedback."
            : "Your intake and survey responses were saved for PixieDVC product testing analysis."}
        </p>
        {isGuestFlow ? (
          <p className="mt-3 text-sm text-slate-600">
            Every response helps us make the platform clearer, faster, and more trustworthy before launch, and that
            makes a real difference.
          </p>
        ) : null}
        {session ? <p className="mt-4 text-xs text-slate-500">Session ID: {session.id}</p> : null}
        <div className="mt-6">
          <Link href="/" className="text-sm font-semibold text-[#0F2148] underline-offset-2 hover:underline">
            Return to PixieDVC
          </Link>
        </div>
      </section>
    </main>
  );
}
