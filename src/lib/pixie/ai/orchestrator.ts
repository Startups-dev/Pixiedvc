import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { applyPixieTripPatch, calculateDateOnlyNights, normalizePixieTripState, normalizeStringArray } from "@/lib/pixie/planner-state";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";
import type { PixieTripPatch, PixieTripState } from "@/lib/pixie/schema";
import type { PixieCompletenessResult, PixieQuestionKey } from "@/lib/pixie/types";
import { createHannaKnowledgeService, type HannaKnowledgeContext } from "@/lib/pixie/knowledge";
import { buildDvcContext, type DvcContext } from "@/lib/pixie/dvc";
import { createLiveDisneyService, type LiveDisneyContext, type LiveDisneyService } from "@/lib/pixie/live";
import type { PixieAiError } from "@/lib/pixie/ai/errors";
import { PixieAiException, pixieAiError } from "@/lib/pixie/ai/errors";
import type { PixieCurrentPlanSummary, PixieModelProvider, PixieModelProviderResult } from "@/lib/pixie/ai/provider";
import { createOpenAiPixieProvider } from "@/lib/pixie/ai/openai-provider";
import { buildPixiePlannerResponse } from "@/lib/pixie/ai/response-builder";
import {
  PIXIE_AI_PROMPT_VERSION,
  pixieModelTurnResultSchema,
  pixiePlannerTurnRequestSchema,
  type PixieAiToolRequest,
  type PixieModelTurnResult,
  type PixieRecentMessage,
} from "@/lib/pixie/ai/schemas";
import {
  PIXIE_AI_LIMITS,
  detectPromptInjectionAttempt,
  getPixieAiConfig,
  limitRecentMessages,
  normalizeUserMessage,
  validatePlannerStateSize,
} from "@/lib/pixie/ai/safety";
import { dedupePixieToolRequests, executePixieTool } from "@/lib/pixie/ai/tool-executor";
import type { PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import { getPixieModelToolDefinitions } from "@/lib/pixie/ai/tool-registry";
import { emptyPixieUsage, mergePixieUsage, type PixieTurnUsage } from "@/lib/pixie/ai/usage";

export type PixiePlannerTurnResult = {
  assistantResponse: string;
  updatedState: PixieTripState;
  completeness: PixieCompletenessResult;
  planningStage: PixieTripState["planningStage"];
  toolResults: PixieToolResult[];
  recommendations?: PixieRecommendationResult;
  readyStayMatches?: PixieReadyStayMatchResult;
  planOutline?: unknown;
  nextQuestionKey?: PixieQuestionKey;
  warnings: string[];
  providerMetadata?: PixieModelProviderResult["metadata"];
  usage: PixieTurnUsage;
  turnId: string;
  generatedAt: string;
};

export type PixiePlannerStreamEvent =
  | { type: "turn_started"; turnId: string }
  | { type: "assistant_text_delta"; turnId: string; text: string }
  | { type: "trip_patch_proposed"; turnId: string; patch: unknown }
  | { type: "trip_patch_applied"; turnId: string; updatedState: PixieTripState }
  | { type: "tool_started"; turnId: string; toolName: string }
  | { type: "tool_completed"; turnId: string; toolResult: PixieToolResult }
  | { type: "recommendations_ready"; turnId: string; recommendations: PixieRecommendationResult }
  | { type: "ready_stays_ready"; turnId: string; readyStayMatches: PixieReadyStayMatchResult }
  | { type: "plan_outline_ready"; turnId: string; planOutline: unknown }
  | { type: "warning"; turnId: string; warning: string }
  | { type: "usage"; turnId: string; usage: PixieTurnUsage }
  | { type: "turn_completed"; turnId: string; result: PixiePlannerTurnResult }
  | { type: "turn_failed"; turnId: string; error: PixieAiError };

type RunPixiePlannerTurnInput = {
  state: unknown;
  message: string;
  recentMessages?: PixieRecentMessage[];
  provider?: PixieModelProvider;
  liveDisneyService?: LiveDisneyService;
  context?: {
    requestId?: string;
    sessionId?: string;
    userId?: string;
  };
  now?: string;
  turnId?: string;
};

type PreparedPixiePlannerTurn = {
  id: string;
  generatedAt: string;
  config: ReturnType<typeof getPixieAiConfig>;
  warnings: string[];
  state: PixieTripState;
  message: string;
  recentMessages: PixieRecentMessage[];
  completeness: PixieCompletenessResult;
  usage: PixieTurnUsage;
  provider: PixieModelProvider;
  providerTimeoutMs: number;
  knowledgeContext: HannaKnowledgeContext;
  dvcContext: DvcContext;
  liveContext?: LiveDisneyContext;
  currentPlanSummary: PixieCurrentPlanSummary;
  extractedState?: PixieTripState;
};

function turnId(now: string) {
  return `pixie_turn_${now.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
}

const MONTHS: Record<string, number> = {
  janeiro: 1,
  january: 1,
  jan: 1,
  fevereiro: 2,
  february: 2,
  feb: 2,
  marco: 3,
  março: 3,
  march: 3,
  mar: 3,
  abril: 4,
  april: 4,
  apr: 4,
  maio: 5,
  may: 5,
  junho: 6,
  june: 6,
  jun: 6,
  julho: 7,
  july: 7,
  jul: 7,
  agosto: 8,
  august: 8,
  aug: 8,
  setembro: 9,
  september: 9,
  sept: 9,
  sep: 9,
  outubro: 10,
  october: 10,
  oct: 10,
  novembro: 11,
  november: 11,
  nov: 11,
  dezembro: 12,
  december: 12,
  dec: 12,
};

const RESORT_MENTIONS = [
  { pattern: /\banimal kingdom villas\b|\bakv\b/i, label: "Animal Kingdom Villas" },
  { pattern: /\b(?:bay lake(?: tower)?|blt)\b/i, label: "Bay Lake Tower" },
  { pattern: /\bpolynesian\b/i, label: "Polynesian Villas" },
  { pattern: /\bcopper creek\b/i, label: "Copper Creek Villas" },
  { pattern: /\bboulder ridge\b/i, label: "Boulder Ridge Villas" },
  { pattern: /\bgrand floridian\b/i, label: "Grand Floridian Villas" },
  { pattern: /\bboardwalk\b/i, label: "BoardWalk Villas" },
  { pattern: /\briviera\b/i, label: "Riviera Resort" },
  { pattern: /\bsaratoga(?: springs)?\b/i, label: "Saratoga Springs" },
] as const;

const PARK_MENTIONS = [
  { pattern: /\bmagic kingdom\b|\bmk\b/i, label: "Magic Kingdom" },
  { pattern: /\bepcot\b/i, label: "EPCOT" },
  { pattern: /\bhollywood studios\b|\bdhs\b/i, label: "Hollywood Studios" },
  { pattern: /\banimal kingdom\b|\bdak\b/i, label: "Animal Kingdom" },
] as const;

const DINING_MENTIONS = [
  { pattern: /\bvia napoli\b/i, label: "Via Napoli", estimate: "$60-$112 before tax/tip" },
  { pattern: /\bbiergarten\b/i, label: "Biergarten", estimate: "$98-$98 before tax/tip" },
  { pattern: /\bgarden grill\b/i, label: "Garden Grill", estimate: "$132-$132 before tax/tip" },
  { pattern: /\bchef mickey'?s\b|\bchef mickeys\b/i, label: "Chef Mickey's", estimate: "$132-$132 before tax/tip" },
  { pattern: /\bbe our guest\b|\bbog\b/i, label: "Be Our Guest", estimate: "$144-$144 before tax/tip" },
  { pattern: /\bakershus\b|\bprincess(?:es)?\b|\bprincesas?\b/i, label: "Akershus Royal Banquet Hall", estimate: "$126-$189 before tax/tip" },
] as const;

function resortLabelFromText(value: string) {
  return RESORT_MENTIONS.find((resort) => resort.pattern.test(value))?.label;
}

function parkLabelFromText(value: string) {
  return PARK_MENTIONS.find((park) => park.pattern.test(value))?.label;
}

function diningFromText(value: string) {
  return DINING_MENTIONS.find((dining) => dining.pattern.test(value));
}

function activeWorkspaceStatus(status: string) {
  return status === "confirmed" || status === "selected" || status === "planned" || status === "considering" || status === "recommended";
}

function compactList(values: Array<string | undefined>, maxItems: number) {
  return normalizeStringArray(values.filter((value): value is string => Boolean(value?.trim())), maxItems);
}

function buildCurrentPlanSummary(state: PixieTripState): PixieCurrentPlanSummary {
  const travelers = compactList([
    state.party.adults !== undefined ? `${state.party.adults} adult${state.party.adults === 1 ? "" : "s"}` : undefined,
    ...(state.party.travellers.filter((traveller) => traveller.ageGroup !== "adult").map((traveller) => {
      const age = traveller.age !== undefined ? ` age ${traveller.age}` : "";
      return `${traveller.displayName ?? traveller.label ?? traveller.ageGroup ?? "child"}${age}`;
    })),
  ], 8);
  const tripDates = state.dates.arrivalDate || state.dates.departureDate ? `${state.dates.arrivalDate ?? "unknown arrival"} to ${state.dates.departureDate ?? "unknown departure"}` : undefined;
  const lodging = state.planningWorkspace.lodgingPlans
    .filter((plan) => activeWorkspaceStatus(plan.status))
    .slice(-6)
    .map((plan) => `${plan.resort} - ${plan.status}${plan.checkIn || plan.checkOut || plan.startDate || plan.endDate ? ` (${plan.checkIn ?? plan.startDate ?? "?"} to ${plan.checkOut ?? plan.endDate ?? "?"})` : ""}${plan.roomType ? ` - ${plan.roomType}` : ""}${plan.numberOfNights ? ` - ${plan.numberOfNights} night${plan.numberOfNights === 1 ? "" : "s"}` : ""}${plan.estimatedPoints ? ` - ${plan.estimatedPoints} points estimate` : ""}${plan.estimatedRentalCostCents ? ` - estimated $${Math.round(plan.estimatedRentalCostCents / 100).toLocaleString("en-US")}` : ""}${plan.note ? `: ${plan.note}` : ""}`);
  const parks = state.planningWorkspace.parkPlans
    .filter((plan) => activeWorkspaceStatus(plan.status))
    .slice(-10)
    .map((plan) => `${plan.date ?? "date unknown"} - ${plan.park} - ${plan.status}${plan.note ? `: ${plan.note}` : ""}`);
  const dining = state.planningWorkspace.diningPlans
    .filter((plan) => activeWorkspaceStatus(plan.status))
    .slice(-10)
    .map((plan) => `${plan.date ?? "date unknown"} - ${plan.mealPeriod ?? "meal"} - ${plan.restaurant} - ${plan.status}${plan.targetTime ? ` at ${plan.targetTime}` : ""}${plan.planningPriceEstimate ? ` (${plan.planningPriceEstimate})` : ""}`);
  const activities = state.planningWorkspace.activityPlans
    .filter((plan) => activeWorkspaceStatus(plan.status))
    .slice(-8)
    .map((plan) => `${plan.date ?? "date unknown"} - ${plan.label} - ${plan.status}${plan.note ? `: ${plan.note}` : ""}`);
  const importantPreferences = compactList([
    ...state.preferences.resortPriorities,
    ...state.preferences.parkPriorities.map((value) => `park: ${value}`),
    ...state.preferences.transportationPreferences.map((value) => `transportation: ${value}`),
    ...state.preferences.diningPreferences.map((value) => `dining: ${value}`),
    state.budget.budgetType !== "unknown" ? `budget: ${state.budget.budgetType}` : undefined,
  ], 16);
  const dvcFacts = compactList([
    state.dvcContext.homeResort ? `Home Resort: ${state.dvcContext.homeResort}` : undefined,
    state.dvcContext.useYear ? `Use Year: ${state.dvcContext.useYear}` : undefined,
    state.dvcContext.holdingExposure?.isExposed ? `Holding exposure: ${state.dvcContext.holdingExposure.notes ?? "raised"}` : undefined,
    ...state.dvcContext.planningRisks,
    ...state.dvcContext.unresolvedDecisions,
  ], 8);
  const openDecisions = compactList([
    ...state.planningWorkspace.activeDecisions.filter((decision) => decision.status !== "resolved").map((decision) => decision.label),
    ...state.planningWorkspace.attentionItems.filter((item) => item.status !== "resolved" && item.category === "open_decision").map((item) => `${item.label}${item.note ? `: ${item.note}` : ""}`),
  ], 8);
  const attention = compactList(state.planningWorkspace.attentionItems.filter((item) => item.status !== "resolved" && item.category !== "open_decision").map((item) => `${item.label}${item.note ? `: ${item.note}` : ""}`), 8);
  return {
    travelers,
    tripDates,
    lodging,
    parks,
    dining,
    activities,
    importantPreferences,
    dvcFacts,
    openDecisions,
    rejectedOptions: compactList(state.preferences.excludedResorts.map((value) => `resort: ${value}`), 8),
    attention,
  };
}

const COMPLEX_PLANNING_TIMEOUT_MS = 45_000;

function dateOnly(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const value = date.toISOString().slice(0, 10);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : undefined;
}

function addDateOnlyDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function yearForPlanningWorkspace(state: PixieTripState, generatedAt: string) {
  return Number(state.dates.arrivalDate?.slice(0, 4) ?? generatedAt.slice(0, 4));
}

function firstDateRange(message: string) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const compactPortuguesePattern = new RegExp(
    `\\b(?:de\\s+)?(\\d{1,2})\\s+(?:a|até|ate)\\s+(\\d{1,2})\\s+de\\s+(${monthPattern})(?:\\s+de\\s+(\\d{4}))?\\b`,
    "i",
  );
  const compactPortugueseMatch = compactPortuguesePattern.exec(message);
  if (compactPortugueseMatch) {
    const year = Number(compactPortugueseMatch[4] ?? new Date().getFullYear());
    const month = MONTHS[compactPortugueseMatch[3].toLowerCase()];
    const arrivalDate = dateOnly(year, month, Number(compactPortugueseMatch[1]));
    const departureDate = dateOnly(year, month, Number(compactPortugueseMatch[2]));
    if (arrivalDate && departureDate && calculateDateOnlyNights(arrivalDate, departureDate)) return { arrivalDate, departureDate };
  }

  const portuguesePattern = new RegExp(
    `\\b(?:de\\s+)?(\\d{1,2})\\s+de\\s+(${monthPattern})\\s+(?:a|até|ate)\\s+(\\d{1,2})\\s+de\\s+(${monthPattern})(?:\\s+de\\s+(\\d{4}))?\\b`,
    "i",
  );
  const portugueseMatch = portuguesePattern.exec(message);
  if (portugueseMatch) {
    const year = Number(portugueseMatch[5] ?? new Date().getFullYear());
    const arrivalDate = dateOnly(year, MONTHS[portugueseMatch[2].toLowerCase()], Number(portugueseMatch[1]));
    const departureDate = dateOnly(year, MONTHS[portugueseMatch[4].toLowerCase()], Number(portugueseMatch[3]));
    if (arrivalDate && departureDate && calculateDateOnlyNights(arrivalDate, departureDate)) return { arrivalDate, departureDate };
  }

  const pattern = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\s+(?:to|through|thru|-)\\s+(?:(${monthPattern})\\s+)?(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`,
    "i",
  );
  const match = pattern.exec(message);
  if (!match) return undefined;

  const arrivalMonth = MONTHS[match[1].toLowerCase()];
  const departureMonth = match[4] ? MONTHS[match[4].toLowerCase()] : arrivalMonth;
  const year = Number(match[6] ?? match[3] ?? new Date().getFullYear());
  const arrivalDay = Number(match[2]);
  const departureDay = Number(match[5]);
  if (!arrivalMonth || !departureMonth || !year) return undefined;

  const arrivalDate = dateOnly(year, arrivalMonth, arrivalDay);
  const departureDate = dateOnly(year, departureMonth, departureDay);
  if (!arrivalDate || !departureDate || !calculateDateOnlyNights(arrivalDate, departureDate)) return undefined;
  return { arrivalDate, departureDate };
}

