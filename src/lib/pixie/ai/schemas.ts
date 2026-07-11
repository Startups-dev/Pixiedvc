import { z } from "zod";

import { PIXIE_QUESTION_KEYS } from "@/lib/pixie/constants";
import { pixieTripPatchSchema } from "@/lib/pixie/schema";

export const PIXIE_AI_PROMPT_VERSION = "2026-07-11.phase4";
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

export const PIXIE_TOOL_NAMES = [
  "get_planner_status",
  "apply_trip_patch",
  "recommend_resorts",
  "find_ready_stays",
  "generate_plan_outline",
] as const;

export const pixiePlanningIntentSchema = z.enum(PIXIE_PLANNING_INTENTS);
export const pixieToolNameSchema = z.enum(PIXIE_TOOL_NAMES);

export const pixieAiToolRequestSchema = z
  .object({
    name: pixieToolNameSchema,
    input: z.record(z.unknown()).default({}),
    requestId: z.string().trim().min(1).max(120).optional(),
    reason: z.string().trim().max(300).optional(),
  })
  .strict();

export const pixieModelTurnResultSchema = z
  .object({
    assistantResponse: z.string().trim().min(1).max(3000),
    tripPatch: pixieTripPatchSchema.default({}),
    requestedTools: z.array(pixieAiToolRequestSchema).max(5).default([]),
    nextQuestionKey: z.enum(PIXIE_QUESTION_KEYS).optional(),
    planningIntent: pixiePlanningIntentSchema,
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
export type PixieToolName = z.infer<typeof pixieToolNameSchema>;
export type PixieAiToolRequest = z.infer<typeof pixieAiToolRequestSchema>;
export type PixieModelTurnResult = z.infer<typeof pixieModelTurnResultSchema>;
export type PixieRecentMessage = z.infer<typeof pixieRecentMessageSchema>;
export type PixieProviderUsage = z.infer<typeof pixieProviderUsageSchema>;
export type PixiePlannerTurnRequest = z.infer<typeof pixiePlannerTurnRequestSchema>;

