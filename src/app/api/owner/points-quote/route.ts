import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { calculateStayPoints, StayCalculatorError } from "@/lib/stay/stayCalculator";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseYmdToUtcDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1));
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== (month ?? 1) - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function hasValidDateRange(checkIn: string, checkOut: string) {
  const start = parseYmdToUtcDate(checkIn);
  const end = parseYmdToUtcDate(checkOut);
  return Boolean(start && end && end > start);
}

function stayCalculatorStatus(error: StayCalculatorError) {
  switch (error.code) {
    case "ambiguous_accommodation":
      return 409;
    case "unsupported_resort":
    case "invalid_accommodation":
    case "invalid_dates":
    default:
      return 400;
  }
}

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
  const resortCode = readString(payload?.resort_code);
  const resortId = readString(payload?.resort_id);
  const roomCode = readString(payload?.room_code);
  const viewCode = readString(payload?.view_code);
  const roomType = readString(payload?.room_type);
  const checkIn = readString(payload?.check_in);
  const checkOut = readString(payload?.check_out);
  const isExactRequest = Boolean(resortCode || roomCode || viewCode);

  if (!checkIn || !checkOut || !hasValidDateRange(checkIn, checkOut)) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }

  if (isExactRequest) {
    if (!resortCode || !roomCode || !viewCode) {
      return NextResponse.json({ error: "invalid_accommodation" }, { status: 400 });
    }
  } else if (!resortId || !roomType) {
    return NextResponse.json({ error: "missing_stay_details" }, { status: 400 });
  }

  let legacyResortCode = "";
  if (!isExactRequest) {
    const { data: resort, error: resortError } = await supabase
      .from("resorts")
      .select("calculator_code")
      .eq("id", resortId)
      .maybeSingle();

    if (resortError) {
      return NextResponse.json({ error: "resort_metadata_unavailable" }, { status: 500 });
    }
    legacyResortCode = resort?.calculator_code ?? "";
  }

  try {
    const result = calculateStayPoints({
      resortCalculatorCode: isExactRequest ? resortCode : legacyResortCode,
      roomCode: isExactRequest ? roomCode : undefined,
      viewCode: isExactRequest ? viewCode : undefined,
      roomType: isExactRequest ? undefined : roomType,
      checkIn,
      checkOut,
    });

    return NextResponse.json({
      total_points: result.totalPoints,
      total_nights: result.totalNights,
      nights: result.nights,
    });
  } catch (error) {
    if (error instanceof StayCalculatorError) {
      return NextResponse.json({ error: error.code }, { status: stayCalculatorStatus(error) });
    }
    return NextResponse.json({ error: "unable_to_calculate_points" }, { status: 400 });
  }
}