type DateExtractionResult = {
  dates?: NonNullable<PixieTripPatch["dates"]>;
  hasDateInformation: boolean;
  hasPartialTripDates: boolean;
  dateNotes: string[];
};

function parseMonthDay(match: RegExpExecArray, monthIndex: number, dayIndex: number, yearIndex: number, fallbackYear?: number) {
  const monthText = match[monthIndex];
  const dayText = match[dayIndex];
  if (!monthText || !dayText) return undefined;
  const month = MONTHS[monthText.toLowerCase()];
  const day = Number(dayText);
  const year = Number(match[yearIndex] ?? fallbackYear);
  if (!month || !day || !year) return undefined;
  return dateOnly(year, month, day);
}

function extractDateMentions(message: string) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const pattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`, "gi");
  const mentions: string[] = [];
  const years: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(message))) {
    mentions.push(match[0]);
    if (match[3]) years.push(Number(match[3]));
  }
  return { mentions: normalizeStringArray(mentions, 20), years };
}

function extractExplicitDate(pattern: RegExp, message: string, fallbackYear?: number) {
  const match = pattern.exec(message);
  if (!match) return undefined;
  return parseMonthDay(match, 1, 2, 3, fallbackYear);
}

function extractLightweightDates(message: string): DateExtractionResult {
  const explicitRange = firstDateRange(message);
  const dateMentions = extractDateMentions(message);
  const fallbackYear = dateMentions.years.length === 1 ? dateMentions.years[0] : undefined;
  const monthPattern = Object.keys(MONTHS).join("|");
  const arrivalPattern = new RegExp(`\\b(?:arriving|arrive|check(?:ing)?\\s*in)\\s+(?:on\\s+)?(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`, "i");
  const portugueseArrivalPattern = new RegExp(`\\b(?:cheg(?:o|amos|ar)|entrada|check-?in)\\s+(?:no\\s+)?(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${monthPattern})(?:\\s+de\\s+(\\d{4}))?\\b`, "i");
  const checkoutPattern = new RegExp(`\\b(?:check(?:ing)?\\s*out|checkout)\\s+(?:on\\s+)?(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`, "i");
  const portugueseArrivalMatch = portugueseArrivalPattern.exec(message);
  const portugueseArrivalDate = portugueseArrivalMatch
    ? dateOnly(Number(portugueseArrivalMatch[3] ?? fallbackYear ?? new Date().getFullYear()), MONTHS[portugueseArrivalMatch[2].toLowerCase()], Number(portugueseArrivalMatch[1]))
    : undefined;
  const arrivalDate = extractExplicitDate(arrivalPattern, message, fallbackYear) ?? portugueseArrivalDate;
  const departureDate = extractExplicitDate(checkoutPattern, message, fallbackYear);
  const dateNotes = dateMentions.mentions.length ? [`Availability or planning dates mentioned: ${dateMentions.mentions.join(", ")}.`] : [];

  if (explicitRange) return { dates: explicitRange, hasDateInformation: true, hasPartialTripDates: false, dateNotes };
  if (arrivalDate || departureDate) {
    return {
      dates: {
        ...(arrivalDate ? { arrivalDate } : {}),
        ...(departureDate ? { departureDate } : {}),
      },
      hasDateInformation: true,
      hasPartialTripDates: !(arrivalDate && departureDate),
      dateNotes,
    };
  }

  return {
    hasDateInformation: dateMentions.mentions.length > 0,
    hasPartialTripDates: dateMentions.mentions.length > 0,
    dateNotes,
  };
}

function extractPreferenceFacts(message: string) {
  const preferredResorts = RESORT_MENTIONS.filter((resort) => resort.pattern.test(message)).map((resort) => resort.label);
  const resortPriorities: string[] = [];
  const parkPriorities: string[] = [];
  const noteFacts: string[] = [];
  const normalized = message.toLowerCase();

  if (/\bpay more\b|\bwilling to pay more\b|\bprice does(?:n't| not) matter\b|\bpagar(?:emos)?\s+mais\b|\bpagaremos mais\b|\bpre[cç]o n[aã]o importa\b|\bpodemos pagar mais\b/.test(normalized)) {
    resortPriorities.push("price sensitivity low");
  }
  if (/\bminimi[sz]e resort changes\b|\bfew(?:er)? resort changes\b|\bavoid (?:a )?(?:resort )?transfer\b|\bleast annoying (?:split stay|version)\b/.test(normalized)) {
    resortPriorities.push("minimize resort changes");
  }
  if (/\bsave points\b|\blower points\b|\bfew(?:er)? points\b|\bpoint saving\b/.test(normalized)) {
    resortPriorities.push("save points where reasonable");
  }
  if (/\bnear magic kingdom\b|\bclose to magic kingdom\b|\bmagic kingdom.*first night\b|\bfirst night.*magic kingdom\b|\bperto do magic kingdom\b|\bvoltar depois da festa\b|\bmais f[aá]cil para voltar\b/.test(normalized)) {
    resortPriorities.push("stay near Magic Kingdom");
    parkPriorities.push("Magic Kingdom");
  }
  if (/\bvoltar depois da festa\b|\bmais f[aá]cil para voltar\b|\bvolta depois da festa\b/.test(normalized)) {
    resortPriorities.push("dominant Magic Kingdom return convenience");
    resortPriorities.push("walking access after Magic Kingdom party");
    parkPriorities.push("Magic Kingdom");
  }
  if (/\bmagic kingdom\b/.test(normalized)) parkPriorities.push("Magic Kingdom");
  if (/\bhalloween party\b|\bfesta de halloween\b|\bmickey'?s not so scary halloween party\b/.test(normalized)) {
    parkPriorities.push("Magic Kingdom");
    noteFacts.push("Magic Kingdom Halloween party constraint mentioned.");
  }
  if (/\bwaitlist\b/.test(normalized)) noteFacts.push("Waitlist alternatives mentioned.");

  const pointMatches = message.match(/\b\d{1,3}\s+points?\b/gi) ?? [];
  if (pointMatches.length) {
    noteFacts.push(`Point values mentioned: ${normalizeStringArray(pointMatches, 20).slice(0, 12).join(", ")}.`);
  }
  if (preferredResorts.length) {
    noteFacts.push(`Resorts mentioned: ${normalizeStringArray(preferredResorts).join(", ")}.`);
  }

  return {
    preferredResorts: normalizeStringArray(preferredResorts),
    resortPriorities: normalizeStringArray(resortPriorities),
    parkPriorities: normalizeStringArray(parkPriorities),
    generalNotes: noteFacts.join(" ").slice(0, 1000),
  };
}

function parseWorkspaceDate(monthText: string, dayText: string, fallbackYear: number) {
  const month = MONTHS[monthText.toLowerCase()];
  const day = Number(dayText);
  return month && day ? dateOnly(fallbackYear, month, day) : undefined;
}

function workspaceDatesFromRange(monthText: string, startDayText: string, endDayText: string | undefined, fallbackYear: number) {
  const startDate = parseWorkspaceDate(monthText, startDayText, fallbackYear);
  if (!startDate) return [];
  const endDay = endDayText ? Number(endDayText) : Number(startDayText);
  const startDay = Number(startDayText);
  const dates: string[] = [];
  for (let offset = 0; offset <= Math.max(0, endDay - startDay); offset += 1) {
    const next = addDateOnlyDays(startDate, offset);
    if (next) dates.push(next);
  }
  return dates;
}

function statusFromPlanningText(text: string) {
  const normalized = text.toLowerCase();
  if (/\bunresolved\b|\bnot resolved\b|\bopen night\b|\bneed(?:s)? to resolve\b/.test(normalized)) return "unresolved" as const;
  if (/\bwaitlist\b|\bwait-list\b/.test(normalized)) return "waitlist_candidate" as const;
  if (/\bavailable\b|\bavailability\b/.test(normalized)) return "traveler_reported_available" as const;
  if (/\bconfirmed\b|\bbooked\b|\breserved\b/.test(normalized)) return "confirmed" as const;
  return "planned" as const;
}

function availabilityStatusFromText(text: string) {
  const normalized = text.toLowerCase();
  if (/\bunavailable\b|\bnot available\b|\bno availability\b/.test(normalized)) return "unavailable" as const;
  if (/\bwaitlist\b|\bwait-list\b/.test(normalized)) return "reported_waitlist" as const;
  if (/\bavailable\b|\bavailability\b/.test(normalized)) return "reported_available" as const;
  return undefined;
}

function workspaceDecisionStatus(text: string): "confirmed" | "selected" | "planned" | "considering" | "recommended" {
  const normalized = text.toLowerCase();
  if (/\b(booked|reserved|confirmed|i booked|we booked|reservation confirmed|already have|j[aá] reservei|est[aá] reservado|consegui reservar|reserva est[aá] confirmada)\b/.test(normalized)) return "confirmed";
  if (/\b(let'?s do|sounds perfect|i like that|go with|bay lake it is|decided on|vamos ficar|vamos fazer|vamos nessa|gostei dess[ae]s?|gostei das sugest[oõ]es|vamos de|vamos nele|parece perfeito|est[aá] perfeito|sounds much better)\b/.test(normalized)) return "selected";
  if (/\b(considering|thinking about|could stay|talvez|considerando)\b/.test(normalized)) return "considering";
  if (/\b(recommend|i'd choose|i would choose|hara recommends)\b/.test(normalized)) return "recommended";
  return "planned";
}

function stableId(prefix: string, value: string) {
  return `${prefix}_${value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "item"}`;
}

function extractWorkspaceTime(message: string) {
  const normalized = message.toLowerCase();
  const clock = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|h)?\b/.exec(normalized);
  if (!clock) return undefined;
  let hour = Number(clock[1]);
  const minute = Number(clock[2] ?? 0);
  const suffix = clock[3];
  if (suffix === "pm" && hour < 12) hour += 12;
  if (!suffix && hour > 0 && hour <= 7) hour += 12;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function extractWorkspaceDateFromMessage(message: string, fallbackYear: number) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const english = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})\\b`, "i").exec(message);
  if (english) return parseWorkspaceDate(english[1], english[2], fallbackYear);
  const portuguese = new RegExp(`\\b(\\d{1,2})\\s+de\\s+(${monthPattern})\\b`, "i").exec(message);
  if (portuguese) return parseWorkspaceDate(portuguese[2], portuguese[1], fallbackYear);
  return undefined;
}

