import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_STATUSES = new Set(["pending_review", "approved", "rejected", "featured", "closed"]);

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

  const appRole = (user?.app_metadata?.role as string | undefined) ?? null;
  const allowed =
    !!user &&
    isUserAdmin({
      profileRole,
      appRole,
      email: user.email ?? null,
    });

  if (!allowed) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return { ok: false as const, response: NextResponse.json({ error: "Service role not configured." }, { status: 500 }) };
  }

  return { ok: true as const, admin };
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data, error } = await admin
    .from("point_liquidation_requests")
    .select(
      "id, owner_user_id, points_available, expiration_date, urgency_level, travel_window_start, travel_window_end, room_type, target_price_per_point_cents, flexibility_notes, newsletter_opt_in, featured_in_newsletter, admin_approved, public_visibility, status, admin_notes, created_at, updated_at, home_resort:resorts(name), owner_profile:profiles(email, display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(400);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}

export async function PATCH(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const payload = (await request.json().catch(() => ({}))) as {
    id?: string;
    status?: string;
    admin_approved?: boolean;
    featured_in_newsletter?: boolean;
    public_visibility?: boolean;
    admin_notes?: string | null;
  };

  if (!payload.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  if (payload.status && !ALLOWED_STATUSES.has(payload.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (payload.status) update.status = payload.status;
  if (typeof payload.admin_approved === "boolean") update.admin_approved = payload.admin_approved;
  if (typeof payload.featured_in_newsletter === "boolean")
    update.featured_in_newsletter = payload.featured_in_newsletter;
  if (typeof payload.public_visibility === "boolean") update.public_visibility = payload.public_visibility;
  if (payload.admin_notes !== undefined) update.admin_notes = payload.admin_notes;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { error } = await admin.from("point_liquidation_requests").update(update).eq("id", payload.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
