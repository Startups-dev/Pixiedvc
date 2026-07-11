import { matchPixieReadyStays } from "@/lib/pixie/ready-stays/matching-service";
import type { PixieToolExecutionContext } from "@/lib/pixie/ai/tool-contract";

export async function findReadyStaysTool(input: unknown, context: PixieToolExecutionContext) {
  const { limit } = input as { limit?: number };
  return matchPixieReadyStays({
    tripState: context.currentState,
    now: context.now,
    limit,
  });
}
