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

    const { data: conversation, error: conversationError } = await supabase
      .from("support_conversations")
      .insert({
        guest_user_id: userId,
        guest_type: userId ? "authenticated" : "anonymous",
        guest_name: name || null,
        guest_email: email,
        topic: "concierge_request",
        intake_message: message,
        page_url: sourcePage,
        status: "handoff",
      })
      .select("id")
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: conversationError?.message ?? "Unable to create support conversation.",
        },
        { status: 400 },
      );
    }

    await supabase.from("support_messages").insert({
      conversation_id: conversation.id,
      sender: "guest",
      sender_type: "guest",
      sender_user_id: userId,
      sender_display_name: name || "Guest",
      message,
      content: message,
      metadata: { source: "concierge_request_form", concierge_request_id: data.id },
    });

    await supabase.from("support_handoffs").upsert(
      {
        conversation_id: conversation.id,
        status: "open",
      },
      { onConflict: "conversation_id" },
    );

    await sendConciergeHandoffNotification({
      conversationId: conversation.id,
      name: name || null,
      email,
      message,
      pageUrl: sourcePage,
      source: "handoff",
    }).catch((notifyError) => {
      console.warn("[concierge/request] notification failed", notifyError);
    });

    return NextResponse.json({
      ok: true,
      requestId: data.id,
      conversationId: conversation.id,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }
}
