import { NextRequest, NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { buildReadyStayShowcaseDefaults } from "@/lib/ready-stays/owner-submission";
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const readyStayId = id?.trim();
  if (!readyStayId) {
    return NextResponse.json({ error: "Missing Ready Stay id." }, { status: 400 });
  }

  const { data: row, error } = await guard.adminClient
    .from("ready_stays")
    .select(
      "id, status, verification_status, reservation_proof_path, check_in, room_type, slug, title, short_description, image_url, sleeps, badge, cta_label, href, resort_id, resorts(name, slug, calculator_code)",
    )
    .eq("id", readyStayId)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Ready Stay not found." }, { status: 404 });
  }

  if (!row.reservation_proof_path) {
    return NextResponse.json(
      { error: "Reservation proof is required before this Ready Stay can be published." },
      { status: 400 },
    );
  }

  const defaults = buildReadyStayShowcaseDefaults({
    id: row.id,
    checkIn: row.check_in,
    resortName: row.resorts?.name ?? null,
    resortSlug: row.resorts?.slug ?? null,
    resortCode: row.resorts?.calculator_code ?? null,
    roomType: row.room_type,
  });

  const updatePayload = {
    status: "active",
    verification_status: "approved",
    verification_approved_at: new Date().toISOString(),
    verification_rejected_at: null,
    verification_review_notes: null,
    verification_reviewed_by: guard.userId,
    slug: row.slug?.trim() || defaults.slug,
    title: row.title?.trim() || defaults.title,
    short_description: row.short_description?.trim() || defaults.short_description,
    image_url: row.image_url?.trim() || defaults.image_url,
    sleeps: Number(row.sleeps ?? 0) > 0 ? row.sleeps : defaults.sleeps,
    badge: row.badge?.trim() || defaults.badge,
    cta_label: row.cta_label?.trim() || defaults.cta_label,
    href: row.href?.trim() || defaults.href,
    placement_home: false,
    placement_resort: true,
    placement_search: true,
  };

  const { error: updateError } = await guard.adminClient
    .from("ready_stays")
    .update(updatePayload)
    .eq("id", readyStayId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: readyStayId });
}
