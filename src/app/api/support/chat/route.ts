import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase-service-client";
import {
  buildExcerpt,
  buildSupportContext,
} from "@/lib/support/retrieval";
import { buildSupportSystemPrompt } from "@/lib/support/prompt";
import { SUPPORT_EXAMPLES } from "@/lib/support/examples";

type ChatRole = "user" | "assistant";

type SupportChatMessage = {
  role: ChatRole;
  content: string;
};

type SupportDoc = {
  slug: string;
  title: string;
  category: string;
  content: string;
  updated_at?: string;
  similarity?: number;
};

type SupportSource = {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
};

type SupportChatDebugLog = {
  stage: string;
  ok: boolean;
  usedFallback: boolean;
  hasOpenAIKey: boolean;
  kbMatchCount: number;
  pageUrl: string | null;
  errorMessage?: string;
};

type RecommendationPreference =
  | "magic_kingdom"
  | "epcot"
  | "hollywood_studios"
  | "animal_kingdom"
  | "ocean"
  | "quiet_relaxing"
  | "couples_romantic"
  | "family_friendly"
  | "luxury_upscale"
  | "transportation"
  | null;

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

const globalRateLimit = globalThis as typeof globalThis & {
  __supportRateLimit?: Map<string, number[]>;
};
const rateLimitStore = globalRateLimit.__supportRateLimit ?? new Map<string, number[]>();
if (!globalRateLimit.__supportRateLimit) {
  globalRateLimit.__supportRateLimit = rateLimitStore;
}

function logSupportChatDebug(payload: SupportChatDebugLog) {
  console.log("[support/chat/debug]", payload);
}

function logSupportChatError(payload: SupportChatDebugLog) {
  console.error("[support/chat/debug]", payload);
}

function logSupportChatBranch(
  label:
    | "fallback:no-openai-key"
    | "fallback:conversation-persistence-failed"
    | "fallback:embedding-failed"
    | "fallback:no-kb-match"
    | "fallback:chat-completion-failed"
    | "fallback:empty-model-response"
    | "success:ai-response"
    | "success:kb-fallback",
  payload: Omit<SupportChatDebugLog, "stage">,
) {
  console.log("[support/chat/branch]", { stage: label, ...payload });
}

function detectSupportIntent(query: string) {
  const normalized = query.toLowerCase();
  if (
    normalized.includes("dvc") ||
    normalized.includes("disney vacation club") ||
    normalized.includes("point rental") ||
    normalized.includes("points")
  ) {
    return "dvc_basics";
  }
  if (
    normalized.includes("booking") ||
    normalized.includes("request") ||
    normalized.includes("reservation") ||
    normalized.includes("deposit") ||
    normalized.includes("agreement")
  ) {
    return "booking_flow";
  }
  if (normalized.includes("ready stay") || normalized.includes("ready stays")) {
    return "ready_stays";
  }
  if (
    normalized.includes("owner") ||
    normalized.includes("verification") ||
    normalized.includes("onboarding")
  ) {
    return "owner_onboarding";
  }
  if (
    normalized.includes("compare resort") ||
    normalized.includes("compare resorts") ||
    normalized.includes("ocean") ||
    normalized.includes("beach") ||
    normalized.includes("hollywood studios") ||
    normalized.includes("animal kingdom") ||
    normalized.includes("relaxing") ||
    normalized.includes("quiet") ||
    normalized.includes("family-friendly") ||
    normalized.includes("family friendly") ||
    normalized.includes("couples") ||
    normalized.includes("romantic") ||
    normalized.includes("luxury") ||
    normalized.includes("upscale") ||
    normalized.includes("transport") ||
    normalized.includes("transportation") ||
    normalized.includes("walkable") ||
    normalized.includes("epcot") ||
    normalized.includes("magic kingdom")
  ) {
    return "resort_guidance";
  }
  if (
    normalized.includes("resort") ||
    normalized.includes("jambo") ||
    normalized.includes("kidani") ||
    normalized.includes("riviera") ||
    normalized.includes("boardwalk") ||
    normalized.includes("beach club")
  ) {
    return "resort_guidance";
  }
  return "general";
}

