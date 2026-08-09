import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { applyPixieTripPatch, calculateDateOnlyNights, normalizePixieTripState, normalizeStringArray } from "@/lib/pixie/planner-state";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";
import type { PixieTripPatch, PixieTripState } from "@/lib/pixie/schema";
import type { PixieCompletenessResult, PixieQuestionKey } from "@/lib/pixie/types";
import type { PixieAiError } from "@/lib/pixie/ai/errors";
import { PixieAiException, pixieAiError } from "@/lib/pixie/ai/errors";
import type { PixieModelProvider, PixieModelProviderResult } from "@/lib/pixie/ai/provider";
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
  extractedState?: PixieTripState;
};

function turnId(now: string) {
  return `pixie_turn_${now.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
}

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

const RESORT_MENTIONS = [
  { pattern: /\bbay lake(?: tower)?\b/i, label: "Bay Lake Tower" },
  { pattern: /\bpolynesian\b/i, label: "Polynesian Villas" },
  { pattern: /\bcopper creek\b/i, label: "Copper Creek Villas" },
  { pattern: /\bboulder ridge\b/i, label: "Boulder Ridge Villas" },
  { pattern: /\bgrand floridian\b/i, label: "Grand Floridian Villas" },
  { pattern: /\bboardwalk\b/i, label: "BoardWalk Villas" },
  { pattern: /\briviera\b/i, label: "Riviera Resort" },
  { pattern: /\bsaratoga(?: springs)?\b/i, label: "Saratoga Springs" },
] as const;

const COMPLEX_PLANNING_TIMEOUT_MS = 45_000;

function dateOnly(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const value = date.toISOString().slice(0, 10);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : undefined;
}

function firstDateRange(message: string) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const pattern = new RegExp(
    `\\b(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\s+(?:to|through|thru|-)\\s+(?:(${monthPattern})\\s+)?(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`,
    "i",
  );
  const match = pattern.exec(message);
  if (!match) return undefined;

  const arrivalMonth = MONTHS[match[1].toLowerCase()];
  const departureMonth = match[4] ? MONTHS[match[4].toLowerCase()] : arrivalMonth;
  const year = Number(match[6] ?? match[3]);
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
  const checkoutPattern = new RegExp(`\\b(?:check(?:ing)?\\s*out|checkout)\\s+(?:on\\s+)?(${monthPattern})\\s+(\\d{1,2})(?:,\\s*(\\d{4}))?\\b`, "i");
  const arrivalDate = extractExplicitDate(arrivalPattern, message, fallbackYear);
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

  if (/\bminimi[sz]e resort changes\b|\bfew(?:er)? resort changes\b|\bavoid (?:a )?(?:resort )?transfer\b|\bleast annoying (?:split stay|version)\b/.test(normalized)) {
    resortPriorities.push("minimize resort changes");
  }
  if (/\bsave points\b|\blower points\b|\bfew(?:er)? points\b|\bpoint saving\b/.test(normalized)) {
    resortPriorities.push("save points where reasonable");
  }
  if (/\bnear magic kingdom\b|\bclose to magic kingdom\b|\bmagic kingdom.*first night\b|\bfirst night.*magic kingdom\b/.test(normalized)) {
    resortPriorities.push("stay near Magic Kingdom");
    parkPriorities.push("Magic Kingdom");
  }
  if (/\bmagic kingdom\b/.test(normalized)) parkPriorities.push("Magic Kingdom");
  if (/\bhalloween party\b|\bmickey'?s not so scary halloween party\b/.test(normalized)) {
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

function extractPartyPatch(message: string, state: PixieTripState): NonNullable<PixieTripPatch["party"]> | undefined {
  const normalized = message.toLowerCase().replace(/\s+/g, " ");
  const patch: NonNullable<PixieTripPatch["party"]> = {};
  const childOperations: NonNullable<NonNullable<PixieTripPatch["party"]>["travellerOperations"]> = [];

  const adultChildMatch = /\b(\d{1,2})\s+adults?\b(?:.*?\b(\d{1,2})\s+(?:children|kids?|child)\b)?/.exec(normalized);
  if (adultChildMatch) {
    patch.adults = Number(adultChildMatch[1]);
    if (adultChildMatch[2]) patch.children = Number(adultChildMatch[2]);
  }

  const childOnlyMatch = /\b(\d{1,2})\s+(?:children|kids?|child)\b/.exec(normalized);
  if (childOnlyMatch && patch.children === undefined) patch.children = Number(childOnlyMatch[1]);

  const wifePattern = /\b(?:me|myself|i)\b[\s\S]{0,24}\bmy wife\b|\bmy wife\b[\s\S]{0,24}\b(?:me|myself|i)\b/;
  if (wifePattern.test(normalized)) patch.adults = Math.max(patch.adults ?? 0, 2);

  const ageMatch = /\bmy\s+(\d{1,2})\s*(?:year|yr)[-\s]*old\b/.exec(normalized);
  if (ageMatch && patch.adults !== undefined) {
    const age = Number(ageMatch[1]);
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

function extractLightweightTripPatch(message: string, state: PixieTripState): PixieTripPatch {
  const dateExtraction = extractLightweightDates(message);
  const facts = extractPreferenceFacts(message);
  const party = extractPartyPatch(message, state);
  const preferences: NonNullable<PixieTripPatch["preferences"]> = {};

  if (facts.preferredResorts.length) preferences.preferredResorts = normalizeStringArray([...state.preferences.preferredResorts, ...facts.preferredResorts]);
  if (facts.resortPriorities.length) preferences.resortPriorities = normalizeStringArray([...state.preferences.resortPriorities, ...facts.resortPriorities]);
  if (facts.parkPriorities.length) preferences.parkPriorities = normalizeStringArray([...state.preferences.parkPriorities, ...facts.parkPriorities]);
  const notes = [...dateExtraction.dateNotes, facts.generalNotes].filter(Boolean);
  if (notes.length) preferences.generalNotes = [state.preferences.generalNotes, ...notes].filter(Boolean).join(" ").slice(0, 1000);
  if (/\bsplit stay\b/i.test(message)) preferences.splitStayOpenness = true;

  return {
    ...(dateExtraction.dates ? { dates: dateExtraction.dates } : {}),
    ...(party ? { party } : {}),
    ...(Object.keys(preferences).length ? { preferences } : {}),
  };
}

function shouldClearExistingDatesForExtraction(message: string) {
  const dateExtraction = extractLightweightDates(message);
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

  const clearExistingDates = shouldClearExistingDatesForExtraction(message.message);
  const extractionBaseState = clearExistingDates ? normalizePixieTripState({ ...state, dates: {} }, { now: generatedAt }) : state;
  const extractionPatch = extractLightweightTripPatch(message.message, extractionBaseState);
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
    extractedState,
  };
}

async function completePixiePlannerTurn(prepared: PreparedPixiePlannerTurn, input: RunPixiePlannerTurnInput): Promise<PixiePlannerTurnResult> {
  let { state, completeness, usage } = prepared;
  let providerResult: PixieModelProviderResult;

  try {
    providerResult = await prepared.provider.createPlannerTurn(
      {
        currentState: state,
        latestUserMessage: prepared.message,
        recentMessages: prepared.recentMessages,
        completeness,
        availableTools: getPixieModelToolDefinitions(),
        destinationScope: "walt_disney_world",
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

  const toolRequests = dedupePixieToolRequests(ensureImplicitTools(modelResult.requestedTools, completeness), PIXIE_AI_LIMITS.maxToolCallsPerTurn);
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
  const response = buildPixiePlannerResponse({ modelResult, completeness, toolResults, warnings, latestUserMessage: prepared.message });

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

function ensureImplicitTools(requests: PixieAiToolRequest[], completeness: PixieCompletenessResult): PixieAiToolRequest[] {
  const next = [...requests];
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
