import type { PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import type { PixieModelTurnResult } from "@/lib/pixie/ai/schemas";
import type { PixieCompletenessResult } from "@/lib/pixie/types";

const unsafeAvailabilityPattern = /\b(confirmed available|guaranteed available|locked|reserved|booked)\b/i;

export function buildPixiePlannerResponse(params: {
  modelResult: PixieModelTurnResult;
  completeness: PixieCompletenessResult;
  toolResults: PixieToolResult[];
  warnings: string[];
}) {
  let message = params.modelResult.assistantResponse.trim();
  const additionalWarnings = [...params.warnings];

  if (unsafeAvailabilityPattern.test(message)) {
    message = message.replace(unsafeAvailabilityPattern, "available to review");
    additionalWarnings.push("unsafe_model_claim: availability language was softened because Ready Stays require recheck before booking.");
  }

  const hasReadyStayTool = params.toolResults.some((result) => result.toolName === "find_ready_stays" && result.ok);
  if (hasReadyStayTool && !/recheck|may change|before booking/i.test(message)) {
    additionalWarnings.push("Ready Stay inventory and price must be rechecked before booking.");
  }

  return {
    message,
    nextQuestionKey: params.modelResult.nextQuestionKey ?? params.completeness.suggestedNextQuestionKey,
    warnings: Array.from(new Set(additionalWarnings)),
    disclosureKeys: hasReadyStayTool ? ["recheck_required_before_booking"] : [],
  };
}

