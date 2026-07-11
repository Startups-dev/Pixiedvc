import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import type { PixieToolExecutionContext } from "@/lib/pixie/ai/tool-contract";

export function getPlannerStatusTool(_input: unknown, context: PixieToolExecutionContext) {
  const completeness = evaluatePixieCompleteness(context.currentState);
  return {
    completeness,
    planningStage: completeness.planningStage,
    missingRequired: completeness.missingRequired,
    missingRecommended: completeness.missingRecommended,
    suggestedNextQuestionKey: completeness.suggestedNextQuestionKey,
  };
}