function extractWorkspaceDateRangeFromMessage(message: string, fallbackYear: number) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const portuguese = new RegExp(`\\b(?:de\\s+|do\\s+dia\\s+|dia\\s+)?(\\d{1,2})\\s+(?:a|ao|até|ate)\\s+(?:o\\s+)?(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${monthPattern})\\b`, "i").exec(message);
  if (portuguese) {
    const startDate = parseWorkspaceDate(portuguese[3], portuguese[1], fallbackYear);
    const endDate = parseWorkspaceDate(portuguese[3], portuguese[2], fallbackYear);
    if (startDate && endDate && calculateDateOnlyNights(startDate, endDate)) return { startDate, endDate };
  }
  const english = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})\\s+(?:to|through|thru|-)\\s+(?:(${monthPattern})\\s+)?(\\d{1,2})\\b`, "i").exec(message);
  if (english) {
    const startDate = parseWorkspaceDate(english[1], english[2], fallbackYear);
    const endDate = parseWorkspaceDate(english[3] ?? english[1], english[4], fallbackYear);
    if (startDate && endDate && calculateDateOnlyNights(startDate, endDate)) return { startDate, endDate };
  }
  return undefined;
}

function extractSegmentEndDate(message: string, fallbackYear: number) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const untilDay = /\b(?:until|through|to|ate|até)\s+(?:the\s+)?(?:day\s+|dia\s+)?(\d{1,2})\b/i.exec(message);
  if (untilDay) {
    const baseMonth = /\b(?:de\s+)?(janeiro|february|feb|mar[çc]o|march|april|abril|may|maio|june|junho|july|julho|august|agosto|september|setembro|october|outubro|november|novembro|december|dezembro)\b/i.exec(message);
    return dateOnly(fallbackYear, baseMonth ? MONTHS[baseMonth[1].toLowerCase()] : 9, Number(untilDay[1]));
  }
  const untilDate = new RegExp(`\\b(?:until|through|to|ate|até)\\s+(${monthPattern})\\s+(\\d{1,2})\\b`, "i").exec(message);
  return untilDate ? parseWorkspaceDate(untilDate[1], untilDate[2], fallbackYear) : undefined;
}

function segmentBoundaryFromOrdinal(message: string, state: PixieTripState, ordinal: number) {
  if (!state.dates.arrivalDate || !state.dates.departureDate) return undefined;
  const date = addDateOnlyDays(state.dates.arrivalDate, ordinal - 1);
  return date && date <= state.dates.departureDate ? date : undefined;
}

function lodgingSegmentDatesFor(message: string, state: PixieTripState, fallbackYear: number, kind: "mk_first" | "disney_springs" | "epcot_final") {
  const explicitRange = extractWorkspaceDateRangeFromMessage(message, fallbackYear);
  if (explicitRange) return explicitRange;
  const explicitStart = extractWorkspaceDateFromMessage(message, fallbackYear);
  const explicitEnd = extractSegmentEndDate(message, fallbackYear);
  if (kind === "mk_first") {
    const start = explicitStart ?? state.dates.arrivalDate;
    return { startDate: start, endDate: start ? addDateOnlyDays(start, 1) : undefined };
  }
  if (kind === "disney_springs") {
    return {
      startDate: explicitStart ?? segmentBoundaryFromOrdinal(message, state, /\bsegundo|second\b/i.test(message) ? 2 : 2),
      endDate: explicitEnd ?? segmentBoundaryFromOrdinal(message, state, /\bquarto|fourth\b/i.test(message) ? 4 : 4),
    };
  }
  return {
    startDate: explicitEnd ?? explicitStart ?? segmentBoundaryFromOrdinal(message, state, /\bquarto|fourth\b/i.test(message) ? 4 : 4),
    endDate: state.dates.departureDate,
  };
}

function fallbackWorkspaceDate(state: PixieTripState, restaurant?: string) {
  const diningDate = restaurant ? state.planningWorkspace.diningPlans.find((plan) => plan.restaurant.toLowerCase() === restaurant.toLowerCase() && plan.date)?.date : undefined;
  return diningDate ?? state.planningWorkspace.parkPlans.filter((plan) => plan.date).at(-1)?.date;
}

function fallbackMealPeriod(state: PixieTripState, restaurant?: string) {
  const diningMeal = restaurant ? state.planningWorkspace.diningPlans.find((plan) => plan.restaurant.toLowerCase() === restaurant.toLowerCase() && plan.mealPeriod)?.mealPeriod : undefined;
  if (diningMeal) return diningMeal;
  if (state.planningWorkspace.attentionItems.some((item) => /lunch|almo[cç]o/i.test(item.label) || /lunch|almo[cç]o/i.test(item.note ?? ""))) return "lunch";
  return state.planningWorkspace.attentionItems.some((item) => /dinner/i.test(item.label) || /dinner/i.test(item.note ?? "")) ? "dinner" : undefined;
}

function fallbackOpenDiningPlan(state: PixieTripState) {
  return state.planningWorkspace.diningPlans
    .filter((plan) => plan.status === "recommended" || plan.status === "selected" || plan.status === "planned")
    .at(-1);
}

function isExplicitOverallTripDateIntent(message: string) {
  return /\b(trip|travel|traveling|travelling|vacation|arrival|arrive|arriving|check(?:ing)?\s*in|check(?:ing)?\s*out|checkout|cheg(?:o|amos|ar)|viagem|f[eé]rias|entrada|sa[ií]da)\b/i.test(message);
}

function expectedParkForDining(restaurant: string | undefined) {
  if (!restaurant) return undefined;
  if (/akershus|via napoli|biergarten|garden grill/i.test(restaurant)) return "EPCOT";
  if (/chef mickey|be our guest|crystal palace/i.test(restaurant)) return "Magic Kingdom";
  return undefined;
}

function extractRejectedResorts(message: string) {
  if (!/\b(no|not that|don't want|do not want|forget|take .* off|scratch that|n[aã]o quero|esquece|tira)\b/i.test(message)) return [];
  return normalizeStringArray(RESORT_MENTIONS.filter((resort) => resort.pattern.test(message)).map((resort) => resort.label));
}

function extractPlanningWorkspacePatch(message: string, state: PixieTripState, generatedAt: string): NonNullable<PixieTripPatch["planningWorkspace"]> | undefined {
  const fallbackYear = yearForPlanningWorkspace(state, generatedAt);
  const monthPattern = Object.keys(MONTHS).join("|");
  const resortPattern = "(bay lake tower|bay lake|blt|polynesian|copper creek|boulder ridge|grand floridian|boardwalk|riviera|saratoga(?: springs)?)";
  const workingItinerary: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["workingItinerary"]> = [];
  const availabilityObservations: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["availabilityObservations"]> = [];
  const lodgingPlans: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["lodgingPlans"]> = [];
  const parkPlans: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["parkPlans"]> = [];
  const diningPlans: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["diningPlans"]> = [];
  const activityPlans: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["activityPlans"]> = [];
  const attentionItems: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["attentionItems"]> = [];
  const normalized = message.toLowerCase();
  const explicitWorkspaceDate = extractWorkspaceDateFromMessage(message, fallbackYear);
  let workspaceDate = explicitWorkspaceDate;
  const decisionStatus = workspaceDecisionStatus(message);
  const openDiningPlan = fallbackOpenDiningPlan(state);
  const segmentEndDate = extractSegmentEndDate(message, fallbackYear);
  const acceptsOpenDiningPlan =
    !diningFromText(message) &&
    openDiningPlan &&
    /\b(ok|okay|pode marcar|marcar|vamos nessa|vamos fazer|sounds good|that sounds good|let'?s do that)\b/i.test(message);

  const resortFirstPattern = new RegExp(
    `\\b${resortPattern}\\b[^.\\n;]{0,80}?\\b(${monthPattern})\\s+(\\d{1,2})(?:\\s*(?:-|to|through|thru|–)\\s*(\\d{1,2}))?[^.\\n;]{0,80}?\\b(?:(\\d{1,3})\\s*(?:pts?|points?))?`,
    "gi",
  );
  let resortFirstMatch: RegExpExecArray | null;
  while ((resortFirstMatch = resortFirstPattern.exec(message))) {
    const resort = resortLabelFromText(resortFirstMatch[1]);
    if (!resort) continue;
    const points = resortFirstMatch[5] ? Number(resortFirstMatch[5]) : undefined;
    const status = statusFromPlanningText(resortFirstMatch[0]);
    for (const date of workspaceDatesFromRange(resortFirstMatch[2], resortFirstMatch[3], resortFirstMatch[4], fallbackYear)) {
      workingItinerary.push({ date, resort, roomType: /studio/i.test(resortFirstMatch[0]) ? "Studio" : undefined, points, status });
      const availabilityStatus = availabilityStatusFromText(resortFirstMatch[0]);
      if (availabilityStatus) {
        availabilityObservations.push({ date, resort, roomType: /studio/i.test(resortFirstMatch[0]) ? "Studio" : undefined, points, status: availabilityStatus, source: "traveler_reported" });
      }
    }
  }

  const dateFirstPattern = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})\\b[^.\\n;]{0,80}?\\b${resortPattern}\\b[^.\\n;]{0,80}?\\b(?:(\\d{1,3})\\s*(?:pts?|points?))?`,
    "gi",
  );
  let dateFirstMatch: RegExpExecArray | null;
  while ((dateFirstMatch = dateFirstPattern.exec(message))) {
    const date = parseWorkspaceDate(dateFirstMatch[1], dateFirstMatch[2], fallbackYear);
    const resort = resortLabelFromText(dateFirstMatch[3]);
    if (!date || !resort) continue;
    const points = dateFirstMatch[4] ? Number(dateFirstMatch[4]) : undefined;
    const status = statusFromPlanningText(dateFirstMatch[0]);
    workingItinerary.push({ date, resort, roomType: /studio/i.test(dateFirstMatch[0]) ? "Studio" : undefined, points, status });
    const availabilityStatus = availabilityStatusFromText(dateFirstMatch[0]);
    if (availabilityStatus) {
      availabilityObservations.push({ date, resort, roomType: /studio/i.test(dateFirstMatch[0]) ? "Studio" : undefined, points, status: availabilityStatus, source: "traveler_reported" });
    }
  }

  const unresolvedPattern = new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})\\b[^.\\n;]{0,80}?\\b(unresolved|open night|still need|not resolved)\\b`, "gi");
  let unresolvedMatch: RegExpExecArray | null;
  while ((unresolvedMatch = unresolvedPattern.exec(message))) {
    const date = parseWorkspaceDate(unresolvedMatch[1], unresolvedMatch[2], fallbackYear);
    if (date) workingItinerary.push({ date, status: "unresolved", rationale: "Night remains unresolved." });
  }

  const activeDecisions: NonNullable<NonNullable<PixieTripPatch["planningWorkspace"]>["activeDecisions"]> = [];
  if (/\bwaitlist\b|\bwait-list\b/i.test(message)) {
    const waitlistResort = resortLabelFromText(message.match(new RegExp(`\\b${resortPattern}\\b`, "i"))?.[0] ?? "") ?? "DVC waitlist";
    activeDecisions.push({
      id: "dvc_waitlist_decision",
      label: `${waitlistResort} waitlist`,
      potentialBenefit: /magic kingdom|halloween/i.test(message) ? "Better access for the Magic Kingdom party night." : "Could improve the lodging plan if it matches the trip constraints.",
      risk: /cancel|holding|30 days|non-cancell/i.test(message) ? "Existing reservation changes may have Holding or cancellation consequences." : "Waitlist replacement can affect the secure option.",
      status: "needs_decision",
      source: "user_provided",
    });
  }
  if (/\bcancel|holding|30 days|non-cancell|modify|modification/i.test(message)) {
    activeDecisions.push({
      id: "dvc_cancellation_modification_risk",
      label: "DVC cancellation/modification risk",
      currentSecureOption: resortLabelFromText(message),
      risk: "Needs consequence-first review before changing an existing reservation.",
      status: "needs_account_specific_verification",
      source: "inference",
    });
  }

  const mentionedResort = resortLabelFromText(message);
  if (!mentionedResort && decisionStatus === "selected" && /\b(sugest[oõ]es|suggestions|essas|these|that)\b/i.test(message)) {
    for (const plan of state.planningWorkspace.lodgingPlans.filter((plan) => plan.status === "recommended").slice(-4)) {
      lodgingPlans.push({ ...plan, status: "selected", source: "explicit_user" });
    }
  }
  if (mentionedResort && /\b(stay|staying|ficar|hospedar|resort|villa|tower|villas|considering|decided|booked|confirmed|let'?s do|sounds much better|parece perfeito|est[aá] perfeito|vamos nele)\b/i.test(message)) {
    const mkFirstOnly = mentionedResort === "Bay Lake Tower" && /\b(first|primeiro|somente no primeiro|only.*first)\b/i.test(message);
    const segment =
      extractWorkspaceDateRangeFromMessage(message, fallbackYear) ??
      (mkFirstOnly ? lodgingSegmentDatesFor(message, state, fallbackYear, "mk_first") : undefined);
    lodgingPlans.push({
      id: stableId("lodging", mentionedResort),
      resort: mentionedResort,
      startDate: segment?.startDate ?? state.dates.arrivalDate,
      endDate: segment?.endDate ?? state.dates.departureDate,
      status: decisionStatus,
      source: decisionStatus === "recommended" ? "model_recommendation" : "explicit_user",
      note: /magic kingdom|festa|party/i.test(message) && /bay lake|blt/i.test(message) ? "Easy Magic Kingdom return." : undefined,
      dvcRelevant: /dvc|points|villa|villas|bay lake|boardwalk|animal kingdom villas/i.test(message),
    });
  }

  if (/\bdisney springs?\b/i.test(message) && /\b(perto|near|close|ficar|stay|hosped|segundo|second|quarto|fourth)\b/i.test(message) && !state.preferences.excludedResorts.some((value) => /saratoga/i.test(value))) {
    const segment = lodgingSegmentDatesFor(message, state, fallbackYear, "disney_springs");
    lodgingPlans.push({
      id: stableId("lodging", `saratoga_springs_${segment.startDate ?? workspaceDate ?? "segment"}`),
      resort: "Disney's Saratoga Springs Resort & Spa",
      startDate: segment.startDate,
      endDate: segment.endDate,
      status: "recommended",
      source: "model_recommendation",
      note: "Best fit for Disney Springs convenience.",
      dvcRelevant: true,
    });
  }

  if (/\bepcot\b|international gateway/i.test(message) && /\b(perto|near|close|ficar|stay|hosped|depois|after)\b/i.test(message)) {
    const boardwalkExcluded = state.preferences.excludedResorts.some((value) => /boardwalk/i.test(value));
    const segment = lodgingSegmentDatesFor(message, state, fallbackYear, "epcot_final");
    lodgingPlans.push({
      id: stableId("lodging", `${boardwalkExcluded ? "beach_club" : "boardwalk"}_${segment.startDate ?? workspaceDate ?? "segment"}`),
      resort: boardwalkExcluded ? "Beach Club Villas" : "BoardWalk Villas",
      startDate: segment.startDate,
      endDate: segment.endDate,
      status: "recommended",
      source: "model_recommendation",
      note: boardwalkExcluded ? "EPCOT International Gateway fallback." : "Best fit for EPCOT International Gateway convenience.",
      dvcRelevant: true,
    });
  }

  const mentionedPark = parkLabelFromText(message);
  if (mentionedPark && /\b(do|doing|park|party|festa|vamos|we'll|will|epcot|magic kingdom|animal kingdom|hollywood studios)\b/i.test(message)) {
    parkPlans.push({
      id: stableId("park", `${workspaceDate ?? "dateless"}_${mentionedPark}`),
      park: mentionedPark,
      date: workspaceDate,
      status: /\bprobably|maybe|talvez\b/i.test(message) ? "considering" : decisionStatus === "confirmed" ? "confirmed" : "planned",
      source: "explicit_user",
      note: /halloween|festa/i.test(message) ? "Halloween party context." : undefined,
    });
  }

  if ((/\bhalloween party\b|\bfesta de halloween\b|\bparty\b|\bfesta\b/i.test(message) && /magic kingdom/i.test(message)) || /\bvoltar depois da festa\b|\bsair tarde da festa\b/i.test(normalized)) {
    activityPlans.push({
      id: stableId("activity", `${workspaceDate ?? "dateless"}_magic_kingdom_halloween_party`),
      label: "Magic Kingdom Halloween party",
      date: workspaceDate,
      status: decisionStatus === "confirmed" ? "confirmed" : "planned",
      source: "explicit_user",
      note: "Late return logistics matter.",
    });
    attentionItems.push({
      id: "logistics_magic_kingdom_late_return",
      label: "Late Magic Kingdom return",
      category: "logistics",
      status: "open",
      source: "deterministic_inference",
      note: "Walking-distance lodging is valuable after the party.",
    });
  }

  const dining = diningFromText(message);
  if (!workspaceDate && dining) workspaceDate = fallbackWorkspaceDate(state, dining.label);
  const hasEpcotLunchContext =
    state.planningWorkspace.parkPlans.some((plan) => plan.park === "EPCOT") &&
    state.planningWorkspace.attentionItems.some((item) => /lunch|almo[cç]o/i.test(`${item.label} ${item.note ?? ""}`));
  const mealPeriod = /\bbreakfast|cafe|café/i.test(message)
    ? "breakfast"
    : /\blunch|almoco|almoço/i.test(message)
      ? "lunch"
      : /\bdinner|jantar|6|18|booked|reserved/i.test(message)
        ? "dinner"
        : fallbackMealPeriod(state, dining?.label);
  if (dining && (mealPeriod || hasEpcotLunchContext || /\bbooked|reserved|sounds perfect|let'?s do|find us dinner|jantar\b/i.test(message))) {
    const time = extractWorkspaceTime(message);
    const inheritOpenMealSlot = Boolean(openDiningPlan && (decisionStatus === "selected" || decisionStatus === "confirmed" || /\binstead\b|\bactually\b|\bem vez disso\b|\bna verdade\b/i.test(message)));
    const inheritedDate = inheritOpenMealSlot ? openDiningPlan?.date : workspaceDate ?? openDiningPlan?.date;
    const inheritedMealPeriod = inheritOpenMealSlot ? openDiningPlan?.mealPeriod : mealPeriod ?? openDiningPlan?.mealPeriod ?? (hasEpcotLunchContext ? "lunch" : undefined);
    diningPlans.push({
      id: stableId("dining", `${inheritedDate ?? "dateless"}_${inheritedMealPeriod ?? "meal"}_${dining.label}`),
      restaurant: dining.label,
      date: inheritedDate,
      mealPeriod: inheritedMealPeriod,
      targetTime: time ?? (/\baround|por volta/i.test(message) || mealPeriod === "dinner" ? "18:00 target" : undefined),
      status: decisionStatus,
      source: decisionStatus === "recommended" ? "model_recommendation" : "explicit_user",
      planningPriceEstimate: dining.estimate,
    });
  } else if (acceptsOpenDiningPlan) {
    const time = extractWorkspaceTime(message);
    diningPlans.push({
      ...openDiningPlan,
      date: workspaceDate ?? openDiningPlan.date,
      status: decisionStatus === "confirmed" ? "confirmed" : "selected",
      source: "explicit_user",
      targetTime: time ?? openDiningPlan.targetTime,
    });
  } else if (!dining && openDiningPlan && workspaceDate && /\b(dia|date|september|setembro|october|outubro|november|novembro|december|dezembro|january|janeiro|february|fevereiro|march|mar[çc]o|april|abril|may|maio|june|junho|july|julho|august|agosto)\b/i.test(message)) {
    const inferredPark = expectedParkForDining(openDiningPlan.restaurant);
    diningPlans.push({
      ...openDiningPlan,
      date: workspaceDate,
      source: "explicit_user",
    });
    if (inferredPark) {
      parkPlans.push({
        id: stableId("park", `${workspaceDate}_${inferredPark}`),
        park: inferredPark,
        date: workspaceDate,
        status: "planned",
        source: "deterministic_inference",
      });
    }
  } else if (!dining && openDiningPlan && /\b(booked|reserved|confirmed|j[aá] reservei|est[aá] reservado|consegui reservar|reserva est[aá] confirmada)\b/i.test(message)) {
    const time = extractWorkspaceTime(message);
    diningPlans.push({
      ...openDiningPlan,
      status: "confirmed",
      source: "explicit_user",
      targetTime: time ?? openDiningPlan.targetTime,
    });
  } else if (/\b(find us dinner|find me dinner|choose dinner|dinner around|jantar|almo[cç]o)\b/i.test(message)) {
    workspaceDate = workspaceDate ?? fallbackWorkspaceDate(state);
    const label = /\balmo[cç]o|lunch/i.test(message) ? "Choose lunch" : "Choose dinner";
    const period = label === "Choose lunch" ? "lunch" : "dinner";
    attentionItems.push({
      id: stableId("attention", `${workspaceDate ?? "dateless"}_${period}`),
      label,
      category: "open_decision",
      status: "open",
      source: "deterministic_inference",
      note: workspaceDate ? `${workspaceDate} ${period} needs a restaurant decision.` : `${period[0].toUpperCase()}${period.slice(1)} needs a restaurant decision.`,
    });
  }

  if (/\bpark hours|closes|close|fecha|horario\b/i.test(message) && mentionedPark) {
    attentionItems.push({
      id: stableId("live", `${workspaceDate ?? "dateless"}_${mentionedPark}_hours`),
      label: `${mentionedPark} current hours`,
      category: "live_info",
      status: "open",
      source: "deterministic_inference",
      note: "Current operating hours are date-specific.",
    });
  }

  if (!workingItinerary.length && !availabilityObservations.length && !activeDecisions.length && !lodgingPlans.length && !parkPlans.length && !diningPlans.length && !activityPlans.length && !attentionItems.length) return undefined;
  return {
    ...(workingItinerary.length ? { workingItinerary } : {}),
    ...(availabilityObservations.length ? { availabilityObservations } : {}),
    ...(activeDecisions.length ? { activeDecisions } : {}),
    ...(lodgingPlans.length ? { lodgingPlans } : {}),
    ...(parkPlans.length ? { parkPlans } : {}),
    ...(diningPlans.length ? { diningPlans } : {}),
    ...(activityPlans.length ? { activityPlans } : {}),
    ...(attentionItems.length ? { attentionItems } : {}),
  };
}

function extractDvcContextPatch(message: string): NonNullable<PixieTripPatch["dvcContext"]> | undefined {
  const normalized = message.toLowerCase();
  const patch: NonNullable<PixieTripPatch["dvcContext"]> = {};
  if (/\bdvc\b|\buse year\b|\bpoints?\b|\bborrow/i.test(message)) patch.lodgingContext = "dvc_points";
  const useYearMatch = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+use\s+year\b/i.exec(message);
  if (useYearMatch) patch.useYear = `${useYearMatch[1][0].toUpperCase()}${useYearMatch[1].slice(1).toLowerCase()}`;
  const currentMatch = /\b(?:current(?:-|\s*)year|current\s+use\s+year)[^.。\n]{0,60}?\b(\d{1,4})\s+points?\b/i.exec(message);
  if (currentMatch) patch.currentUseYearPoints = { points: Number(currentMatch[1]), source: "user_provided" };
  const nextMatch = /\b(?:next(?:-|\s*)year|next\s+use\s+year)[^.。\n]{0,60}?\b(\d{1,4})\s+points?\b/i.exec(message);
  if (nextMatch) patch.nextUseYearPoints = { points: Number(nextMatch[1]), source: "user_provided" };
  if (/\bborrow(?:ing)?\b/.test(normalized)) patch.borrowingContemplated = true;
  if (/\bholding\b|\bwithin\s+30\s+days\b|\b30-day\b|\bnon-cancell/i.test(message)) {
    patch.holdingExposure = {
      isExposed: true,
      source: "inference",
      notes: "User raised cancellation/Holding timing risk; exact point allocation remains account-specific.",
    };
    patch.planningRisks = ["Cancellation or modification may create Holding exposure.", "Unknown account-specific point allocation should not be invented."];
  }
  if (/\bwaitlist\b|\bwait-list\b/i.test(message)) patch.unresolvedDecisions = ["Waitlist choice remains unresolved."];
  if (/\bcancel|modify|modification/i.test(message)) patch.proposedReservationChanges = ["Review cancellation or modification before changing the secure reservation."];
  return Object.keys(patch).length ? patch : undefined;
}

function extractPartyPatch(message: string, state: PixieTripState): NonNullable<PixieTripPatch["party"]> | undefined {
  const normalized = message.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ");
  const patch: NonNullable<PixieTripPatch["party"]> = {};
  const childOperations: NonNullable<NonNullable<PixieTripPatch["party"]>["travellerOperations"]> = [];
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3 };
  const numberValue = (value: string | undefined) => (value ? Number(value) || numberWords[value] : undefined);

  const adultChildMatch = /\b(\d{1,2}|one|two|three|four|five|six|um|uma|dois|duas|tres|três)\s+adults?\b(?:.*?\b(\d{1,2}|one|two|three|four|five|six)\s+(?:children|kids?|child)\b)?/.exec(normalized);
  if (adultChildMatch) {
    patch.adults = numberValue(adultChildMatch[1]);
    if (adultChildMatch[2]) patch.children = numberValue(adultChildMatch[2]);
  }

  const childOnlyMatch = /\b(\d{1,2})\s+(?:children|kids?|child)\b/.exec(normalized);
  if (childOnlyMatch && patch.children === undefined) patch.children = Number(childOnlyMatch[1]);

  const wifePattern = /\b(?:me|myself|i)\b[\s\S]{0,24}\bmy wife\b|\bmy wife\b[\s\S]{0,24}\b(?:me|myself|i)\b|\b(?:eu)\b[\s\S]{0,32}\bmeu marido\b|\bmeu marido\b[\s\S]{0,32}\b(?:eu)\b/;
  if (wifePattern.test(normalized)) patch.adults = Math.max(patch.adults ?? 0, 2);

  const correctionMatch = /\b(?:actually|no,?|na verdade)\s+([a-z][a-z0-9_-]{1,40})\s+(?:is|tem)\s+(\d{1,2})(?:\s+now| anos?)?\b/.exec(normalized);
  if (correctionMatch) {
    const name = correctionMatch[1];
    const age = Number(correctionMatch[2]);
    const target = state.party.travellers.find((traveller) => traveller.displayName?.toLowerCase() === name || traveller.label?.toLowerCase().includes(name)) ?? state.party.travellers.find((traveller) => traveller.ageGroup !== "adult");
    if (target) {
      childOperations.push({ op: "updateTraveller", id: target.id, changes: { age, label: target.label ?? `${age} year old` } });
      patch.children = Math.max(patch.children ?? state.party.children ?? 0, 1);
    }
  }
  const pronounCorrectionMatch = /\b(?:she|he|ela|ele)(?:'s| is| tem)?\s+(?:actually|na verdade)?\s*(\d{1,2})(?:\s+now| anos?)?\b/.exec(normalized);
  if (pronounCorrectionMatch) {
    const age = Number(pronounCorrectionMatch[1]);
    const target = state.party.travellers.find((traveller) => traveller.ageGroup !== "adult");
    if (target) {
      childOperations.push({ op: "updateTraveller", id: target.id, changes: { age, label: target.label ?? `${age} year old` } });
      patch.children = Math.max(patch.children ?? state.party.children ?? 0, 1);
    }
  }

  const ageMatch = /\b(?:my|our)\s+(\d{1,2})\s*[-\s]*(?:year|yr)[-\s]*old\b|\b(?:minha|meu|nossa|nosso)\s+(?:filha|filho|crian[çc]a)\s+de\s+(\d{1,2})\s+anos?\b/.exec(normalized);
  if (ageMatch) {
    const age = Number(ageMatch[1] ?? ageMatch[2]);
    const agePhrase = ageMatch[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const singularAdultWithChild = new RegExp(`\\b(?:i am|i'm|im)\\b[\\s\\S]{0,80}\\bwith\\s+${agePhrase}\\b`).test(normalized);
    const pluralAdultsWithChild =
      new RegExp(`\\b(?:we are|we're|were)\\b[\\s\\S]{0,80}\\bwith\\s+${agePhrase}\\b`).test(normalized) ||
      /\b(vamos|nossa|nosso)\b/.test(normalized);
    if (patch.adults === undefined) {
      if (pluralAdultsWithChild) patch.adults = 2;
      else if (singularAdultWithChild) patch.adults = 1;
    }
    patch.children = Math.max(patch.children ?? 0, 1);
    if (!state.party.travellers.some((traveller) => traveller.age === age)) {
      childOperations.push({
        op: "addTraveller",
        traveller: {
          category: "child",
          age,
          label: `${age} year old`,
          interests: [],
        },
      });
    }
  }

  if (childOperations.length) patch.travellerOperations = childOperations;
  return Object.keys(patch).length ? patch : undefined;
}

