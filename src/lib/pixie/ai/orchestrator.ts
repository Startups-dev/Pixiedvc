import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { applyPixieTripPatch, normalizePixieTripState } from "@/lib/pixie/planner-state";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieReadyStayMatchResult } from "@/lib/pixie/ready-stays/types";
import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieCompletenessResult, PixieQuestionKey } from "@/lib/pixie/types";
import type { PixieAiError } from "@/lib/pixie/ai/errors";
import { pixieAiError } from "@/lib/pixie/ai/errors";
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

function turnId(now: string) {
  return `pixie_turn_${now.replace(/[^0-9]/g, "").slice(0, 14)}_${Math.random().toString(36).slice(2, 8)}`;
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

export async function runPixiePlannerTurn(input: RunPixiePlannerTurnInput): Promise<PixiePlannerTurnResult> {
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

  let completeness = evaluatePixieCompleteness(state);
  let usage = emptyPixieUsage("openai", config.model, PIXIE_AI_PROMPT_VERSION);
  const provider = input.provider ?? createOpenAiPixieProvider();
  let providerResult: PixieModelProviderResult;

  try {
    providerResult = await provider.createPlannerTurn(
      {
        currentState: state,
        latestUserMessage: message.message,
        recentMessages: limitRecentMessages(requestParsed.data.recentMessages, config.maxRecentMessages),
        completeness,
        availableTools: getPixieModelToolDefinitions(),
        destinationScope: "walt_disney_world",
        safeContext: input.context,
      },
      { model: config.model, maxOutputTokens: config.maxOutputTokens, timeoutMs: config.modelTimeoutMs },
    );
  } catch (error) {
    const modelResult = safeFallbackModelResult("I can still help plan your trip, but I could not process that message with the planning model. Could you share your travel dates or party size?", completeness.suggestedNextQuestionKey);
    const response = buildPixiePlannerResponse({ modelResult, completeness, toolResults: [], warnings: [...warnings, error instanceof Error ? error.message : "provider_unavailable"] });
    return {
      assistantResponse: response.message,
      updatedState: state,
      completeness,
      planningStage: completeness.planningStage,
      toolResults: [],
      nextQuestionKey: response.nextQuestionKey,
      warnings: response.warnings,
      usage,
      turnId: id,
      generatedAt,
    };
  }

  usage = mergePixieUsage(usage, providerResult.usage, 0);
  const parsedModel = pixieModelTurnResultSchema.safeParse(providerResult.result);
  if (!parsedModel.success) {
    const response = buildPixiePlannerResponse({
      modelResult: safeFallbackModelResult("I understood your message, but I need to ask a cleaner follow-up before updating the plan.", completeness.suggestedNextQuestionKey),
      completeness,
      toolResults: [],
      warnings: [...warnings, "invalid_model_output"],
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
      turnId: id,
      generatedAt,
    };
  }

  const modelResult = parsedModel.data;
  warnings.push(...modelResult.warnings);

  const patchResult = applyPixieTripPatch(state, modelResult.tripPatch, { now: generatedAt });
  if (patchResult.ok) {
    state = patchResult.state;
  } else if (Object.keys(modelResult.tripPatch).length > 0) {
    warnings.push(...patchResult.errors.map((error) => `Patch rejected: ${error.message}`));
  }

  completeness = evaluatePixieCompleteness(state);

  const toolRequests = dedupePixieToolRequests(ensureImplicitTools(modelResult.requestedTools, completeness), PIXIE_AI_LIMITS.maxToolCallsPerTurn);
  const toolResults: PixieToolResult[] = [];
  for (const request of toolRequests) {
    const toolResult = await executePixieTool({ toolRequest: request, currentState: state, now: generatedAt });
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
  const response = buildPixiePlannerResponse({ modelResult, completeness, toolResults, warnings });

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
    turnId: id,
    generatedAt,
  };
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
    const result = await runPixiePlannerTurn({ ...input, now: startedAt, turnId: id });
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
