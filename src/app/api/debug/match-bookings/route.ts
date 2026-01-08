import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { evaluateMatchBookings, parseMatchLimit } from "@/lib/match-bookings";

export async function GET(request: NextRequest) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "Service role key not configured" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const bookingId = searchParams.get("bookingId");
  const limit = parseMatchLimit(searchParams.get("limit"));

  const result = await evaluateMatchBookings({
    client: adminClient,
    bookingId,
    limit,
  });

  if (result.errors.length > 0) {
    return NextResponse.json(
      {
        error: "Failed to evaluate matches",
        errors: result.errors,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    eligibleBookings: result.eligibleBookings,
    evaluatedBookings: result.evaluatedBookings,
    errors: result.errors,
  });
}
