import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  ensurePrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
  savePrivateTestSurvey,
} from "@/lib/testing/private-testing";

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim().toLowerCase();
  if (!token) {
    return NextResponse.json({ error: "Missing test token." }, { status: 400 });
  }

  const redirectBack = `/test/private/${encodeURIComponent(token)}`;
  const intakeRedirect = `${redirectBack}/intake`;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectBack)}`, request.url), 303);
  }

  const invite = await getPrivateTestInviteByToken(token);
  if (!isInviteUsable(invite)) {
    return NextResponse.redirect(new URL(`${redirectBack}?state=invalid-link`, request.url), 303);
  }

  const session = await ensurePrivateTestSession(invite, user.id);
  if (!session || !session.consent_accepted || !session.confidentiality_accepted) {
    return NextResponse.redirect(new URL(`${intakeRedirect}?state=consent-required`, request.url), 303);
  }

  const ignoredKeys = new Set(["token"]);
  const responseAnswers: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (ignoredKeys.has(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    const existing = responseAnswers[key];
    if (typeof existing === "undefined") {
      responseAnswers[key] = trimmed;
    } else if (Array.isArray(existing)) {
      responseAnswers[key] = [...existing, trimmed];
    } else {
      responseAnswers[key] = [String(existing), trimmed];
    }
  }

  const wouldUseValue = String(responseAnswers.would_use_pixiedvc ?? responseAnswers.likelihood_to_use_or_list ?? "").toLowerCase();
  const wouldUse = wouldUseValue === "yes" || wouldUseValue === "no" || wouldUseValue === "maybe" ? wouldUseValue : null;
  const wouldListValue = String(responseAnswers.would_list_points ?? "").toLowerCase();
  const wouldList = wouldListValue === "yes" || wouldListValue === "no" || wouldListValue === "maybe" ? wouldListValue : null;

  const trustRaw = String(responseAnswers.trust_score ?? responseAnswers.trust_level ?? "");
  const parsedTrustScore = Number.parseInt(trustRaw, 10);
  const trustScore = Number.isFinite(parsedTrustScore) && parsedTrustScore >= 1 && parsedTrustScore <= 10 ? parsedTrustScore : null;

  const saved = await savePrivateTestSurvey({
    sessionId: session.id,
    surveyAnswers: responseAnswers,
    wouldUse,
    wouldList,
    trustScore,
  });

  if (!saved) {
    return NextResponse.redirect(new URL(`${redirectBack}?state=save-error`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`${redirectBack}?state=submitted`, request.url), 303);
}
