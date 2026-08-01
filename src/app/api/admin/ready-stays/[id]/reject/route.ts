import { NextRequest, NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { sendReadyStayRejectedEmail } from "@/lib/email";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  let profileRole: string | null = null;
  if (user?.id) {
    const { data: profile } = await sessionClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    profileRole = profile?.role ?? null;
  }

  const allowed =
    !!user &&
    isUserAdmin({
      profileRole,
      appRole: (user?.app_metadata?.role as string | undefined) ?? null,
      email: user?.email ?? null,
    });

  if (!allowed) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ok: false as const, response: NextResponse.json({ error: "Service role not configured." }, { status: 500 }) };
  }

  return { ok: true as const, adminClient, userId: user.id };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const readyStayId = id?.trim();
  const payload = await request.json().catch(() => ({}));
  const reason = typeof payload?.reason === "string" ? payload.reason.trim() : "";

  if (!readyStayId) {
    return NextResponse.json({ error: "Missing Ready Stay id." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A denial reason is required." }, { status: 400 });
  }

  const { data: row, error } = await guard.adminClient
    .from("ready_stays")
    .select("id, owner_id, check_in, check_out, room_type, resorts(name)")
    .eq("id", readyStayId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Ready Stay not found." }, { status: 404 });
  }

  const { error: updateError } = await guard.adminClient
    .from("ready_stays")
    .update({
      status: "draft",
      verification_status: "rejected",
      verification_rejected_at: new Date().toISOString(),
      verification_approved_at: null,
      verification_review_notes: reason,
      verification_reviewed_by: guard.userId,
    })
    .eq("id", readyStayId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const { data: ownerRecord } = await guard.adminClient
    .from("owners")
    .select("email, display_name")
    .or(`user_id.eq.${row.owner_id},id.eq.${row.owner_id}`)
    .limit(1)
    .maybeSingle();
  const { data: profile } = await guard.adminClient
    .from("profiles")
    .select("email, display_name")
    .eq("id", row.owner_id)
    .maybeSingle();

  const ownerEmail = profile?.email ?? ownerRecord?.email ?? null;
  const ownerName = profile?.display_name ?? ownerRecord?.display_name ?? "HannaDVC owner";

  if (ownerEmail) {
    const resortName = row.resorts?.name ?? "your Ready Stay";
    const dates =
      row.check_in && row.check_out
        ? `${new Date(row.check_in).toLocaleDateString()} - ${new Date(row.check_out).toLocaleDateString()}`
        : "your submitted dates";

    await sendReadyStayRejectedEmail({
      to: ownerEmail,
      ownerName,
      resortName,
      roomType: row.room_type ?? null,
      dates,
      reason,
      templateKey: 'ready_stay_rejected',
      recipientUserId: row.owner_id,
      relatedEntityType: 'ready_stay',
      relatedEntityId: row.id,
      metadata: {
        readyStayId,
      },
    });
  }

  return NextResponse.json({ ok: true, id: readyStayId });
}
