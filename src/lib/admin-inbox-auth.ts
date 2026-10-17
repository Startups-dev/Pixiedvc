import { NextResponse } from "next/server";

import { isUserAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase-service-client";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

export async function getAdminInboxContext() {
  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 }),
    };
  }

  const eligibility = await getSupportAgentEligibility();
  const allowed = Boolean(eligibility?.isAdmin || eligibility?.isSupportAgent) || isUserAdmin({
    appRole: (user.app_metadata?.role as string | undefined) ?? null,
    email: user.email ?? null,
  });
  if (!allowed) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 }),
    };
  }

  try {
    return {
      ok: true as const,
      user: { id: user.id, email: user.email ?? null },
      client: createServiceClient(),
    };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: "INBOX_UNAVAILABLE" }, { status: 503 }),
    };
  }
}
