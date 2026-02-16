import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { calculateStayPoints } from "@/lib/stay/stayCalculator";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const resortId = typeof payload?.resort_id === "string" ? payload.resort_id.trim() : "";
  const roomType = typeof payload?.room_type === "string" ? payload.room_type.trim() : "";
  const checkIn = typeof payload?.check_in === "string" ? payload.check_in.trim() : "";
  const checkOut = typeof payload?.check_out === "string" ? payload.check_out.trim() : "";

  if (!resortId || !roomType || !checkIn || !checkOut) {
    return NextResponse.json({ error: "Missing stay details." }, { status: 400 });
  }

  const { data: resort, error: resortError } = await supabase
    .from("resorts")
    .select("calculator_code")
    .eq("id", resortId)
    .maybeSingle();

  if (resortError) {
    return NextResponse.json({ error: "Unable to load resort metadata." }, { status: 500 });
  }

  try {
    const result = calculateStayPoints({
      resortCalculatorCode: resort?.calculator_code ?? null,
      roomType,
      checkIn,
      checkOut,
    });

    return NextResponse.json({
      total_points: result.totalPoints,
      total_nights: result.totalNights,
      nights: result.nights,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate points.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