function extractLightweightTripPatch(message: string, state: PixieTripState, generatedAt: string): PixieTripPatch {
  const dateExtraction = extractLightweightDates(message);
  const facts = extractPreferenceFacts(message);
  const party = extractPartyPatch(message, state);
  const preferences: NonNullable<PixieTripPatch["preferences"]> = {};
  const rejectedResorts = extractRejectedResorts(message);

  if (facts.preferredResorts.length) preferences.preferredResorts = normalizeStringArray([...state.preferences.preferredResorts, ...facts.preferredResorts]);
  if (facts.resortPriorities.length) preferences.resortPriorities = normalizeStringArray([...state.preferences.resortPriorities, ...facts.resortPriorities]);
  if (facts.parkPriorities.length) preferences.parkPriorities = normalizeStringArray([...state.preferences.parkPriorities, ...facts.parkPriorities]);
  if (rejectedResorts.length) preferences.excludedResorts = normalizeStringArray([...state.preferences.excludedResorts, ...rejectedResorts]);
  const notes = [...dateExtraction.dateNotes, facts.generalNotes].filter(Boolean);
  if (notes.length) preferences.generalNotes = [state.preferences.generalNotes, ...notes].filter(Boolean).join(" ").slice(0, 1000);
  if (/\bsplit stay\b/i.test(message)) preferences.splitStayOpenness = true;
  const dvcContext = extractDvcContextPatch(message);
  const planningWorkspace = extractPlanningWorkspacePatch(message, state, generatedAt);

  return {
    ...(dateExtraction.dates && (!state.dates.arrivalDate || !state.dates.departureDate || isExplicitOverallTripDateIntent(message)) ? { dates: dateExtraction.dates } : {}),
    ...(party ? { party } : {}),
    ...(Object.keys(preferences).length ? { preferences } : {}),
    ...(dvcContext ? { dvcContext } : {}),
    ...(planningWorkspace ? { planningWorkspace } : {}),
  };
}