function resolveIntentQuery(messages: SupportChatMessage[], query: string) {
  const normalized = query.trim().toLowerCase();
  const ambiguousFollowupSignals = [
    "i just told you",
    "as i said",
    "like i said",
    "same thing",
    "that one",
    "the one i said",
  ];
  const isAmbiguousFollowup = ambiguousFollowupSignals.some((signal) =>
    normalized.includes(signal),
  );
  if (!isAmbiguousFollowup) {
    return query;
  }

  const previousUserMessage = [...messages]
    .slice(0, -1)
    .reverse()
    .find((message) => message.role === "user" && message.content.trim().length > 0);
  return previousUserMessage?.content?.trim() || query;
}

function isFrustrationFollowup(query: string) {
  const normalized = query.trim().toLowerCase();
  const signals = [
    "did you understand",
    "i just told you",
    "as i said",
    "like i said",
    "same thing",
    "you already said",
  ];
  return signals.some((signal) => normalized.includes(signal));
}

function detectRecommendationPreference(query: string): RecommendationPreference {
  const normalized = query.toLowerCase();
  if (normalized.includes("magic kingdom")) return "magic_kingdom";
  if (normalized.includes("epcot")) return "epcot";
  if (normalized.includes("hollywood studios")) return "hollywood_studios";
  if (normalized.includes("animal kingdom")) return "animal_kingdom";
  if (normalized.includes("ocean") || normalized.includes("beach")) return "ocean";
  if (
    normalized.includes("quiet") ||
    normalized.includes("relaxing") ||
    normalized.includes("relaxed")
  ) {
    return "quiet_relaxing";
  }
  if (normalized.includes("couples") || normalized.includes("romantic")) {
    return "couples_romantic";
  }
  if (
    normalized.includes("family") ||
    normalized.includes("kids") ||
    normalized.includes("kid-friendly")
  ) {
    return "family_friendly";
  }
  if (normalized.includes("luxury") || normalized.includes("upscale")) {
    return "luxury_upscale";
  }
  if (
    normalized.includes("transport") ||
    normalized.includes("transportation") ||
    normalized.includes("walkable") ||
    normalized.includes("monorail") ||
    normalized.includes("skyliner")
  ) {
    return "transportation";
  }
  return null;
}

function resolveRecommendationState(messages: SupportChatMessage[], query: string) {
  const currentPreference = detectRecommendationPreference(query);
  const previousUserMessages = [...messages]
    .slice(0, -1)
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  const previousPreference =
    [...previousUserMessages]
      .reverse()
      .map((content) => detectRecommendationPreference(content))
      .find(Boolean) ?? null;
  const frustrationFollowup = isFrustrationFollowup(query);
  const activePreference =
    currentPreference || (frustrationFollowup ? previousPreference : null);
  const latestTurnChangedShortlist =
    currentPreference !== null && currentPreference !== previousPreference;

  return {
    currentPreference,
    previousPreference,
    activePreference,
    frustrationFollowup,
    latestTurnChangedShortlist,
  };
}

