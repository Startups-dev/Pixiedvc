import { NextResponse } from "next/server";

import { emailIsAllowedForAdmin } from "@/lib/admin-emails";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { designatedTestGuestId } from "@/lib/test-guest-booking";

async function cleanup(execute: boolean) {
  const session = await createSupabaseServerClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user || !emailIsAllowedForAdmin(user.email)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 403 });
  }
  const guestId = designatedTestGuestId();
  const admin = getSupabaseAdminClient();
  if (!guestId || !admin) {
    return NextResponse.json({ error: "TEST_BOOKING_UNAVAILABLE" }, { status: 503 });
  }
  const { data, error } = await admin.rpc("cleanup_single_guest_test_bookings", {
    p_guest_id: guestId,
    p_execute: execute,
  });
  if (error) return NextResponse.json({ error: "TEST_BOOKING_CLEANUP_FAILED" }, { status: 409 });
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ guestId, candidateCount: result?.candidate_count ?? 0, deletedCount: result?.deleted_count ?? 0 });
}

export async function GET() {
  return cleanup(false);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.confirm !== "DELETE_TEST_BOOKINGS") {
    return NextResponse.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  }
  return cleanup(true);
}
