import { z } from "zod";

import { pixieTripPatchSchema } from "@/lib/pixie/schema";
import { pixieAiToolRequestSchema, pixieToolNameSchema, type PixieToolName } from "@/lib/pixie/ai/schemas";

export const getPlannerStatusInputSchema = z.object({}).strict();
export const applyTripPatchInputSchema = z.object({ patch: pixieTripPatchSchema }).strict();
export const recommendResortsInputSchema = z.object({ topLimit: z.number().int().min(1).max(5).optional() }).strict();
export const findReadyStaysInputSchema = z.object({ limit: z.number().int().min(1).max(10).optional() }).strict();
export const generatePlanOutlineInputSchema = z.object({ focus: z.string().trim().max(120).optional() }).strict();

export const pixieToolSuccessSchema = z
  .object({
    ok: z.literal(true),
    toolName: pixieToolNameSchema,
    result: z.unknown(),
    durationMs: z.number().int().min(0),
    trusted: z.literal(true),
  })
  .strict();

export const pixieToolErrorSchema = z
  .object({
    ok: z.literal(false),
    toolName: pixieToolNameSchema,
    errorCode: z.string().trim().min(1),
    message: z.string().trim().min(1),
    durationMs: z.number().int().min(0),
    trusted: z.literal(true),
  })
  .strict();

export const pixieToolResultSchema = z.discriminatedUnion("ok", [pixieToolSuccessSchema, pixieToolErrorSchema]);

export type PixieToolInputByName = {
  get_planner_status: z.infer<typeof getPlannerStatusInputSchema>;
  apply_trip_patch: z.infer<typeof applyTripPatchInputSchema>;
  recommend_resorts: z.infer<typeof recommendResortsInputSchema>;
  find_ready_stays: z.infer<typeof findReadyStaysInputSchema>;
  generate_plan_outline: z.infer<typeof generatePlanOutlineInputSchema>;
};

export type PixieToolResult = z.infer<typeof pixieToolResultSchema>;

export type PixieRegisteredTool = {
  name: PixieToolName;
  description: string;
  readOnly: boolean;
  confirmationRequired: boolean;
  timeoutMs: number;
  inputSchema: z.ZodTypeAny;
  execute: (input: unknown, context: PixieToolExecutionContext) => Promise<unknown> | unknown;
};

export type PixieToolExecutionContext = {
  currentState: import("@/lib/pixie/schema").PixieTripState;
  now?: string;
};

export function parsePixieToolRequest(input: unknown) {
  return pixieAiToolRequestSchema.safeParse(input);
}

