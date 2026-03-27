import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  let profileRole: string | null = null;
  if (user?.id) {
    const { data: profile } = await sessionClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    profileRole = profile?.role ?? null;
  }

  const appRole = (user?.app_metadata?.role as string | undefined) ?? null;
  if (
    !user ||
    !isUserAdmin({
      profileRole,
      appRole,
      email: user.email ?? null,
    })
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key not configured." }, { status: 500 });
  }

  const url = new URL(request.url);
  const flow = (url.searchParams.get("flow") ?? "").trim().toLowerCase();
  const campaignSlug = (url.searchParams.get("campaign") ?? "").trim();

  let query = adminClient
    .from("private_test_sessions")
    .select(
      `
      id,
      user_id,
      flow_type,
      status,
      confidentiality_accepted,
      consent_accepted,
      intake_answers,
      started_at,
      completed_at,
      created_at,
      invite:private_test_invites!private_test_sessions_invite_id_fkey (
        id,
        token,
        label,
        flow_type,
        campaign_id,
        campaign:private_test_campaigns!private_test_invites_campaign_id_fkey (
          id,
          slug,
          name
        )
      ),
      survey:private_test_survey_responses!private_test_survey_responses_session_id_fkey (
        id,
        response_answers,
        submitted_at
      )
      `,
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (flow === "guest" || flow === "owner") {
    query = query.eq("flow_type", flow);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).filter((row) => {
    if (!campaignSlug) return true;
    const invite = (row as { invite?: { campaign?: { slug?: string | null } | null } | null }).invite;
    return (invite?.campaign?.slug ?? null) === campaignSlug;
  });

  const payload = {
    exported_at: new Date().toISOString(),
    filters: {
      flow: flow || null,
      campaign: campaignSlug || null,
    },
    total_rows: rows.length,
    rows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="private-test-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
