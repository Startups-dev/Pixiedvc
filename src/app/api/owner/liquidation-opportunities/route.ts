import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const homeResortId = typeof payload?.home_resort_id === "string" ? payload.home_resort_id.trim() : null;
  const pointsAvailable = Number(payload?.points_available);
  const expirationDate =
    typeof payload?.expiration_date === "string" ? payload.expiration_date.trim() : "";
  const urgencyLevelRaw =
    typeof payload?.urgency_level === "string" ? payload.urgency_level.trim().toLowerCase() : "moderate";
  const urgencyLevel =
    urgencyLevelRaw === "not_urgent" || urgencyLevelRaw === "moderate" || urgencyLevelRaw === "urgent"
      ? urgencyLevelRaw
      : null;
  const travelWindowStart =
    typeof payload?.travel_window_start === "string" && payload.travel_window_start.trim()
      ? payload.travel_window_start.trim()
      : null;
  const travelWindowEnd =
    typeof payload?.travel_window_end === "string" && payload.travel_window_end.trim()
      ? payload.travel_window_end.trim()
      : null;
  const roomType =
    typeof payload?.room_type === "string" && payload.room_type.trim() ? payload.room_type.trim() : null;
  const targetPricePerPointCents = Number(payload?.target_price_per_point_cents);
  const flexibilityNotes =
    typeof payload?.flexibility_notes === "string" && payload.flexibility_notes.trim()
      ? payload.flexibility_notes.trim()
      : null;
  const newsletterOptIn = Boolean(payload?.newsletter_opt_in);

  if (!Number.isFinite(pointsAvailable) || pointsAvailable <= 0) {
    return NextResponse.json({ error: "Points available must be greater than zero." }, { status: 400 });
  }

  if (!expirationDate) {
    return NextResponse.json({ error: "Expiration date is required." }, { status: 400 });
  }
  if (!urgencyLevel) {
    return NextResponse.json(
      { error: "Urgency must be one of: not_urgent, moderate, urgent." },
      { status: 400 },
    );
  }

  if (travelWindowStart && travelWindowEnd) {
    const start = new Date(travelWindowStart);
    const end = new Date(travelWindowEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return NextResponse.json({ error: "Travel window end must be after start." }, { status: 400 });
    }
  }

  if (Number.isFinite(targetPricePerPointCents) && targetPricePerPointCents <= 0) {
    return NextResponse.json({ error: "Target price must be positive when provided." }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 500 });
  }

  const { data: ownerRecord } = await admin
    .from("owners")
    .select("id, user_id")
    .or(`id.eq.${user.id},user_id.eq.${user.id}`)
    .maybeSingle();

  const ownerId = ownerRecord?.id ?? null;

  const { data, error } = await admin
    .from("point_liquidation_requests")
    .insert({
      owner_user_id: user.id,
      owner_id: ownerId,
      home_resort_id: homeResortId,
      points_available: Math.round(pointsAvailable),
      expiration_date: expirationDate,
      urgency_level: urgencyLevel,
      travel_window_start: travelWindowStart,
      travel_window_end: travelWindowEnd,
      room_type: roomType,
      target_price_per_point_cents: Number.isFinite(targetPricePerPointCents)
        ? Math.round(targetPricePerPointCents)
        : null,
      flexibility_notes: flexibilityNotes,
      newsletter_opt_in: newsletterOptIn,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Unable to submit opportunity." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
