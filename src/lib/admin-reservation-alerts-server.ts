import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUserAdminState } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase-service-client";

export async function getAdminReservationAlertContext() {
  const state = await getCurrentUserAdminState();
  if (!state.user) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 }) };
  }
  if (!state.isAdmin) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }) };
  }
  try {
    return { ok: true as const, userId: state.user.id, client: createServiceClient() };
  } catch {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: "RESERVATION_ALERTS_UNAVAILABLE" }, { status: 503 }) };
  }
}
