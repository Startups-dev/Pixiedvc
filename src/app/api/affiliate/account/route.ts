import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AccountPayload = {
  email?: string;
};

function isMissingAuthUserIdColumn(error: { message?: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.code === "42703" ||
        error.message?.toLowerCase().includes("affiliate_applications.auth_user_id does not exist") ||
        error.message?.toLowerCase().includes("column affiliate_applications.auth_user_id does not exist")),
  );
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as AccountPayload | null;
  const email = payload?.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  // This endpoint also serves the public application-to-account flow. Never
  // reveal whether an arbitrary submitted email has an application or status.
  if (!user?.id || user.email?.trim().toLowerCase() !== email) {
    return NextResponse.json({ ok: true, linked: false });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Unable to link partner account." }, { status: 500 });
  const { data: application, error } = await admin
    .from("affiliate_applications")
    .select("id, auth_user_id")
    .eq("email", email)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to link partner account." }, { status: 503 });
  if (application?.id && application.auth_user_id !== user.id) {
    const { error: linkError } = await admin
      .from("affiliate_applications")
      .update({ auth_user_id: user.id })
      .eq("id", application.id);
    if (linkError && !isMissingAuthUserIdColumn(linkError)) {
      return NextResponse.json({ error: "Unable to link partner account." }, { status: 503 });
    }
  }

  return NextResponse.json({
    ok: true,
    linked: Boolean(application?.id),
  });
}
