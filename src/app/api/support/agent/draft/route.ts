import { NextResponse } from "next/server";

import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupportAgentEligibility } from "@/lib/support-agent-auth";

type MessageRow = Record<string, unknown>;

type BookingState = {
  resort: string | null;
  dates: string | null;
  nights: number | null;
  partySize: number | null;
  roomType: string | null;
  budget: string | null;
};

type BookingPath = "ready_stays" | "liquidation_opportunities" | "matching_request";

const RESORT_MATCHERS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /\bbay lake tower\b/i, value: "Bay Lake Tower" },
  { pattern: /\briviera\b/i, value: "Riviera" },
  { pattern: /\bgrand floridian\b/i, value: "Grand Floridian" },
  { pattern: /\bpolynesian\b/i, value: "Polynesian" },
  { pattern: /\bbeach club\b/i, value: "Beach Club" },
  { pattern: /\bboardwalk\b/i, value: "BoardWalk" },
  { pattern: /\banimal kingdom\b/i, value: "Animal Kingdom Villas" },
  { pattern: /\bold key west\b/i, value: "Old Key West" },
  { pattern: /\bsaratoga\b/i, value: "Saratoga Springs" },
];

const nextQuestionMap: Record<keyof BookingState, string> = {
  dates:
    "Do you have exact check-in and check-out dates, or should I search a specific date range for you?",
  partySize: "How many people will be traveling?",
  resort:
    "Do you already have a preferred resort, or would you like me to suggest the best options?",
  roomType:
    "Do you prefer a studio, 1-bedroom, or are you open to the best fit for your group?",
  nights: "How many nights would you like to stay?",
  budget: "Do you have a target nightly budget or a total trip budget in mind?",
};

function normalizeSender(row: MessageRow) {
  const senderType =
    typeof row.sender_type === "string"
      ? row.sender_type
      : typeof row.sender === "string"
        ? row.sender
        : "system";
  const senderLabel =
    typeof row.sender_display_name === "string" && row.sender_display_name.trim()
      ? row.sender_display_name.trim()
      : senderType === "guest"
        ? "Guest"
        : senderType === "agent"
          ? "Agent"
          : senderType === "ai"
            ? "Pixie Concierge"
            : "System";
  const content =
    (typeof row.message === "string" && row.message.trim()) ||
    (typeof row.content === "string" && row.content.trim()) ||
    "";

  return {
    senderType,
    senderLabel,
    content,
  };
}

function extractBookingState(text: string): BookingState {
  const normalized = text.toLowerCase();

  const resort = RESORT_MATCHERS.find((item) => item.pattern.test(text))?.value ?? null;

  const datesMatch =
    text.match(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/) ??
    text.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,\s*\d{4})?\b/i,
    ) ??
    text.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s*(?:to|-)\s*(?:january|february|march|april|may|june|july|august|september|october|november|december)?\s*\d{1,2}(?:,\s*\d{4})?\b/i,
    ) ??
    text.match(
      /\b(?:check-?in|checkout|check out|arriving|arrival)\s*(?:on|for|is|:)?\s*([a-z]+\s+\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i,
    );
  const monthOnlyMatch = text.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
  );
  const dates = datesMatch
    ? datesMatch[0].trim()
    : monthOnlyMatch
      ? monthOnlyMatch[0].trim()
      : null;

  const nightsMatch = normalized.match(/\b(\d+)\s*nights?\b/);
  const nights = nightsMatch ? Number.parseInt(nightsMatch[1], 10) : null;

  const partyMatch =
    normalized.match(/\b(\d+)\s*(guests?|people|person|adults?|kids?|children)\b/) ??
    normalized.match(/\bparty of\s+(\d+)\b/);
  const partySize = partyMatch ? Number.parseInt(partyMatch[1], 10) : null;

  const roomTypeMatch =
    normalized.match(/\bstudio\b/) ??
    normalized.match(/\b1[-\s]?bed(room)?\b/) ??
    normalized.match(/\b2[-\s]?bed(room)?\b/) ??
    normalized.match(/\b3[-\s]?bed(room)?\b/);
  const roomType = roomTypeMatch ? roomTypeMatch[0].replace(/\s+/g, " ").trim() : null;

  const budgetMatch =
    text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/) ??
    normalized.match(/\b\d[\d,]*(?:\.\d{2})?\s*(?:per night|nightly|total)\b/);
  const budget = budgetMatch ? budgetMatch[0].trim() : null;

  return {
    resort,
    dates,
    nights,
    partySize,
    roomType,
    budget,
  };
}

function hasExactDates(dates: string | null) {
  if (!dates) return false;
  const normalized = dates.toLowerCase();
  return (
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(normalized) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b/.test(
      normalized,
    ) ||
    /\b(check-?in|checkout|check out)\b/.test(normalized)
  );
}

function getNextMissingField(state: BookingState): keyof BookingState | null {
  if (!hasExactDates(state.dates)) return "dates";
  if (!state.partySize) return "partySize";
  if (!state.resort) return "resort";
  if (!state.roomType) return "roomType";
  if (!state.nights) return "nights";
  if (!state.budget) return "budget";
  return null;
}

