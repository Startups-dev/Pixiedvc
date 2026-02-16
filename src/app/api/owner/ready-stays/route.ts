import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeCapsForStay, FEE_PER_POINT_CENTS } from "@/lib/ready-stays/pricingEngine";

const GLOBAL_MIN_OWNER_CENTS = 1400;

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const rentalId = typeof payload?.rental_id === "string" ? payload.rental_id.trim() : "";
  const ownerPrice = Number(payload?.owner_price_per_point_cents);

  if (!rentalId || !Number.isFinite(ownerPrice)) {
    return NextResponse.json({ error: "Missing rental or pricing." }, { status: 400 });
  }
  if (ownerPrice <= 0) {
    return NextResponse.json({ error: "Invalid owner price." }, { status: 400 });
  }

  const { data: rental } = await supabase
    .from("rentals")
    .select("id, owner_user_id, resort_id, resort_code, check_in, check_out, points_required, room_type, match_id")
    .eq("id", rentalId)
    .maybeSingle();

  if (!rental || rental.owner_user_id !== user.id) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (rental.match_id) {
    return NextResponse.json({ error: "Ready stays require an owner reservation." }, { status: 400 });
  }

  if (!rental.resort_id || !rental.check_in || !rental.check_out || !rental.room_type || !rental.points_required) {
    return NextResponse.json({ error: "Reservation details missing." }, { status: 400 });
  }

  const { data: resort, error: resortError } = await supabase
    .from("resorts")
    .select("calculator_code")
    .eq("id", rental.resort_id)
    .maybeSingle();
  if (resortError) {
    return NextResponse.json({ error: "Unable to load resort metadata." }, { status: 500 });
  }

  const { data: milestones } = await supabase
    .from("rental_milestones")
    .select("code, status")
    .eq("rental_id", rental.id);

  const confirmationReady = (milestones ?? []).some(
    (item) => item.code === "disney_confirmation_uploaded" && item.status === "completed",
  );

  if (!confirmationReady) {
    return NextResponse.json({ error: "Disney confirmation is required before publishing." }, { status: 400 });
  }

  const caps = computeCapsForStay({
    checkIn: rental.check_in,
    checkOut: rental.check_out,
    resortCalculatorCode: resort?.calculator_code ?? null,
  });
  const maxOwnerPayoutCents = caps.maxOwnerPayoutStrictestCents;
  const minOwnerCents = GLOBAL_MIN_OWNER_CENTS;

  if (ownerPrice < minOwnerCents) {
    return NextResponse.json(
      {
        error: `Owner price below minimum. Minimum is $${(minOwnerCents / 100).toFixed(2)}/pt.`,
      },
      { status: 400 },
    );
  }

  if (ownerPrice > maxOwnerPayoutCents) {
    return NextResponse.json(
      {
        error:
          `Owner price above maximum for these dates/resort. ` +
          `Max is $${(maxOwnerPayoutCents / 100).toFixed(2)}/pt.`,
      },
      { status: 400 },
    );
  }

  const guestPrice = ownerPrice + FEE_PER_POINT_CENTS;

  const { data: createdReadyStay, error: insertError } = await supabase
    .from("ready_stays")
    .insert({
      owner_id: user.id,
      rental_id: rental.id,
      resort_id: rental.resort_id,
      check_in: rental.check_in,
      check_out: rental.check_out,
      points: rental.points_required,
      room_type: rental.room_type,
      season_type: caps.strictestSeasonType,
      owner_price_per_point_cents: ownerPrice,
      guest_price_per_point_cents: guestPrice,
      status: "active",
    })
    .select("id")
    .single();

  if (insertError) {
    const isDuplicate = insertError.code === "23505" || /duplicate key/i.test(insertError.message ?? "");
    if (isDuplicate) {
      const { data: existingReadyStay } = await supabase
        .from("ready_stays")
        .select("id")
        .eq("rental_id", rental.id)
        .eq("owner_id", user.id)
        .maybeSingle();
      return NextResponse.json({
        ok: true,
        id: existingReadyStay?.id ?? null,
        alreadyListed: true,
      });
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: createdReadyStay.id, alreadyListed: false });
}
