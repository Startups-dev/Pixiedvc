import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import type { PixieToolExecutionContext } from "@/lib/pixie/ai/tool-contract";

export function generatePlanOutlineTool(input: unknown, context: PixieToolExecutionContext) {
  const { focus } = input as { focus?: string };
  const state = context.currentState;
  const completeness = evaluatePixieCompleteness(state);
  const outline = [
    state.dates.arrivalDate && state.dates.departureDate
      ? `Travel window: ${state.dates.arrivalDate} to ${state.dates.departureDate}.`
      : "Travel dates still need to be clarified.",
    (state.party.totalPartySize ?? 0) > 0 ? `Party size: ${state.party.totalPartySize}.` : "Party size still needs to be clarified.",
    state.preferences.parkPriorities.length
      ? `Park priorities: ${state.preferences.parkPriorities.join(", ")}.`
      : "Park priorities can improve the plan.",
    focus ? `Current planning focus: ${focus}.` : undefined,
  ].filter((item): item is string => Boolean(item));

  return {
    outline,
    planningStage: completeness.planningStage,
    nonAuthoritative: true,
    warnings: ["Plan outlines are guidance only and do not include live Disney operating data."],
  };
}
