import { NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type AccountPayload = {
  email?: string;
};

type AffiliateApplicationLookup = {
  id: string;
  status: string | null;
  auth_user_id?: string | null;
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
  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Unable to create partner account." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => null)) as AccountPayload | null;
  const email = payload?.email?.trim().toLowerCase() ?? "";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const applicationWithAuthUser = await admin
    .from("affiliate_applications")
    .select("id, status, auth_user_id")
    .eq("email", email)
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let application = applicationWithAuthUser.data as AffiliateApplicationLookup | null;
  let canLinkAuthUser = true;
  let error = applicationWithAuthUser.error;

  if (isMissingAuthUserIdColumn(error)) {
    canLinkAuthUser = false;
    const fallback = await admin
      .from("affiliate_applications")
      .select("id, status")
      .eq("email", email)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    application = fallback.data as AffiliateApplicationLookup | null;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!application?.id) {
    return NextResponse.json({ error: "Affiliate application not found." }, { status: 404 });
  }

  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (canLinkAuthUser && user?.id && user.email?.toLowerCase() === email && application.auth_user_id !== user.id) {
    await admin
      .from("affiliate_applications")
      .update({ auth_user_id: user.id })
      .eq("id", application.id);
  }

  return NextResponse.json({
    ok: true,
    applicationStatus: application.status ?? "pending",
    linked: Boolean(canLinkAuthUser && user?.id && user.email?.toLowerCase() === email),
    authUserLinkSupported: canLinkAuthUser,
  });
}
