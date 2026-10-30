import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isDesignatedTestGuest, isTestBookingEnabled } from "@/lib/test-guest-booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await createSupabaseServerClient();
  const { data: { user } } = await client.auth.getUser();
  return NextResponse.json({ eligible: isDesignatedTestGuest(user?.id) && await isTestBookingEnabled() }, {
    headers: { "Cache-Control": "no-store, private" },
  });
}
