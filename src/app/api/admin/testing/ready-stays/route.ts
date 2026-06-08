import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function deriveSleeps(roomType: string) {
  const value = roomType.toLowerCase();
  if (value.includes("studio")) return 4;
  if (value.includes("1") && value.includes("bed")) return 5;
  if (value.includes("2") && value.includes("bed")) return 8;
  if (value.includes("3") && value.includes("bed")) return 12;
  return 4;
}

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

  if (!allowed || !user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return { ok: false as const, response: NextResponse.json({ error: "Service role not configured." }, { status: 500 }) };
  }

  return { ok: true as const, adminClient, user };
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const { data, error } = await guard.adminClient
    .from("ready_stays")
    .select(
      "id, title, status, check_in, check_out, room_type, points, is_test_listing, is_visible_publicly, test_notes, test_guest_total_cents, test_owner_payout_cents, created_at, updated_at, booking_request_id, lock_session_id, sold_booking_request_id, resorts(name, slug)",
    )
    .eq("is_test_listing", true)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const payload = (await request.json().catch(() => null)) as
    | {
        resortId?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        guestPrice?: number;
        ownerPayout?: number;
        points?: number;
        notes?: string;
        visibility?: "admin" | "public";
      }
    | null;

  const resortId = payload?.resortId?.trim() ?? "";
  const roomType = payload?.roomType?.trim() ?? "";
  const checkIn = payload?.checkIn?.trim() ?? "";
  const checkOut = payload?.checkOut?.trim() ?? "";
  const guestPrice = Number(payload?.guestPrice ?? 1);
  const ownerPayout = Number(payload?.ownerPayout ?? 0);
  const points = Math.max(1, Number(payload?.points ?? 1));
  const notes = payload?.notes?.trim() ?? "";
  const visibility = payload?.visibility === "public" ? "public" : "admin";

  if (!resortId || !roomType || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Resort, room type, check-in, and check-out are required." }, { status: 400 });
  }

  const { data: resort, error: resortError } = await guard.adminClient
    .from("resorts")
    .select("id, name, slug, calculator_code")
    .eq("id", resortId)
    .maybeSingle();

  if (resortError || !resort) {
    return NextResponse.json({ error: resortError?.message ?? "Resort not found." }, { status: 400 });
  }

  let { data: owner } = await guard.adminClient
    .from("owners")
    .select("id, user_id, full_legal_name")
    .eq("user_id", guard.user.id)
    .maybeSingle();

  const ownerLegalName =
    String(guard.user.user_metadata?.full_name ?? "").trim() ||
    String(guard.user.user_metadata?.name ?? "").trim() ||
    (guard.user.email ?? "Admin Test Owner");

  if (!owner) {
    const { data: insertedOwner, error: ownerError } = await guard.adminClient
      .from("owners")
      .insert({
        user_id: guard.user.id,
        full_legal_name: ownerLegalName,
        email: guard.user.email ?? null,
        verification: "verified",
        verified_at: new Date().toISOString(),
      })
      .select("id, user_id, full_legal_name")
      .single();

    if (ownerError || !insertedOwner) {
      return NextResponse.json({ error: ownerError?.message ?? "Unable to create owner test record." }, { status: 500 });
    }

    owner = insertedOwner;
  } else if (!String(owner.full_legal_name ?? "").trim()) {
    const { data: updatedOwner, error: ownerUpdateError } = await guard.adminClient
      .from("owners")
      .update({
        full_legal_name: ownerLegalName,
        verified_at: new Date().toISOString(),
      })
      .eq("id", owner.id)
      .select("id, user_id, full_legal_name")
      .single();

    if (ownerUpdateError || !updatedOwner) {
      return NextResponse.json({ error: ownerUpdateError?.message ?? "Unable to update owner test record." }, { status: 500 });
    }

    owner = updatedOwner;
  }

  const ownerPayoutCents = Math.max(0, Math.round(ownerPayout * 100));
  const guestTotalCents = Math.max(100, Math.round(guestPrice * 100));

  const { data: rental, error: rentalError } = await guard.adminClient
    .from("rentals")
    .insert({
      owner_user_id: guard.user.id,
      resort_code: resort.calculator_code ?? resort.slug ?? "TEST",
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      points_required: points,
      rental_amount_cents: ownerPayoutCents,
      status: "approved",
    })
    .select("id")
    .single();

  if (rentalError || !rental) {
    return NextResponse.json({ error: rentalError?.message ?? "Unable to create test rental." }, { status: 500 });
  }

  const now = new Date().toISOString();
  const { error: milestoneError } = await guard.adminClient.from("rental_milestones").insert([
    { rental_id: rental.id, code: "matched", status: "completed", occurred_at: now },
    { rental_id: rental.id, code: "owner_approved", status: "completed", occurred_at: now },
    { rental_id: rental.id, code: "disney_confirmation_uploaded", status: "completed", occurred_at: now },
  ]);

  if (milestoneError) {
    return NextResponse.json({ error: milestoneError.message }, { status: 500 });
  }

  const slugBase = slugify(`${resort.slug ?? resort.name}-${roomType}-${checkIn}`);
  const slug = `test-${slugBase}-${Date.now().toString().slice(-6)}`;
  const title = `TEST • ${resort.name} • ${roomType}`;

  const { data: readyStay, error: readyStayError } = await guard.adminClient
    .from("ready_stays")
    .insert({
      owner_id: guard.user.id,
      rental_id: rental.id,
      resort_id: resort.id,
      check_in: checkIn,
      check_out: checkOut,
      points,
      room_type: roomType,
      season_type: "normal",
      owner_price_per_point_cents: 0,
      guest_price_per_point_cents: 700,
      status: "test",
      slug,
      title,
      short_description: "Admin-created test listing for QA and checkout validation.",
      sleeps: deriveSleeps(roomType),
      image_url: "/images/castle-hero.png",
      badge: "TEST",
      cta_label: "View Stay",
      featured: false,
      priority: 0,
      placement_home: false,
      placement_resort: false,
      placement_search: false,
      is_test_listing: true,
      is_visible_publicly: visibility === "public",
      test_created_by: guard.user.id,
      test_notes: notes || null,
      test_guest_total_cents: guestTotalCents,
      test_owner_payout_cents: ownerPayoutCents,
    })
    .select("id")
    .single();

  if (readyStayError || !readyStay) {
    return NextResponse.json({ error: readyStayError?.message ?? "Unable to create test Ready Stay." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: readyStay.id });
}

