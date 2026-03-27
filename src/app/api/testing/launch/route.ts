import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
  updatePrivateTestSessionProgress,
} from "@/lib/testing/private-testing";

function safeNextPath(nextValue: string | null | undefined, fallback: string) {
  if (!nextValue) return fallback;
  if (!nextValue.startsWith("/")) return fallback;
  if (nextValue.startsWith("//")) return fallback;
  return nextValue;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get("token") ?? "").trim().toLowerCase();

  if (!token) {
    return NextResponse.redirect(new URL("/test?state=invalid-link", request.url), 303);
  }

  const nextPath = safeNextPath(url.searchParams.get("next"), "/");
  const redirectBack = `/test/private/${encodeURIComponent(token)}`;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectBack)}`, request.url), 303);
  }

  const invite = await getPrivateTestInviteByToken(token);
  if (!isInviteUsable(invite)) {
    return NextResponse.redirect(new URL(`${redirectBack}/intake?state=invalid-link`, request.url), 303);
  }

  const session = await ensurePrivateTestSession(invite, user.id);
  if (!session) {
    return NextResponse.redirect(new URL(`${redirectBack}/intake?state=save-error`, request.url), 303);
  }

  if (session.status !== "completed" && session.flow_completion_status !== "completed") {
    await updatePrivateTestSessionProgress({
      sessionId: session.id,
      flowCompletionStatus: "platform_launched",
      eventType: "platform_launched",
      eventPayload: { next_path: nextPath, flow_type: invite.flow_type },
    });
  }

  return NextResponse.redirect(new URL(nextPath, request.url), 303);
}
