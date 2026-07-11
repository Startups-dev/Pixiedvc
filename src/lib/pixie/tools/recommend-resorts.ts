import { recommendPixieResorts } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieToolExecutionContext } from "@/lib/pixie/ai/tool-contract";

export function recommendResortsTool(input: unknown, context: PixieToolExecutionContext) {
  const { topLimit } = input as { topLimit?: number };
  return recommendPixieResorts(context.currentState, {
    now: context.now,
    topLimit,
  });
}