function shouldClearExistingDatesForExtraction(message: string, state: PixieTripState) {
  const dateExtraction = extractLightweightDates(message);
  const normalized = message.toLowerCase();
  if (state.dates.arrivalDate && state.dates.departureDate) {
    return (
      dateExtraction.hasDateInformation &&
      dateExtraction.hasPartialTripDates &&
      (/\bchecking?\s*out\b|\bcheckout\b|\barriving\b|\barrive\b|\bhas\b[^.]{0,60}\b(?:points?|waitlists?|available)\b/.test(normalized) || extractDateMentions(message).mentions.length >= 3)
    );
  }
  return dateExtraction.hasDateInformation && dateExtraction.hasPartialTripDates;
}

function complexPlanningSignals(message: string) {
  const dateMentions = extractDateMentions(message).mentions.length;
  const resortMentions = RESORT_MENTIONS.filter((resort) => resort.pattern.test(message)).length;
  const pointValues = message.match(/\b\d{1,3}\s+points?\b/gi)?.length ?? 0;
  const normalized = message.toLowerCase();
  const constraints = [
    /\bwaitlist\b/.test(normalized),
    /\bminimi[sz]e resort changes\b|\bfew(?:er)? resort changes\b/.test(normalized),
    /\bsave points\b|\blower points\b/.test(normalized),
    /\bnear magic kingdom\b|\bclose to magic kingdom\b/.test(normalized),
    /\bhalloween party\b|\bmickey'?s not so scary halloween party\b/.test(normalized),
  ].filter(Boolean).length;

  return { dateMentions, resortMentions, pointValues, constraints };
}

