import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addTwilioParticipant,
  createTwilioAccessToken,
  isTwilioConfigured,
} from "@/lib/twilio-conversations";
import { verifySupportLiveGuestToken } from "@/lib/support/live-guest-token";

export async function GET(request: Request) {
  if (!isTwilioConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Twilio live chat is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversationId is required." },
      { status: 400 },
    );
  }

  const guestLiveToken = searchParams.get("guestLiveToken") ?? "";
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const supabase = createServiceClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("support_conversations")
    .select("id, guest_user_id, guest_type, twilio_conversation_sid")
    .eq("id", conversationId)
    .maybeSingle();

  if (conversationError || !conversation?.twilio_conversation_sid) {
    return NextResponse.json(
      { ok: false, error: "Live conversation unavailable." },
      { status: 404 },
    );
  }

  let identity = "";

  if (user) {
    const isGuest = conversation.guest_user_id === user.id;
    const { data: agent } = await supabase
      .from("support_agents")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const isAgent = Boolean(agent?.role === "agent" || agent?.role === "admin");
    if (!isGuest && !isAgent) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }
    identity = isAgent ? `agent:${user.id}` : `guest:${user.id}`;
  } else {
    const canUseAnonymousGuestIdentity =
      conversation.guest_type === "anonymous" &&
      verifySupportLiveGuestToken(guestLiveToken, conversationId);
    if (!canUseAnonymousGuestIdentity) {
      return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
    }
    identity = `guest:anon:${conversationId}`;
  }

  await addTwilioParticipant(conversation.twilio_conversation_sid, identity);

  const token = createTwilioAccessToken(identity);

  return NextResponse.json({
    ok: true,
    token,
    identity,
    conversationSid: conversation.twilio_conversation_sid,
  });
}
