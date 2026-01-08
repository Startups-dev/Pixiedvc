import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { emailIsAllowedForAdmin } from "@/lib/admin-emails";

const allowedStatuses = new Set([
  "submitted",
  "reviewed",
  "approved",
  "offered",
  "used",
  "closed",
  "rejected",
]);

async function requireStaffOrAdmin() {
  const cookieStore = await cookies();
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, supabase, user: null };
  }

  const { data: profileRow } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = profileRow?.role ?? null;
  const isStaffRole = role === "staff" || role === "admin";
  const isAllowed = emailIsAllowedForAdmin(user.email) || isStaffRole;

  return { ok: isAllowed, supabase, user };
}

export async function GET() {
  const { ok, supabase } = await requireStaffOrAdmin();
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const client = supabaseAdmin ?? supabase;
  const { data, error } = await client
    .from("private_inventory")
    .select(
      "id, created_at, updated_at, owner_id, urgency_window, points_expiry_date, use_year, points_available, home_resort, resorts_allowed, travel_date_flexibility, already_booked, existing_confirmation_number, existing_reservation_details, min_net_to_owner_usd, fastest_possible, status, internal_notes, assigned_to, offered_to_guest_email, hold_until, closed_reason",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ ok: false, error: "Unable to load inventory." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, records: data ?? [] });
}

export async function PATCH(request: Request) {
  const { ok, supabase } = await requireStaffOrAdmin();
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const id = String(body?.id ?? "");
  const updates = body?.updates ?? {};

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  }

  if (updates.status && !allowedStatuses.has(updates.status)) {
    return NextResponse.json({ ok: false, error: "Invalid status." }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const client = supabaseAdmin ?? supabase;

  const { data, error } = await client
    .from("private_inventory")
    .update({
      status: updates.status,
      assigned_to: updates.assigned_to ?? null,
      internal_notes: updates.internal_notes ?? null,
      offered_to_guest_email: updates.offered_to_guest_email ?? null,
      hold_until: updates.hold_until ?? null,
      closed_reason: updates.closed_reason ?? null,
    })
    .eq("id", id)
    .select(
      "id, created_at, updated_at, owner_id, urgency_window, points_expiry_date, use_year, points_available, home_resort, resorts_allowed, travel_date_flexibility, already_booked, existing_confirmation_number, existing_reservation_details, min_net_to_owner_usd, fastest_possible, status, internal_notes, assigned_to, offered_to_guest_email, hold_until, closed_reason",
    )
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: "Unable to update record." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, record: data });
}