export async function DELETE(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return guard.response;

  const payload = (await request.json().catch(() => null)) as { id?: string } | null;
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { data: row, error: fetchError } = await guard.adminClient
    .from("ready_stays")
    .select("id, rental_id, booking_request_id, lock_session_id, sold_booking_request_id, is_test_listing")
    .eq("id", payload.id)
    .maybeSingle();

  if (fetchError || !row?.id) {
    return NextResponse.json({ error: fetchError?.message ?? "Test listing not found." }, { status: 404 });
  }

  if (!row.is_test_listing) {
    return NextResponse.json({ error: "Only test listings can be deleted here." }, { status: 400 });
  }

  const bookingIds = [row.booking_request_id, row.lock_session_id, row.sold_booking_request_id].filter(Boolean) as string[];

  const { error: deleteStayError } = await guard.adminClient.from("ready_stays").delete().eq("id", row.id);
  if (deleteStayError) {
    return NextResponse.json({ error: deleteStayError.message }, { status: 500 });
  }

  if (bookingIds.length) {
    await guard.adminClient.from("booking_requests").delete().in("id", bookingIds);
  }

  if (row.rental_id) {
    await guard.adminClient.from("rentals").delete().eq("id", row.rental_id);
  }

  return NextResponse.json({ ok: true });
}
