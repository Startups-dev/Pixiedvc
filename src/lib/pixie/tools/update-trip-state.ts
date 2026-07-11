import { applyPixieTripPatch } from "@/lib/pixie/planner-state";
import type { PixieToolExecutionContext } from "@/lib/pixie/ai/tool-contract";
import type { PixieTripPatch } from "@/lib/pixie/schema";

export function updateTripStateTool(input: unknown, context: PixieToolExecutionContext) {
  const { patch } = input as { patch: PixieTripPatch };
  const result = applyPixieTripPatch(context.currentState, patch, { now: context.now });
  if (!result.ok) {
    return {
      applied: false,
      errors: result.errors,
    };
  }
  return {
    applied: true,
    state: result.state,
  };
}