function isClearlyComplexPlanningTurn(message: string) {
  const signals = complexPlanningSignals(message);
  return (
    (signals.dateMentions >= 4 && signals.resortMentions >= 3) ||
    (signals.resortMentions >= 3 && signals.pointValues >= 5) ||
    (signals.pointValues >= 5 && signals.constraints >= 2) ||
    (signals.dateMentions >= 3 && signals.constraints >= 3)
  );
}

function providerTimeoutForTurn(message: string, defaultTimeoutMs: number) {
  return isClearlyComplexPlanningTurn(message) ? Math.max(defaultTimeoutMs, COMPLEX_PLANNING_TIMEOUT_MS) : defaultTimeoutMs;
}

function extractTrustedToolOutputs(toolResults: PixieToolResult[]) {
  let recommendations: PixieRecommendationResult | undefined;
  let readyStayMatches: PixieReadyStayMatchResult | undefined;
  let planOutline: unknown;

  for (const toolResult of toolResults) {
    if (!toolResult.ok) continue;
    if (toolResult.toolName === "recommend_resorts") recommendations = toolResult.result as PixieRecommendationResult;
    if (toolResult.toolName === "find_ready_stays") readyStayMatches = toolResult.result as PixieReadyStayMatchResult;
    if (toolResult.toolName === "generate_plan_outline") planOutline = toolResult.result;
  }

  return { recommendations, readyStayMatches, planOutline };
}

