import { z } from "zod";

import { PIXIE_QUESTION_KEYS } from "@/lib/pixie/constants";
import { pixieTripPatchSchema } from "@/lib/pixie/schema";

export const PIXIE_AI_PROMPT_VERSION = "2026-07-15.concierge-personality";
export const PIXIE_AI_PROVIDER_VERSION = "2026-07-11.phase4.fetch-responses";

export const PIXIE_PLANNING_INTENTS = [
  "collect_information",
  "clarify_information",
  "update_trip",
  "recommend_resorts",
  "find_ready_stays",
  "explain_recommendation",
  "revise_plan",
  "prepare_booking_handoff",
  "general_disney_planning",
  "unsupported_request",
] as const;

export const PIXIE_CONVERSATION_MODES = [
  "discovery",
  "clarification",
  "recommendation",
  "refinement",
  "general_guidance",
  "return_to_plan",
  "celebration",
  "decision_support",
] as const;

export const PIXIE_ACTIVE_DECISION_KEYS = [
  "dates",
  "party",
  "budget",
  "trip_priorities",
  "pace",
  "park_days",
  "resort_choice",
  "room_type",
  "ready_stay",
  "dining_style",
  "adult_evening",
  "none",
] as const;

export const PIXIE_DELIGHT_MOMENT_KEYS = [
  "first_trip",
  "halloween",
  "christmas",
  "birthday",
  "anniversary",
  "strong_resort_match",
  "ready_stay_exact_match",
  "celebration",
  "none",
] as const;

export const PIXIE_TOOL_NAMES = [
  "get_planner_status",
  "apply_trip_patch",
  "recommend_resorts",
  "find_ready_stays",
  "generate_plan_outline",
] as const;

export const pixiePlanningIntentSchema = z.enum(PIXIE_PLANNING_INTENTS);
export const pixieConversationModeSchema = z.enum(PIXIE_CONVERSATION_MODES);
export const pixieActiveDecisionKeySchema = z.enum(PIXIE_ACTIVE_DECISION_KEYS);
export const pixieDelightMomentKeySchema = z.enum(PIXIE_DELIGHT_MOMENT_KEYS);
export const pixieToolNameSchema = z.enum(PIXIE_TOOL_NAMES);

function removeNullPatchFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeNullPatchFields);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== null && entry !== undefined)
      .map(([key, entry]) => [key, removeNullPatchFields(entry)]),
  );
}

export const pixieAiToolRequestSchema = z
  .object({
    name: pixieToolNameSchema,
    input: z.record(z.unknown()).default({}),
    requestId: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    reason: z
      .string()
      .trim()
      .max(300)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
  })
  .strict();

export const pixieModelTurnResultSchema = z
  .object({
    assistantResponse: z.string().trim().min(1).max(3000),
    tripPatch: z.preprocess(removeNullPatchFields, pixieTripPatchSchema).default({}),
    requestedTools: z.array(pixieAiToolRequestSchema).max(5).default([]),
    nextQuestionKey: z
      .enum(PIXIE_QUESTION_KEYS)
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    planningIntent: pixiePlanningIntentSchema,
    conversationMode: pixieConversationModeSchema
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    activeDecisionKey: pixieActiveDecisionKeySchema
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    delightMomentKey: pixieDelightMomentKeySchema
      .nullable()
      .optional()
      .transform((value) => value ?? undefined),
    confidence: z.number().min(0).max(1).default(0.5),
    warnings: z.array(z.string().trim().min(1).max(300)).max(10).default([]),
  })
  .strict();

export const pixieRecentMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1000),
  })
  .strict();

export const pixieProviderUsageSchema = z
  .object({
    provider: z.string().trim().min(1),
    model: z.string().trim().min(1),
    promptVersion: z.string().trim().min(1),
    inputTokens: z.number().int().min(0).optional(),
    outputTokens: z.number().int().min(0).optional(),
    cachedInputTokens: z.number().int().min(0).optional(),
    totalTokens: z.number().int().min(0).optional(),
    estimatedCostCents: z.number().int().min(0).optional(),
    durationMs: z.number().int().min(0).optional(),
  })
  .strict();

export const pixiePlannerTurnRequestSchema = z
  .object({
    message: z.string().trim().min(1),
    recentMessages: z.array(pixieRecentMessageSchema).default([]),
    context: z
      .object({
        requestId: z.string().trim().max(120).optional(),
        sessionId: z.string().trim().max(120).optional(),
        userId: z.string().trim().max(120).optional(),
        ipHash: z.string().trim().max(120).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type PixiePlanningIntent = z.infer<typeof pixiePlanningIntentSchema>;
export type PixieConversationMode = z.infer<typeof pixieConversationModeSchema>;
export type PixieActiveDecisionKey = z.infer<typeof pixieActiveDecisionKeySchema>;
export type PixieDelightMomentKey = z.infer<typeof pixieDelightMomentKeySchema>;
export type PixieToolName = z.infer<typeof pixieToolNameSchema>;
export type PixieAiToolRequest = z.infer<typeof pixieAiToolRequestSchema>;
export type PixieModelTurnResult = z.infer<typeof pixieModelTurnResultSchema>;
export type PixieRecentMessage = z.infer<typeof pixieRecentMessageSchema>;
export type PixieProviderUsage = z.infer<typeof pixieProviderUsageSchema>;
export type PixiePlannerTurnRequest = z.infer<typeof pixiePlannerTurnRequestSchema>;
