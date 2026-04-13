import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    sourcePage?: string;
  };

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "Valid email is required." }, { status: 400 });
  }

  const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage.trim() : "/liquidation-opportunities";
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const service = createServiceClient();
  const { error } = await service.from("concierge_requests").insert({
    user_id: user?.id ?? null,
    name: null,
    email,
    message: "Requested access to liquidation opportunity details",
    source_page: sourcePage,
    context: { source: "liquidation_opportunities_unlock", requested_at: new Date().toISOString() },
    status: "new",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