function getAcknowledgment(state: BookingState): string {
  if (state.resort?.toLowerCase().includes("riviera")) {
    return "Great choice, Riviera is a strong option.";
  }
  if (state.resort?.toLowerCase().includes("bay lake")) {
    return "Great choice, Bay Lake Tower is a strong option.";
  }
  if (state.resort) {
    return `Great choice, ${state.resort} is a strong option.`;
  }
  return "Thanks for the details.";
}

function detectBookingPath(transcript: string, state: BookingState): BookingPath {
  const normalized = transcript.toLowerCase();
  const liquidationSignals =
    normalized.includes("liquidation") ||
    normalized.includes("expiring points") ||
    normalized.includes("last-minute deal") ||
    normalized.includes("last minute deal") ||
    normalized.includes("last-minute deals") ||
    normalized.includes("last minute deals") ||
    normalized.includes("cheapest") ||
    normalized.includes("best deal") ||
    (normalized.includes("deal") && normalized.includes("flexible")) ||
    normalized.includes("i'm flexible") ||
    normalized.includes("im flexible");
  if (liquidationSignals) {
    return "liquidation_opportunities";
  }

  const readyStaySignals =
    normalized.includes("ready stay") ||
    normalized.includes("ready stays") ||
    normalized.includes("book now") ||
    normalized.includes("book instantly") ||
    normalized.includes("available now") ||
    normalized.includes("price reduced");
  if (readyStaySignals || (state.resort && hasExactDates(state.dates))) {
    return "ready_stays";
  }

  return "matching_request";
}

function buildSummary(state: BookingState): string {
  const subject = state.resort ? `a ${state.resort} stay` : "your stay";
  const datePart = state.dates
    ? hasExactDates(state.dates)
      ? `starting ${state.dates}`
      : `in ${state.dates}`
    : null;
  const nightsPart = state.nights
    ? `for ${state.nights} night${state.nights > 1 ? "s" : ""}`
    : null;
  const partyPart = state.partySize
    ? `for ${state.partySize} guest${state.partySize > 1 ? "s" : ""}`
    : null;
  const roomTypePart = state.roomType ? `with a ${state.roomType} preference` : null;
  const budgetPart = state.budget ? `around ${state.budget}` : null;

  const details = [datePart, nightsPart, partyPart, roomTypePart, budgetPart].filter(Boolean);
  if (details.length === 0) return `I’m seeing ${subject}.`;
  return `I’m seeing ${subject} ${details.join(" ")}.`;
}

function buildNextQuestion(path: BookingPath, nextField: keyof BookingState | null): string {
  if (path === "liquidation_opportunities") {
    if (nextField === "dates") {
      return "What date window can you travel in, and how flexible are you on exact dates?";
    }
    if (nextField === "resort") {
      return "Are you open to multiple resorts for the strongest deal, or should I focus on one resort first?";
    }
    if (nextField === "roomType") {
      return "Are you open to whichever room type prices best, or do you want me to prioritize a specific room type?";
    }
  }
  return nextField
    ? nextQuestionMap[nextField]
    : "Would you like me to move forward with checking the best available options?";
}

function buildNextStep(path: BookingPath): string {
  if (path === "ready_stays") {
    return "I’ll check confirmed Ready Stays first so we can prioritize an instant-book option.";
  }
  if (path === "liquidation_opportunities") {
    return "I’ll check current Liquidation Opportunities and prioritize the strongest value options.";
  }
  return "I’ll use this to narrow the best available options for your stay.";
}

function buildAgentDraft(state: BookingState, path: BookingPath): string {
  const nextField = getNextMissingField(state);
  const nextQuestion = buildNextQuestion(path, nextField);

  return [
    getAcknowledgment(state),
    buildSummary(state),
    buildNextStep(path),
    nextQuestion,
  ].join("\n\n");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const conversationId = String(body?.conversationId ?? "").trim();
  if (!conversationId) {
    return NextResponse.json(
      { ok: false, error: "conversationId is required." },
      { status: 400 },
    );
  }

  await createSupabaseServerClient();
  const eligibility = await getSupportAgentEligibility();
  if (!eligibility) {
    return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  }
  if (!eligibility.isAdmin && !eligibility.isSupportAgent) {
    return NextResponse.json({ ok: false, error: "NOT_AGENT_ELIGIBLE" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: handoff, error: handoffError } = await supabase
    .from("support_handoffs")
    .select("assigned_agent_user_id")
    .eq("conversation_id", conversationId)
    .maybeSingle();
  if (handoffError || !handoff) {
    return NextResponse.json({ ok: false, error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const isAdmin = eligibility.isAdmin;
  const isAssignedToAgent = handoff.assigned_agent_user_id === eligibility.user.id;
  if (!isAdmin && !isAssignedToAgent) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const { data: rows, error: rowsError } = await supabase
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(40);
  if (rowsError) {
    return NextResponse.json({ ok: false, error: "MESSAGE_LOAD_FAILED" }, { status: 400 });
  }

  const normalized = ((rows ?? []) as MessageRow[])
    .map(normalizeSender)
    .filter((row) => row.content.length > 0);

  const transcriptText = normalized
    .slice(-20)
    .map((row) => row.content)
    .join("\n");

  const bookingState = extractBookingState(transcriptText);
  const bookingPath = detectBookingPath(transcriptText, bookingState);
  const draft = buildAgentDraft(bookingState, bookingPath);

  return NextResponse.json({
    ok: true,
    draft,
    generated: true,
    state: bookingState,
    bookingPath,
  });
}