function safeFallbackModelResult(message: string, nextQuestionKey?: PixieQuestionKey): PixieModelTurnResult {
  return {
    assistantResponse: message,
    tripPatch: {},
    requestedTools: [],
    nextQuestionKey,
    planningIntent: "clarify_information",
    confidence: 0.2,
    warnings: [],
  };
}

function pixieErrorFromProviderFailure(error: unknown): PixieAiError {
  if (error instanceof PixieAiException) {
    return pixieAiError(error.code, error.message, undefined, {
      status: error.status,
      retryAfterMs: error.retryAfterMs,
    });
  }
  return pixieAiError(
    "provider_unavailable",
    error instanceof Error ? error.message : "Pixie provider failed before returning a usable planning result.",
  );
}

function preparePixiePlannerTurn(input: RunPixiePlannerTurnInput): PreparedPixiePlannerTurn {
  const generatedAt = input.now ?? new Date().toISOString();
  const id = input.turnId ?? turnId(generatedAt);
  const config = getPixieAiConfig();
  const warnings: string[] = [];
  let state: PixieTripState;

  try {
    state = normalizePixieTripState(input.state, { preserveUpdatedAt: true });
  } catch (error) {
    throw Object.assign(new Error("Invalid Pixie planner state."), {
      pixieError: pixieAiError("invalid_state", error instanceof Error ? error.message : "Invalid Pixie planner state."),
    });
  }

  const stateSizeError = validatePlannerStateSize(state);
  if (stateSizeError) {
    throw Object.assign(new Error(stateSizeError.message), { pixieError: stateSizeError });
  }

  const requestParsed = pixiePlannerTurnRequestSchema.safeParse({
    message: input.message,
    recentMessages: input.recentMessages ?? [],
    context: input.context,
  });
  if (!requestParsed.success) {
    throw Object.assign(new Error("Invalid Pixie planner turn request."), {
      pixieError: pixieAiError("invalid_model_output", requestParsed.error.issues[0]?.message ?? "Invalid request."),
    });
  }

  const message = normalizeUserMessage(requestParsed.data.message, config.maxInputChars);
  if (!message.ok) throw Object.assign(new Error(message.error.message), { pixieError: message.error });

  const injection = detectPromptInjectionAttempt(message.message);
  if (injection) warnings.push(injection.message);

  const clearExistingDates = shouldClearExistingDatesForExtraction(message.message, state);
  const extractionBaseState = clearExistingDates ? normalizePixieTripState({ ...state, dates: {} }, { now: generatedAt }) : state;
  const extractionPatch = extractLightweightTripPatch(message.message, extractionBaseState, generatedAt);
  let extractedState: PixieTripState | undefined;
  if (Object.keys(extractionPatch).length > 0) {
    const extractionResult = applyPixieTripPatch(extractionBaseState, extractionPatch, { now: generatedAt });
    if (extractionResult.ok) {
      state = extractionResult.state;
      extractedState = state;
    } else {
      warnings.push(...extractionResult.errors.map((error) => `Lightweight extraction rejected: ${error.message}`));
    }
  }

  let completeness = evaluatePixieCompleteness(state);
  let usage = emptyPixieUsage("openai", config.model, PIXIE_AI_PROMPT_VERSION);
  const provider = input.provider ?? createOpenAiPixieProvider();
  const providerTimeoutMs = providerTimeoutForTurn(message.message, config.modelTimeoutMs);
  const knowledgeContext = createHannaKnowledgeService().retrieve({
    latestUserMessage: message.message,
    currentState: state,
    recentMessages: limitRecentMessages(requestParsed.data.recentMessages, config.maxRecentMessages),
  });
  const dvcContext = buildDvcContext({
    latestUserMessage: message.message,
    currentState: state,
    recentMessages: limitRecentMessages(requestParsed.data.recentMessages, config.maxRecentMessages),
    now: generatedAt,
  });
  const currentPlanSummary = buildCurrentPlanSummary(state);

  return {
    id,
    generatedAt,
    config,
    warnings,
    state,
    message: message.message,
    recentMessages: limitRecentMessages(requestParsed.data.recentMessages, config.maxRecentMessages),
    completeness,
    usage,
    provider,
    providerTimeoutMs,
    knowledgeContext,
    dvcContext,
    currentPlanSummary,
    extractedState,
  };
}