function buildResortFallback(preference: RecommendationPreference) {
  const byPreference: Record<Exclude<RecommendationPreference, null>, string> = {
    magic_kingdom:
      "For Magic Kingdom convenience, start with Bay Lake Tower, Polynesian Villas, and Grand Floridian Villas. Bay Lake Tower is usually the most direct, while Polynesian and Grand Floridian add strong atmosphere with excellent transportation options.",
    epcot:
      "For EPCOT access, top options are Beach Club, BoardWalk, and Riviera. Beach Club and BoardWalk are often preferred for walking convenience, while Riviera is strong for Skyliner connectivity.",
    hollywood_studios:
      "For easier Hollywood Studios access, Riviera and BoardWalk are common favorites. Riviera offers strong Skyliner convenience, while BoardWalk gives a lively EPCOT-area base with good access to both parks.",
    animal_kingdom:
      "For Animal Kingdom focus, Animal Kingdom Villas at Kidani and Jambo are usually the best fits. Kidani often feels calmer and villa-focused, while Jambo is preferred for main-lodge energy and dining access.",
    ocean:
      "For ocean-style stays, shortlist Aulani, Hilton Head, and Vero Beach. Aulani is destination-style Hawaii, Hilton Head is calmer and low-key, and Vero Beach is a simple beach-focused escape.",
    quiet_relaxing:
      "For a quieter pace, consider Old Key West, Saratoga Springs, and Kidani Village. Old Key West and Saratoga feel more spread out and relaxed, while Kidani is often chosen for a calmer villa atmosphere.",
    couples_romantic:
      "For couples, strong picks are Riviera, Grand Floridian Villas, and Polynesian Villas. Riviera feels refined and modern, Grand Floridian is classic and elegant, and Polynesian offers tropical atmosphere and signature views.",
    family_friendly:
      "For family-friendly stays, start with Beach Club, Polynesian Villas, and Bay Lake Tower. Beach Club is great for EPCOT-area convenience, Polynesian has broad family appeal, and Bay Lake Tower is popular for Magic Kingdom proximity.",
    luxury_upscale:
      "For a more upscale feel, Riviera and Grand Floridian Villas are top choices, with Polynesian as a premium atmosphere option. Riviera is polished and boutique-style, while Grand Floridian leans classic luxury.",
    transportation:
      "For transportation convenience, Bay Lake Tower and Polynesian are strong for Magic Kingdom access, while Riviera and Beach Club are excellent for EPCOT-area routing. Best fit depends on which park access matters most to you.",
  };
  return (
    byPreference[preference] ||
    "A useful shortlist: Aulani, Hilton Head, and Vero Beach for ocean-focused relaxation; Beach Club and BoardWalk for stronger EPCOT access; and Bay Lake Tower or Polynesian for easier Magic Kingdom access. If you share your priority, I can narrow to your best 2 options."
  );
}

function fallbackResponse(query = "", preference: RecommendationPreference = null, frustrationFollowup = false) {
  const intent = detectSupportIntent(query);
  const answerByIntent: Record<string, string> = {
    dvc_basics:
      "Disney Vacation Club point rental allows guests to stay at DVC resorts using a member’s points instead of booking Disney’s standard cash rate directly. On PixieDVC, you can estimate trip options and then submit a stay request.",
    booking_flow:
      "Booking usually starts with the calculator or a resort page, then moves to request details, agreement, and payment/confirmation milestones. If you want, I can walk you through each step in order.",
    ready_stays:
      "Ready Stays are pre-confirmed reservation options that can often be booked faster than a custom request. You can review the stay details and continue through the booking package flow.",
    owner_onboarding:
      "Owner onboarding covers profile details, required verification, and membership setup so owners can participate in listing or matching flows. I can break down each step if you want.",
    resort_guidance: buildResortFallback(preference),
    general:
      "I can help explain that. Share a bit more about what you want to compare or understand, and I’ll walk you through it clearly.",
  };

  const baseAnswer = answerByIntent[intent] ?? answerByIntent.general;
  const answer =
    frustrationFollowup && intent === "resort_guidance"
      ? `Yes, I understood. Based on your preference, ${baseAnswer.charAt(0).toLowerCase()}${baseAnswer.slice(1)}`
      : baseAnswer;

  return {
    answer,
    sources: [],
    confidence: "low",
    handoffSuggested: false,
  };
}

function shouldSuggestConcierge(query: string, context: ReturnType<typeof derivePageContext>) {
  const lowerQuery = query.toLowerCase();
  const escalationSignals = [
    "payment",
    "deposit",
    "login",
    "log in",
    "sign in",
    "account",
    "verification",
    "verify",
    "reservation status",
    "booking status",
    "request status",
    "my reservation",
    "my booking",
    "human",
    "agent",
    "concierge",
    "contact support",
    "talk to",
    "help with my",
  ];

  if (context.isPaymentPage || context.routeType === "owner_onboarding") {
    return true;
  }

  return escalationSignals.some((signal) => lowerQuery.includes(signal));
}

function derivePageContext(pageUrl: string) {
  let path = "";
  try {
    if (pageUrl) {
      path = new URL(pageUrl).pathname || "";
    }
  } catch {
    path = "";
  }

  const routeType = path.startsWith("/resorts/")
    ? "resort"
    : path.startsWith("/calculator")
      ? "calculator"
      : path.startsWith("/owner/onboarding")
        ? "owner_onboarding"
        : path.startsWith("/owner")
          ? "owner_portal"
          : path.startsWith("/ready-stays")
            ? "ready_stays"
            : path.startsWith("/booking/deposit")
              ? "payment_deposit"
              : path
                ? "general"
                : "unknown";

  const resortSlug =
    path.startsWith("/resorts/") && path.split("/").length > 2
      ? path.split("/")[2] || null
      : null;

  return {
    pageUrl: pageUrl || null,
    path: path || null,
    routeType,
    resortSlug,
    isCalculator: path.startsWith("/calculator"),
    isReadyStays: path.startsWith("/ready-stays"),
    isOwnerPage: path.startsWith("/owner"),
    isPaymentPage: path.startsWith("/booking/deposit"),
  };
}

