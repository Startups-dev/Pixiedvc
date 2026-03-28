import { NextResponse } from "next/server";

import { sendConciergeHandoffNotification } from "@/lib/email";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createServiceClient } from "@/lib/supabase-service-client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const sourcePage = typeof body?.source_page === "string" ? body.source_page.trim() : null;
    const context = body?.context && typeof body.context === "object" ? body.context : null;
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    const userId = user?.id ?? null;

    if (!email || !message) {
      return NextResponse.json(
        { ok: false, error: "Email and message are required." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("concierge_requests")
      .insert({
        user_id: userId,
        name: name || null,
        email,
        message,
        context,
        source_page: sourcePage,
        status: "new",
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: error?.message ?? "Unable to create concierge request." },
        { status: 400 },
      );
    }

    await sendConciergeHandoffNotification({
      conversationId: data.id,
      name: name || null,
      email,
      message,
      pageUrl: sourcePage,
      source: "handoff",
    }).catch((notifyError) => {
      console.warn("[concierge/request] notification failed", notifyError);
    });

    return NextResponse.json({ ok: true, requestId: data.id });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }
}