async function completePixiePlannerTurn(prepared: PreparedPixiePlannerTurn, input: RunPixiePlannerTurnInput): Promise<PixiePlannerTurnResult> {
  let { state, completeness, usage } = prepared;
  let providerResult: PixieModelProviderResult;
  const liveContext =
    prepared.liveContext ??
    (await (input.liveDisneyService ?? createLiveDisneyService()).retrieve({
      latestUserMessage: prepared.message,
      currentState: state,
      recentMessages: prepared.recentMessages,
      knowledgeContext: prepared.knowledgeContext,
      now: prepared.generatedAt,
    }));

  try {
    providerResult = await prepared.provider.createPlannerTurn(
      {
        currentState: state,
        currentPlanSummary: prepared.currentPlanSummary,
        latestUserMessage: prepared.message,
        recentMessages: prepared.recentMessages,
        completeness,
        availableTools: getPixieModelToolDefinitions(),
        destinationScope: "walt_disney_world",
        knowledgeContext: prepared.knowledgeContext,
        dvcContext: prepared.dvcContext,
        liveContext,
        safeContext: input.context,
      },
      { model: prepared.config.model, maxOutputTokens: prepared.config.maxOutputTokens, timeoutMs: prepared.providerTimeoutMs },
    );
  } catch (error) {
    const pixieError = pixieErrorFromProviderFailure(error);
    throw Object.assign(new Error(pixieError.message), { pixieError });
  }

  usage = mergePixieUsage(usage, providerResult.usage, 0);
  const parsedModel = pixieModelTurnResultSchema.safeParse(providerResult.result);
  if (!parsedModel.success) {
    const response = buildPixiePlannerResponse({
      modelResult: safeFallbackModelResult("I understood your message, but I need to ask a cleaner follow-up before updating the plan.", completeness.suggestedNextQuestionKey),
      completeness,
      toolResults: [],
      warnings: [...prepared.warnings, "invalid_model_output"],
      latestUserMessage: prepared.message,
      recentMessages: prepared.recentMessages,
      currentState: state,
      knowledgeContext: prepared.knowledgeContext,
    });
    return {
      assistantResponse: response.message,
      updatedState: state,
      completeness,
      planningStage: completeness.planningStage,
      toolResults: [],
      nextQuestionKey: response.nextQuestionKey,
      warnings: response.warnings,
      providerMetadata: providerResult.metadata,
      usage,
      turnId: prepared.id,
      generatedAt: prepared.generatedAt,
    };
  }

  const modelResult = parsedModel.data;
  const warnings = [...prepared.warnings];
  warnings.push(...modelResult.warnings);

  const patchResult = applyPixieTripPatch(state, modelResult.tripPatch, { now: prepared.generatedAt });
  if (patchResult.ok) {
    state = patchResult.state;
  } else if (Object.keys(modelResult.tripPatch).length > 0) {
    warnings.push(...patchResult.errors.map((error) => `Patch rejected: ${error.message}`));
  }

  completeness = evaluatePixieCompleteness(state);

  const toolRequests = dedupePixieToolRequests(ensureImplicitTools(modelResult.requestedTools, completeness, prepared.message), PIXIE_AI_LIMITS.maxToolCallsPerTurn);
  const toolResults: PixieToolResult[] = [];
  for (const request of toolRequests) {
    const toolResult = await executePixieTool({ toolRequest: request, currentState: state, now: prepared.generatedAt });
    toolResults.push(toolResult);
    if (toolResult.ok && toolResult.toolName === "apply_trip_patch") {
      const maybeState = toolResult.result as { applied?: boolean; state?: PixieTripState };
      if (maybeState.applied && maybeState.state) {
        state = maybeState.state;
        completeness = evaluatePixieCompleteness(state);
      }
    }
  }
  usage = mergePixieUsage(usage, undefined, toolResults.length);

  const trustedOutputs = extractTrustedToolOutputs(toolResults);
  const response = buildPixiePlannerResponse({
    modelResult,
    completeness,
    toolResults,
    warnings,
    latestUserMessage: prepared.message,
    recentMessages: prepared.recentMessages,
    currentState: state,
    knowledgeContext: prepared.knowledgeContext,
    liveContext,
  });

  return {
    assistantResponse: response.message,
    updatedState: state,
    completeness,
    planningStage: completeness.planningStage,
    toolResults,
    recommendations: trustedOutputs.recommendations,
    readyStayMatches: trustedOutputs.readyStayMatches,
    planOutline: trustedOutputs.planOutline,
    nextQuestionKey: response.nextQuestionKey,
    warnings: response.warnings,
    providerMetadata: providerResult.metadata,
    usage,
    turnId: prepared.id,
    generatedAt: prepared.generatedAt,
  };
}

export async function runPixiePlannerTurn(input: RunPixiePlannerTurnInput): Promise<PixiePlannerTurnResult> {
  return completePixiePlannerTurn(preparePixiePlannerTurn(input), input);
}

function isNarrowDvcIntent(message: string) {
  return /\b(dvc rules?|cancel(?:lation)?|holding|borrow(?:ing)?|point allocation|use year|waitlist|wait-list|existing reservation|modify|modification|non-cancell|30-day|30 days)\b/i.test(
    message,
  );
}

function isDiningIntent(message: string) {
  return /\b(dining|dinner|restaurant|eat|food|meal|breakfast|lunch|jantar|almo[cç]o|restaurante|comer|refei[cç][aã]o|personagens?|princesas?)\b/i.test(message);
}

function ensureImplicitTools(requests: PixieAiToolRequest[], completeness: PixieCompletenessResult, latestUserMessage: string): PixieAiToolRequest[] {
  const next = isNarrowDvcIntent(latestUserMessage) ? requests.filter((request) => request.name !== "recommend_resorts") : [...requests];
  if (isNarrowDvcIntent(latestUserMessage)) return next;
  if (isDiningIntent(latestUserMessage)) return next.filter((request) => request.name !== "recommend_resorts");
  if (completeness.readyForResortRecommendations && !next.some((request) => request.name === "recommend_resorts")) {
    next.push({ name: "recommend_resorts", input: {}, reason: "Trip is ready for resort recommendations." });
  }
  return next;
}

export async function* streamPixiePlannerTurn(input: RunPixiePlannerTurnInput): AsyncIterable<PixiePlannerStreamEvent> {
  const startedAt = input.now ?? new Date().toISOString();
  const id = turnId(startedAt);
  yield { type: "turn_started", turnId: id };
  try {
    const prepared = preparePixiePlannerTurn({ ...input, now: startedAt, turnId: id });
    if (prepared.extractedState) yield { type: "trip_patch_applied", turnId: id, updatedState: prepared.extractedState };
    const result = await completePixiePlannerTurn(prepared, { ...input, now: startedAt, turnId: id });
    yield { type: "assistant_text_delta", turnId: id, text: result.assistantResponse };
    if (result.recommendations) yield { type: "recommendations_ready", turnId: id, recommendations: result.recommendations };
    if (result.readyStayMatches) yield { type: "ready_stays_ready", turnId: id, readyStayMatches: result.readyStayMatches };
    if (result.planOutline) yield { type: "plan_outline_ready", turnId: id, planOutline: result.planOutline };
    for (const warning of result.warnings) yield { type: "warning", turnId: id, warning };
    yield { type: "usage", turnId: id, usage: result.usage };
    yield { type: "turn_completed", turnId: id, result };
  } catch (error) {
    const pixieError = (error as { pixieError?: PixieAiError }).pixieError ?? pixieAiError("tool_execution_failed", error instanceof Error ? error.message : "Pixie turn failed.");
    yield { type: "turn_failed", turnId: id, error: pixieError };
  }
}
