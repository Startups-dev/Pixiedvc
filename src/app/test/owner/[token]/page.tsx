import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
} from "@/lib/testing/private-testing";

export default async function OwnerTestEntryPage({ params }: { params: { token: string } }) {
  const token = params.token.trim().toLowerCase();
  const invite = await getPrivateTestInviteByToken(token);

  if (!isInviteUsable(invite) || invite.flow_type !== "owner") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">Invalid Owner Test Link</h1>
          <p className="mt-3 text-sm text-slate-600">
            This owner testing link is invalid, expired, or belongs to a different test flow.
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
    redirect(`/login?redirect=${encodeURIComponent(`/test/private/${token}`)}`);
  }

  const session = await ensurePrivateTestSession(invite, user.id);
  if (!session) {
    redirect(`/test/private/${token}/intake?state=save-error`);
  }

  if (session.status === "completed" || session.flow_completion_status === "completed") {
    redirect(`/test/private/${token}/complete`);
  }

  redirect(`/test/private/${token}/intake`);
}
