import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getPrivateTestSession,
  getPrivateTestInviteByToken,
  isInviteUsable,
  savePrivateTestIntake,
} from "@/lib/testing/private-testing";

function asTruthy(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim().toLowerCase();
  if (!token) {
    return NextResponse.json({ error: "Missing test token." }, { status: 400 });
  }

  const redirectBack = `/test/private/${encodeURIComponent(token)}/intake`;
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

  const session = await getPrivateTestSession(invite.id, user.id);
  if (!session) {
    return NextResponse.redirect(new URL(`${redirectBack}?state=save-error`, request.url), 303);
  }

  const confidentialityAccepted = asTruthy(formData.get("confidentiality_accepted"));
  const consentAccepted = asTruthy(formData.get("consent_accepted"));

  if (!confidentialityAccepted || !consentAccepted) {
    return NextResponse.redirect(new URL(`${redirectBack}?state=consent-required`, request.url), 303);
  }

  const intakeAnswers = {
    tester_name: String(formData.get("tester_name") ?? "").trim(),
    tester_email: String(formData.get("tester_email") ?? "").trim().toLowerCase(),
    prior_dvc_experience: String(formData.get("prior_dvc_experience") ?? "").trim(),
    primary_goal: String(formData.get("primary_goal") ?? "").trim(),
    device_type: String(formData.get("device_type") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };

  const saved = await savePrivateTestIntake({
    invite,
    userId: user.id,
    confidentialityAccepted,
    consentAccepted,
    answers: intakeAnswers,
  });

  if (!saved) {
    return NextResponse.redirect(new URL(`${redirectBack}?state=save-error`, request.url), 303);
  }

  return NextResponse.redirect(new URL(`/test/private/${encodeURIComponent(token)}?state=intake-saved`, request.url), 303);
}