function checkRateLimit(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const history = (rateLimitStore.get(ip) || []).filter((ts) => ts > windowStart);
  if (history.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  history.push(now);
  rateLimitStore.set(ip, history);
  return true;
}

async function keywordRetrieve(
  supabase: ReturnType<typeof createServiceClient>,
  query: string,
  selectedCategory: string,
) {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2);

  const orParts = [`title.ilike.%${query}%`, `content.ilike.%${query}%`];
  for (const token of tokens) {
    orParts.push(`title.ilike.%${token}%`);
    orParts.push(`content.ilike.%${token}%`);
  }

  const { data, error } = await supabase
    .from("support_kb_documents")
    .select("slug,title,category,content,updated_at")
    .or(orParts.join(","))
    .limit(6);

  if (error || !data || data.length === 0) {
    return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
  }

  let matches = data as SupportDoc[];
  if (selectedCategory) {
    matches = matches.filter((match) => match.category === selectedCategory);
  }

  const scored = matches
    .map((doc) => {
      const haystack = `${doc.title} ${doc.content}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (doc.title.toLowerCase().includes(token)) score += 3;
        if (haystack.includes(token)) score += 1;
      }
      if (doc.title.toLowerCase().includes(query.toLowerCase())) score += 4;
      return { ...doc, similarity: Math.min(1, score / 10) };
    })
    .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const top = scored[0];
  if (!top || (top.similarity ?? 0) < 0.2) {
    return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
  }

  return {
    docs: scored,
    confidence: (top.similarity ?? 0) >= 0.6 ? ("high" as const) : ("medium" as const),
    handoffSuggested: (top.similarity ?? 0) < 0.6,
  };
}

async function semanticRetrieve(
  _supabase: ReturnType<typeof createServiceClient>,
  _query: string,
  _selectedCategory: string,
  logBase: Pick<SupportChatDebugLog, "hasOpenAIKey" | "pageUrl">,
) {
  logSupportChatError({
    stage: "embedding",
    ok: false,
    usedFallback: true,
    hasOpenAIKey: logBase.hasOpenAIKey,
    kbMatchCount: 0,
    pageUrl: logBase.pageUrl,
    errorMessage: "semantic_retrieval_disabled_without_openai_embeddings",
  });
  logSupportChatBranch("fallback:embedding-failed", {
    ok: false,
    usedFallback: true,
    hasOpenAIKey: logBase.hasOpenAIKey,
    kbMatchCount: 0,
    pageUrl: logBase.pageUrl,
    errorMessage: "semantic_retrieval_disabled_without_openai_embeddings",
  });
  return { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
}

function buildSources(docs: SupportDoc[]): SupportSource[] {
  return docs.slice(0, 3).map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    category: doc.category,
    excerpt: buildExcerpt(doc.content),
  }));
}

function buildExampleConversationBlock() {
  return SUPPORT_EXAMPLES.map(
    (item) =>
      `Example conversation:\nUser: ${item.user}\nAssistant: ${item.assistant}`,
  ).join("\n\n");
}

export async function POST(request: Request) {
  const hasOpenAIKey = Boolean(process.env.GEMINI_API_KEY);
  let pageUrlForLog: string | null = null;
  let finalKbMatchCount = 0;

  try {
    if (!checkRateLimit(request)) {
      logSupportChatDebug({
        stage: "rate-limit",
        ok: false,
        usedFallback: true,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "rate_limited",
      });
      return NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429 },
      );
    }

    const body = await request.json();
    const messages = (body?.messages ?? []) as SupportChatMessage[];
    const lastMessage = messages[messages.length - 1];
    const selectedCategory = body?.category ? String(body.category) : "";
    const pageUrl = body?.pageUrl ? String(body.pageUrl) : "";
    pageUrlForLog = pageUrl || null;
    const conversationId = body?.conversationId ? String(body.conversationId) : null;

    logSupportChatDebug({
      stage: "request-received",
      ok: true,
      usedFallback: false,
      hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: pageUrlForLog,
    });

    if (!lastMessage || lastMessage.role !== "user") {
      logSupportChatDebug({
        stage: "validation",
        ok: false,
        usedFallback: true,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "missing_user_message",
      });
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const query = lastMessage.content.trim();
    const intentQuery = resolveIntentQuery(messages, query);
    const context = derivePageContext(pageUrl);
    const detectedIntent = detectSupportIntent(intentQuery);
    const recommendationState = resolveRecommendationState(messages, query);
    console.log("[support/chat/intent]", {
      detectedIntent,
      intentQuery,
      selectedCategory: selectedCategory || null,
      routeType: context.routeType,
    });
    console.log("[support/chat/recommendation-refinement]", {
      detectedRefinement: Boolean(recommendationState.currentPreference),
      currentRecommendationPreference: recommendationState.activePreference,
      latestTurnChangedShortlist: recommendationState.latestTurnChangedShortlist,
      frustrationFollowup: recommendationState.frustrationFollowup,
    });

    if (!hasOpenAIKey) {
      logSupportChatBranch("fallback:no-openai-key", {
        ok: false,
        usedFallback: true,
        hasOpenAIKey: false,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: "openai_key_missing",
      });
      return NextResponse.json(
        fallbackResponse(
          intentQuery,
          recommendationState.activePreference,
          recommendationState.frustrationFollowup,
        ),
      );
    }

    let supabase: ReturnType<typeof createServiceClient> | null = null;

    try {
      supabase = createServiceClient();
    } catch (error) {
      logSupportChatError({
        stage: "supabase-client",
        ok: false,
        usedFallback: false,
        hasOpenAIKey,
        kbMatchCount: 0,
        pageUrl: pageUrlForLog,
        errorMessage: error instanceof Error ? error.message : "supabase_client_failed",
      });
    }

    let activeConversationId = conversationId;
    let userMessageId: string | null = null;
    if (supabase) {
      try {
        if (!activeConversationId) {
          const { data: conversation, error: conversationError } = await supabase
            .from("support_conversations")
            .insert({
              status: "ai",
              page_url: context.pageUrl,
              context,
            })
            .select("id")
            .single();
          if (conversationError || !conversation) {
            logSupportChatError({
              stage: "conversation-persistence",
              ok: false,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: 0,
              pageUrl: pageUrlForLog,
              errorMessage: conversationError?.message ?? "conversation_create_failed",
            });
            logSupportChatBranch("fallback:conversation-persistence-failed", {
              ok: false,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: 0,
              pageUrl: pageUrlForLog,
              errorMessage: conversationError?.message ?? "conversation_create_failed",
            });
          } else {
            activeConversationId = conversation.id;
          }
        } else {
          const { error: conversationUpdateError } = await supabase
            .from("support_conversations")
            .update({ page_url: context.pageUrl, context, status: "ai" })
            .eq("id", activeConversationId);
          logSupportChatDebug({
            stage: "conversation-persistence",
            ok: !conversationUpdateError,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: conversationUpdateError?.message,
          });
        }
      } catch (error) {
        logSupportChatError({
          stage: "conversation-persistence",
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "conversation_persistence_failed",
        });
        logSupportChatBranch("fallback:conversation-persistence-failed", {
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "conversation_persistence_failed",
        });
      }

      if (activeConversationId) {
        try {
          const { data: userMessageRow } = await supabase
            .from("support_messages")
            .insert({
              conversation_id: activeConversationId,
              sender: "guest",
              content: query,
              metadata: { pageUrl: context.pageUrl, context },
            })
            .select("id")
            .single();
          userMessageId = userMessageRow?.id ?? null;
        } catch (error) {
          logSupportChatError({
            stage: "message-persistence-user",
            ok: false,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: error instanceof Error ? error.message : "user_message_insert_failed",
          });
        }
      }
    }

    logSupportChatDebug({
      stage: "message-persistence-user",
      ok: Boolean(userMessageId),
      usedFallback: false,
      hasOpenAIKey,
      kbMatchCount: 0,
      pageUrl: pageUrlForLog,
      errorMessage: userMessageId ? undefined : "user_message_not_persisted",
    });

    let retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
    if (supabase) {
      try {
        retrieval = await semanticRetrieve(supabase, query, selectedCategory, {
          hasOpenAIKey,
          pageUrl: pageUrlForLog,
        });
      } catch (error) {
        logSupportChatError({
          stage: "semantic-retrieval",
          ok: false,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: 0,
          pageUrl: pageUrlForLog,
          errorMessage: error instanceof Error ? error.message : "semantic_retrieval_failed",
        });
        retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
      }
      if (retrieval.docs.length === 0) {
        try {
          retrieval = await keywordRetrieve(supabase, query, selectedCategory);
        } catch (error) {
          logSupportChatError({
            stage: "keyword-retrieval",
            ok: false,
            usedFallback: false,
            hasOpenAIKey,
            kbMatchCount: 0,
            pageUrl: pageUrlForLog,
            errorMessage: error instanceof Error ? error.message : "keyword_retrieval_failed",
          });
          retrieval = { docs: [] as SupportDoc[], confidence: "low" as const, handoffSuggested: true };
        }
        logSupportChatDebug({
          stage: "keyword-retrieval",
          ok: true,
          usedFallback: false,
          hasOpenAIKey,
          kbMatchCount: retrieval.docs.length,
          pageUrl: pageUrlForLog,
        });
      }
    }
    finalKbMatchCount = retrieval.docs.length;
    if (finalKbMatchCount === 0) {
      logSupportChatBranch("fallback:no-kb-match", {
        ok: false,
        usedFallback: false,
        hasOpenAIKey,
        kbMatchCount: finalKbMatchCount,
        pageUrl: pageUrlForLog,
        errorMessage: "no_kb_match",
      });
    }

    const sources = buildSources(retrieval.docs);

    const contextBlock = [
      `Route type: ${context.routeType}`,
      `Page URL: ${context.pageUrl ?? "unknown"}`,
      `Path: ${context.path ?? "unknown"}`,
      `Resort slug: ${context.resortSlug ?? "none"}`,
      `Ready stay page: ${context.isReadyStays ? "yes" : "no"}`,
      `Calculator page: ${context.isCalculator ? "yes" : "no"}`,
      `Owner page: ${context.isOwnerPage ? "yes" : "no"}`,
      `Payment page: ${context.isPaymentPage ? "yes" : "no"}`,
      selectedCategory ? `Selected category: ${selectedCategory}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const kbContext = retrieval.docs.length
      ? buildSupportContext(
          retrieval.docs.map((doc) => ({
            slug: doc.slug,
            title: doc.title,
            category: doc.category,
            content: doc.content,
            similarity: doc.similarity ?? 0,
          })),
        )
      : "No support knowledge snippets were matched.";

    const handoffSuggested = shouldSuggestConcierge(query, context)
      ? retrieval.docs.length === 0
        ? true
        : retrieval.handoffSuggested || retrieval.confidence === "medium"
      : false;
    const contextualPrompt = [
      buildSupportSystemPrompt(),
      `Current page context:\n${contextBlock}`,
      `Knowledge snippets:\n${kbContext}`,
      `Example conversations:\n${buildExampleConversationBlock()}`,
      [
        "Live conversation:",
        ...messages
          .slice(-8)
          .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`),
      ].join("\n"),
    ].join("\n\n");

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const emit = (payload: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
        };

        void (async () => {
          let answer = "";
          let assistantMessageId: string | null = null;
          let streamUsedFallback = false;
          let answerSource: "ai" | "kb" | "generic-fallback" = "ai";
          let fallbackReplacedAi = false;
          emit({
            type: "start",
            conversationId: activeConversationId,
            userMessageId,
          });

          try {
            logSupportChatDebug({
              stage: "chat-completion",
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });

            const genAI = new GoogleGenerativeAI(geminiApiKey);
            const model = genAI.getGenerativeModel({
              model: "gemini-2.5-flash",
            });
            const result = await model.generateContentStream(contextualPrompt);
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (!text) continue;
              answer += text;
              emit({ type: "chunk", text });
            }
            console.log("[support/chat/ai-answer]", {
              rawAnswerLength: answer.trim().length,
              detectedIntent,
              selectedCategory: selectedCategory || null,
            });

            if (!answer.trim()) {
              streamUsedFallback = true;
              fallbackReplacedAi = true;
              logSupportChatBranch("fallback:empty-model-response", {
                ok: false,
                usedFallback: true,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
                errorMessage: "empty_model_response",
              });
              throw new Error("empty_model_response");
            }

            logSupportChatBranch("success:ai-response", {
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });
            logSupportChatDebug({
              stage: "chat-completion-result",
              ok: true,
              usedFallback: false,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
            });
          } catch (error) {
            streamUsedFallback = true;
            logSupportChatBranch("fallback:chat-completion-failed", {
              ok: false,
              usedFallback: true,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
              errorMessage: error instanceof Error ? error.message : "chat_completion_failed",
            });
            logSupportChatError({
              stage: "chat-completion-result",
              ok: false,
              usedFallback: true,
              hasOpenAIKey,
              kbMatchCount: finalKbMatchCount,
              pageUrl: pageUrlForLog,
              errorMessage: error instanceof Error ? error.message : "chat_completion_failed",
            });
            if (retrieval.docs.length > 0 && detectedIntent !== "resort_guidance") {
              answerSource = "kb";
              fallbackReplacedAi = true;
              logSupportChatBranch("success:kb-fallback", {
                ok: true,
                usedFallback: true,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
              });
              answer =
                retrieval.docs[0]?.content
                  .split(/(?<=[.!?])\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" ") ||
                "Based on our help docs, here’s what we can share. If you need help with a specific booking or account issue, I can also connect you with concierge support.";
            } else {
              answerSource = "generic-fallback";
              fallbackReplacedAi = true;
              answer = fallbackResponse(
                intentQuery,
                recommendationState.activePreference,
                recommendationState.frustrationFollowup,
              ).answer;
            }
            emit({ type: "chunk", text: answer });
          }

          if (supabase && activeConversationId) {
            try {
              const { data: assistantMessageRow } = await supabase
                .from("support_messages")
                .insert({
                  conversation_id: activeConversationId,
                  sender: "ai",
                  content: answer,
                  metadata: {
                    confidence: retrieval.confidence,
                    handoffSuggested,
                    sources: sources.map((source) => ({
                      slug: source.slug,
                      title: source.title,
                      category: source.category,
                    })),
                    context,
                  },
                })
                .select("id")
                .single();
              assistantMessageId = assistantMessageRow?.id ?? null;
            } catch (error) {
              logSupportChatError({
                stage: "message-persistence-assistant",
                ok: false,
                usedFallback: streamUsedFallback,
                hasOpenAIKey,
                kbMatchCount: finalKbMatchCount,
                pageUrl: pageUrlForLog,
                errorMessage: error instanceof Error ? error.message : "assistant_message_insert_failed",
              });
            }
          }

          logSupportChatDebug({
            stage: "message-persistence-assistant",
            ok: Boolean(assistantMessageId),
            usedFallback: streamUsedFallback,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
            errorMessage: assistantMessageId ? undefined : "assistant_message_not_persisted",
          });

          logSupportChatDebug({
            stage: "final-response",
            ok: true,
            usedFallback: streamUsedFallback,
            hasOpenAIKey,
            kbMatchCount: finalKbMatchCount,
            pageUrl: pageUrlForLog,
            errorMessage: streamUsedFallback ? "fallback_generated_response" : undefined,
          });
          console.log("[support/chat/final-answer]", {
            source: answerSource,
            rawAnswerLength: answer.trim().length,
            fallbackReplacedAi,
            detectedIntent,
            selectedCategory: selectedCategory || null,
          });

          emit({
            type: "done",
            conversationId: activeConversationId,
            userMessageId,
            assistantMessageId,
            answer,
            sources,
            confidence: retrieval.confidence,
            handoffSuggested,
          });
          controller.close();
        })().catch((error) => {
          controller.error(error);
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    logSupportChatError({
      stage: "route-exception",
      ok: false,
      usedFallback: true,
      hasOpenAIKey,
      kbMatchCount: finalKbMatchCount,
      pageUrl: pageUrlForLog,
      errorMessage: error instanceof Error ? error.message : "unknown_route_error",
    });
    return NextResponse.json(fallbackResponse());
  }
}
