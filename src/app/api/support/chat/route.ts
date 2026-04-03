import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServiceClient } from "@/lib/supabase-service-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

type GuestIdentity = {
  guestUserId: string | null;
  guestType: "authenticated" | "anonymous";
  guestName: string | null;
  guestEmail: string | null;
};

async function resolveGuestIdentity(): Promise<GuestIdentity> {
  try {
    const authClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return {
        guestUserId: null,
        guestType: "anonymous",
        guestName: "Anonymous Visitor",
        guestEmail: null,
      };
    }

    const metadataName =
      (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
      null;

    const { data: profile } = await authClient
      .from("profiles")
      .select("full_name, display_name")
      .eq("id", user.id)
      .maybeSingle();

    const profileName =
      (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
      (typeof profile?.display_name === "string" && profile.display_name.trim()) ||
      null;

    return {
      guestUserId: user.id,
      guestType: "authenticated",
      guestName: profileName ?? metadataName ?? user.email ?? "Guest",
      guestEmail: user.email ?? null,
    };
  } catch {
    return {
      guestUserId: null,
      guestType: "anonymous",
      guestName: "Anonymous Visitor",
      guestEmail: null,
    };
  }
}

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

type PricingPreference =
  | "payment_timing"
  | "deposit_meaning"
  | "cost_factors"
  | "value_compare"
  | "cancellation_policy"
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
    normalized.includes("how much") ||
    normalized.includes("cost") ||
    normalized.includes("price") ||
    normalized.includes("pricing") ||
    normalized.includes("cheaper") ||
    normalized.includes("value") ||
    normalized.includes("pay") ||
    normalized.includes("upfront") ||
    normalized.includes("balance due") ||
    normalized.includes("payment") ||
    normalized.includes("deposit") ||
    normalized.includes("billing") ||
    normalized.includes("cancel") ||
    normalized.includes("refund")
  ) {
    return "pricing_payments";
  }
  if (
    normalized.includes("dvc") ||
    normalized.includes("disney vacation club") ||
    normalized.includes("point rental") ||
    normalized.includes("points")
  ) {
    return "dvc_basics";
  }
  if (
    normalized.includes("dining plan") ||
    normalized.includes("disney dining plan")
  ) {
    return "dining_plan";
  }
  if (
    normalized.includes("my disney experience") ||
    normalized.includes("disney app") ||
    normalized.includes("link my reservation") ||
    normalized.includes("link reservation") ||
    normalized.includes("early theme park entry") ||
    normalized.includes("early entry") ||
    normalized.includes("lightning lane") ||
    normalized.includes("dining reservation")
  ) {
    return "disney_perks";
  }
  if (
    normalized.includes("best time to visit") ||
    normalized.includes("best time to go") ||
    normalized.includes("crowd") ||
    normalized.includes("busy season") ||
    normalized.includes("spring break") ||
    normalized.includes("summer") ||
    normalized.includes("weather") ||
    normalized.includes("holiday weekend")
  ) {
    return "trip_planning";
  }
  if (
    normalized.includes("availability") ||
    normalized.includes("owner match") ||
    normalized.includes("owner matching") ||
    normalized.includes("match my request") ||
    normalized.includes("guaranteed") ||
    normalized.includes("guarantee") ||
    normalized.includes("fill quickly") ||
    normalized.includes("booking window")
  ) {
    return "availability_matching";
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

function detectPricingPreference(query: string): PricingPreference {
  const normalized = query.toLowerCase();
  if (
    normalized.includes("do i pay all upfront") ||
    normalized.includes("when do i pay") ||
    normalized.includes("balance due") ||
    normalized.includes("payment plan") ||
    normalized.includes("pay upfront") ||
    normalized.includes("full payment")
  ) {
    return "payment_timing";
  }
  if (normalized.includes("deposit")) {
    return "deposit_meaning";
  }
  if (
    normalized.includes("how much") ||
    normalized.includes("cost") ||
    normalized.includes("price") ||
    normalized.includes("pricing") ||
    normalized.includes("what affects")
  ) {
    return "cost_factors";
  }
  if (
    normalized.includes("cheaper") ||
    normalized.includes("better value") ||
    normalized.includes("vs disney")
  ) {
    return "value_compare";
  }
  if (normalized.includes("cancel") || normalized.includes("refund")) {
    return "cancellation_policy";
  }
  return null;
}

function resolvePricingState(messages: SupportChatMessage[], query: string) {
  const currentPricingPreference = detectPricingPreference(query);
  const previousUserMessages = [...messages]
    .slice(0, -1)
    .filter((message) => message.role === "user")
    .map((message) => message.content);
  const previousPricingPreference =
    [...previousUserMessages]
      .reverse()
      .map((content) => detectPricingPreference(content))
      .find(Boolean) ?? null;
  const frustrationFollowup = isFrustrationFollowup(query);
  const activePricingPreference =
    currentPricingPreference || (frustrationFollowup ? previousPricingPreference : null);

  return {
    currentPricingPreference,
    previousPricingPreference,
    activePricingPreference,
    frustrationFollowup,
  };
}

function buildResortFallback(preference: RecommendationPreference) {
  const byPreference: Record<Exclude<RecommendationPreference, null>, string> = {
    magic_kingdom:
      "For Magic Kingdom convenience, start with Bay Lake Tower, Polynesian Villas, Grand Floridian Villas, and Copper Creek Villas. Bay Lake Tower is usually the most direct, Polynesian and Grand Floridian are strong for monorail-area access, and Copper Creek is a quieter lodge-style option nearby.",
    epcot:
      "For EPCOT access, top options are Beach Club, BoardWalk, and Riviera. Beach Club and BoardWalk are often preferred for walking convenience, while Riviera is strong for Skyliner connectivity.",
    hollywood_studios:
      "For easier Hollywood Studios access, Riviera and BoardWalk are common favorites. Riviera offers strong Skyliner convenience, while BoardWalk gives a lively EPCOT-area base with good access to both parks.",
    animal_kingdom:
      "For Animal Kingdom focus, Animal Kingdom Villas at Kidani and Jambo are usually the best fits. Kidani often feels calmer and villa-focused, while Jambo is preferred for main-lodge energy and dining access.",
    ocean:
      "For ocean-style stays, shortlist Aulani, Hilton Head, and Vero Beach. Aulani is destination-style Hawaii, Hilton Head is calmer and low-key, and Vero Beach is a simple beach-focused escape.",
    quiet_relaxing:
      "For a quieter pace, consider Old Key West, Saratoga Springs, and Copper Creek Villas. Old Key West and Saratoga feel more spread out and relaxed, while Copper Creek offers a calm lodge atmosphere with strong amenities.",
    couples_romantic:
      "For couples, strong picks are Riviera, Grand Floridian Villas, and Polynesian Villas. Riviera feels refined and modern, Grand Floridian is classic and elegant, and Polynesian offers tropical atmosphere and signature views.",
    family_friendly:
      "For family-friendly stays, start with Beach Club Villas, Polynesian Villas, and Animal Kingdom Villas at Kidani Village. Beach Club is popular for pools and EPCOT-area access, Polynesian has broad family appeal, and Kidani is great for villa space and savanna views.",
    luxury_upscale:
      "For a more upscale feel, Riviera and Grand Floridian Villas are top choices, with Polynesian as a premium atmosphere option. Riviera is polished and boutique-style, while Grand Floridian leans classic luxury.",
    transportation:
      "For transportation convenience, Bay Lake Tower and Polynesian are strong for Magic Kingdom access, while Riviera is excellent for Skyliner access to EPCOT and Hollywood Studios. If transfer convenience matters most, Caribbean Beach is the nearby Skyliner hub.",
  };
  return (
    byPreference[preference] ||
    "A useful shortlist: Aulani, Hilton Head, and Vero Beach for ocean-focused relaxation; Beach Club and BoardWalk for stronger EPCOT access; and Bay Lake Tower or Polynesian for easier Magic Kingdom access. If you share your priority, I can narrow to your best 2 options."
  );
}

function buildPricingFallback(preference: PricingPreference) {
  const byPreference: Record<Exclude<PricingPreference, null>, string> = {
    payment_timing:
      "Payment timing depends on how far out the trip is. If booking is more than 90 days before check-in, payment is typically split: 70% at booking and 30% due no later than 90 days before check-in. If booking is within 90 days of check-in, full payment is typically required at booking.",
    deposit_meaning:
      "PixieDVC uses a $99 availability deposit to begin owner matching for a stay request. The deposit is fully refundable until a matching owner is secured. Once a match is secured and the reservation opportunity is confirmed, the deposit becomes non-refundable. This deposit is separate from the reservation payment schedule.",
    cost_factors:
      "Total cost depends on resort, dates, room type, trip length, and required points. The calculator is the best place to get a trip-specific estimate using your stay details.",
    value_compare:
      "In many cases, DVC point-rental stays can offer strong value compared with Disney standard cash pricing for similar villa accommodations. The best comparison depends on your specific resort, room type, and dates.",
    cancellation_policy:
      "Cancellation policies are structured because DVC reservations are tied to member points. Outcomes depend on timing relative to check-in and reservation policy terms. Depending on timing, a booking may qualify for a refund or for Deferred Cancellation Credit toward future travel, so specific outcomes should be confirmed against the reservation agreement.",
  };
  return (
    byPreference[preference] ||
    "Pricing depends on resort, dates, room type, trip length, and required points. Payment is handled as part of the agreement stage, and the calculator is the best way to estimate a specific trip cost."
  );
}

function fallbackResponse(
  query = "",
  recommendationPreference: RecommendationPreference = null,
  pricingPreference: PricingPreference = null,
  frustrationFollowup = false,
) {
  const intent = detectSupportIntent(query);
  const answerByIntent: Record<string, string> = {
    dvc_basics:
      "Disney Vacation Club point rental allows guests to stay at DVC resorts using a member’s points instead of booking Disney’s standard cash rate directly. On PixieDVC, you can estimate trip options and then submit a stay request.",
    booking_flow:
      "Booking usually starts with the calculator or a resort page, then moves to request details, agreement, and payment/confirmation milestones. If you want, I can walk you through each step in order.",
    dining_plan:
      "For DVC reservations, Disney Dining Plans are not typically added directly by the guest in My Disney Experience. The DVC owner can usually request/add the plan on the guest’s behalf through Disney Vacation Club Member Services. PixieDVC can coordinate that request, it may require valid payment information for the purchase, and PixieDVC does not charge a service fee for coordinating it.",
    trip_planning:
      "For lighter crowds, many guests prefer periods like mid-January to early February, late April to early May, and early September. Peak periods such as Christmas/New Year, Spring Break, summer, and major holiday weekends are usually busiest. If you share your park priorities, I can suggest 2-4 resort options that fit your trip style and transportation needs.",
    disney_perks:
      "Once a reservation is confirmed and linked in My Disney Experience, guests can typically use Disney planning features like trip management, dining reservations, transportation access, and Early Theme Park Entry where available. Specific features depend on Disney policies and resort location.",
    availability_matching:
      "PixieDVC reservations use DVC member points, so availability must be checked before a stay is confirmed. After you submit a request, PixieDVC starts owner matching to find a member who can create that reservation for your dates, resort, and room type. If matched, the booking moves forward to agreement and payment; if not, alternatives can be suggested.",
    ready_stays:
      "Ready Stays are pre-assembled reservation opportunities with defined resort, room type, dates, and stay length, so they can often move faster than a custom request. They are not guaranteed until booking is completed, and they may disappear if another guest secures the stay first.",
    pricing_payments: buildPricingFallback(pricingPreference),
    owner_onboarding:
      "Owner onboarding covers profile details, required verification, and membership setup so owners can participate in listing or matching flows. I can break down each step if you want.",
    resort_guidance: buildResortFallback(recommendationPreference),
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
    "payment failed",
    "payment error",
    "payment issue",
    "billing error",
    "billing dispute",
    "deposit stuck",
    "stuck deposit",
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
    "refund for my reservation",
    "contract issue",
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

function extractCompoundQuestions(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [] as string[];

  const normalized = trimmed.replace(/\s+/g, " ");
  const byQuestionMark = normalized
    .split("?")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `${part}?`);
  if (byQuestionMark.length > 1) {
    return byQuestionMark;
  }

  const lowered = normalized.toLowerCase();
  const hasQuestionCue =
    lowered.includes(" how ") ||
    lowered.includes(" what ") ||
    lowered.includes(" when ") ||
    lowered.includes(" do i ") ||
    lowered.includes(" is ") ||
    lowered.includes(" can ");
  if (!hasQuestionCue || !lowered.includes(" and ")) {
    return [];
  }

  const chunks = normalized
    .split(/\band\b/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 4);
  if (chunks.length <= 1) {
    return [];
  }

  return chunks.map((chunk) =>
    /[?!.]$/.test(chunk) ? chunk : `${chunk}?`,
  );
}

function classifyCompoundQuestionTopic(question: string) {
  const pricingPreference = detectPricingPreference(question);
  if (pricingPreference === "payment_timing") return "payment_timing_upfront";
  if (pricingPreference) return `pricing_${pricingPreference}`;

  const recommendationPreference = detectRecommendationPreference(question);
  if (recommendationPreference) return `recommendation_${recommendationPreference}`;

  return `intent_${detectSupportIntent(question)}`;
}

function mergeDuplicateCompoundQuestions(questions: string[]) {
  if (questions.length <= 1) return questions;

  const mergedByTopic = new Map<
    string,
    { firstIndex: number; questions: string[] }
  >();

  questions.forEach((question, index) => {
    const topic = classifyCompoundQuestionTopic(question);
    const existing = mergedByTopic.get(topic);
    if (existing) {
      existing.questions.push(question);
      return;
    }
    mergedByTopic.set(topic, { firstIndex: index, questions: [question] });
  });

  return [...mergedByTopic.values()]
    .sort((a, b) => a.firstIndex - b.firstIndex)
    .map((entry) => {
      if (entry.questions.length === 1) return entry.questions[0];
      const normalized = entry.questions.map((question) =>
        question.trim().replace(/[?!.]+$/, ""),
      );
      return `${normalized.join(" / ")}?`;
    });
}

function buildCompoundQuestionPromptBlock(questions: string[]) {
  if (questions.length <= 1) return "";
  return [
    "User asked multiple questions in one message. Answer each question in order and do not skip any:",
    ...questions.map((question, index) => `${index + 1}. ${question}`),
  ].join("\n");
}

function buildCompoundFallbackResponse(
  questions: string[],
  recommendationPreference: RecommendationPreference,
  pricingPreference: PricingPreference,
  frustrationFollowup: boolean,
) {
  if (questions.length <= 1) {
    return fallbackResponse(
      questions[0] ?? "",
      recommendationPreference,
      pricingPreference,
      frustrationFollowup,
    ).answer;
  }

  return questions
    .map((question, index) => {
      const questionRecommendationPreference =
        detectRecommendationPreference(question) ?? recommendationPreference;
      const questionPricingPreference = detectPricingPreference(question) ?? pricingPreference;
      const shortAnswer = fallbackResponse(
        question,
        questionRecommendationPreference,
        questionPricingPreference,
        frustrationFollowup,
      ).answer;
      return `${index + 1}. ${shortAnswer}`;
    })
    .join("\n");
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
    const guestIdentity = await resolveGuestIdentity();

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
    const rawCompoundQuestions = extractCompoundQuestions(intentQuery);
    const compoundQuestions = mergeDuplicateCompoundQuestions(rawCompoundQuestions);
    const context = derivePageContext(pageUrl);
    const detectedIntent = detectSupportIntent(intentQuery);
    const recommendationState = resolveRecommendationState(messages, query);
    const pricingState = resolvePricingState(messages, query);
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
    console.log("[support/chat/pricing-refinement]", {
      detectedRefinement: Boolean(pricingState.currentPricingPreference),
      currentPricingPreference: pricingState.activePricingPreference,
      frustrationFollowup: pricingState.frustrationFollowup,
    });
    console.log("[support/chat/compound-questions]", {
      detected: rawCompoundQuestions.length > 1,
      rawCount: rawCompoundQuestions.length,
      dedupedCount: compoundQuestions.length,
      questions: compoundQuestions,
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
        {
          ...fallbackResponse(
            intentQuery,
            recommendationState.activePreference,
            pricingState.activePricingPreference,
            recommendationState.frustrationFollowup,
          ),
          answer: buildCompoundFallbackResponse(
            compoundQuestions.length > 1 ? compoundQuestions : [intentQuery],
            recommendationState.activePreference,
            pricingState.activePricingPreference,
            recommendationState.frustrationFollowup,
          ),
        },
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
              status: "open",
              page_url: context.pageUrl,
              source_page: context.pageUrl,
              context,
              guest_user_id: guestIdentity.guestUserId,
              guest_type: guestIdentity.guestType,
              guest_name: guestIdentity.guestName,
              guest_email: guestIdentity.guestEmail,
              updated_at: new Date().toISOString(),
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
            .update({
              page_url: context.pageUrl,
              source_page: context.pageUrl,
              context,
              status: "open",
              guest_user_id: guestIdentity.guestUserId,
              guest_type: guestIdentity.guestType,
              guest_name: guestIdentity.guestName,
              guest_email: guestIdentity.guestEmail,
              updated_at: new Date().toISOString(),
            })
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
              sender_type: "guest",
              sender_user_id: guestIdentity.guestUserId,
              sender_display_name:
                guestIdentity.guestName ??
                guestIdentity.guestEmail ??
                "Anonymous Visitor",
              message: query,
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
      buildCompoundQuestionPromptBlock(compoundQuestions),
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
              answer = buildCompoundFallbackResponse(
                compoundQuestions.length > 1 ? compoundQuestions : [intentQuery],
                recommendationState.activePreference,
                pricingState.activePricingPreference,
                recommendationState.frustrationFollowup,
              );
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
                  sender_type: "ai",
                  sender_display_name: "Pixie Concierge",
                  message: answer,
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
