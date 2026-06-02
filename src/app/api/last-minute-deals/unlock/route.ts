import { NextResponse } from "next/server";

import { ingestSubscriber } from "@/lib/email-subscribers";
import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      sourcePage?: string;
    };

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const sourcePage = typeof body.sourcePage === "string" ? body.sourcePage.trim() : "/last-minute-deals";

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
    }

    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();

    const supabase = createServiceClient();

    const message = "Last-minute deals unlock request";
    const context = {
      source: "last_minute_deals",
      unlocked_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("concierge_requests").insert({
      user_id: user?.id ?? null,
      name: null,
      email,
      message,
      source_page: sourcePage,
      context,
      status: "new",
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message || "Unable to save unlock request." },
        { status: 500 },
      );
    }

    try {
      await ingestSubscriber({
        email,
        userId: user?.id ?? null,
        source: "last_minute_unlock",
        tags: ["guest_lead", "liquidation_lead", "newsletter_subscriber"],
        emailPreferences: { marketing: true },
        explicitConsent: true,
        metadata: {
          capture_point: "last_minute_unlock",
          source_page: sourcePage,
        },
      });
    } catch (subscriberError) {
      console.error("[last-minute-deals/unlock] failed to sync subscriber", {
        email,
        sourcePage,
        message: subscriberError instanceof Error ? subscriberError.message : "unknown_error",
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload." }, { status: 400 });
  }
}
