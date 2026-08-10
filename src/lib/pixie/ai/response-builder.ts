import type { PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import type { PixieModelTurnResult } from "@/lib/pixie/ai/schemas";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieCompletenessResult } from "@/lib/pixie/types";

const unsafeAvailabilityPattern = /\b(confirmed available|guaranteed available|locked|reserved|booked)\b/i;
const markdownPattern = /(\*\*|__|^#{1,6}\s+|^\s*[-*]\s+)/m;

function stripUnsafeFormatting(message: string) {
  return message
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function removeAnsweredMechanicalQuestions(message: string, completeness: PixieCompletenessResult) {
  const sentences = message.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [message];
  const filtered = sentences.filter((sentence) => {
    const normalized = sentence.toLowerCase();
    if (completeness.suggestedNextQuestionKey !== "ask_dates" && /\b(when|date|dates|travel)\b/.test(normalized) && sentence.includes("?")) return false;
    if (completeness.suggestedNextQuestionKey !== "ask_party" && /\b(who|traveling|travelling|party|adults|children|kids)\b/.test(normalized) && sentence.includes("?")) return false;
    if (completeness.suggestedNextQuestionKey !== "ask_budget_context" && /\b(budget|spend|nightly|accommodation)\b/.test(normalized) && sentence.includes("?")) return false;
    return true;
  });
  return (filtered.length ? filtered : sentences).join(" ").replace(/\s+/g, " ").trim();
}

function asRecommendationResult(toolResult: PixieToolResult): PixieRecommendationResult | undefined {
  if (!toolResult.ok || toolResult.toolName !== "recommend_resorts") return undefined;
  const result = toolResult.result as PixieRecommendationResult;
  return Array.isArray(result.recommendations) ? result : undefined;
}

function buildRecommendationIntroduction(recommendations: PixieRecommendationResult) {
  const top = recommendations.recommendations[0];
  if (!top) return undefined;

  const reasonLabels = [
    top.reasonCodes.includes("near_priority_park") ? "it keeps your priority parks convenient" : undefined,
    top.reasonCodes.includes("strong_pool_match") ? "the pool fit is strong for this trip" : undefined,
    top.reasonCodes.includes("preferred_resort") ? "it matches a resort you already prefer" : undefined,
    top.reasonCodes.includes("kitchen_match") ? "the room setup lines up with your kitchen preferences" : undefined,
    top.reasonCodes.includes("lower_walking_burden") ? "it should be easier on walking than some alternatives" : undefined,
    top.reasonCodes.includes("suitable_for_large_party") ? "it has verified room options for your party size" : undefined,
  ].filter((reason): reason is string => Boolean(reason));
  const reasonText = reasonLabels.length
    ? ` ${reasonLabels.slice(0, 2).join(reasonLabels.length > 1 ? ", and " : "").replace(/^./, (char) => char.toUpperCase())}.`
    : " It matches the trip details you have shared so far.";
  const tradeoff = top.tradeoffs[0]
    ? ` The main tradeoff is ${top.tradeoffs[0].replace(/\.$/, "").replace(/^budget fit will improve/i, "budget fit will be clearer").toLowerCase()}.`
    : "";
  const incomplete = top.dataQuality.includes("incomplete_preferences") || recommendations.warnings.length > 0
    ? " More preferences would make the ranking sharper, but this is already useful direction."
    : "";

  return `I have ${recommendations.recommendations.length} resort ${recommendations.recommendations.length === 1 ? "option" : "options"} worth considering, and ${top.displayName} is the strongest fit right now.${reasonText}${tradeoff}${incomplete}`;
}

function isNarrowDvcIntent(message: string) {
  return /\b(dvc rules?|cancel(?:lation)?|holding|borrow(?:ing)?|point allocation|use year|waitlist|wait-list|existing reservation|modify|modification|non-cancell|30-day|30 days)\b/i.test(
    message,
  );
}

function shouldAddRecommendationIntroduction(modelResult: PixieModelTurnResult, recommendations?: PixieRecommendationResult, latestUserMessage = "") {
  if (!recommendations?.recommendations.length) return false;
  if (isNarrowDvcIntent(latestUserMessage)) return false;
  if (/\b(dining|dinner|restaurant|steak|sushi|pasta|eat|food|meal|meals)\b/i.test(latestUserMessage)) return false;
  if (modelResult.activeDecisionKey === "resort_choice") return true;
  return false;
}

export function buildPixiePlannerResponse(params: {
  modelResult: PixieModelTurnResult;
  completeness: PixieCompletenessResult;
  toolResults: PixieToolResult[];
  warnings: string[];
  latestUserMessage?: string;
}) {
  let message = stripUnsafeFormatting(params.modelResult.assistantResponse.trim());
  const additionalWarnings = [...params.warnings];

  if (markdownPattern.test(params.modelResult.assistantResponse)) {
    additionalWarnings.push("assistant_formatting_normalized: markdown markers were removed for the current plain-text renderer.");
  }

  if (unsafeAvailabilityPattern.test(message)) {
    message = message.replace(unsafeAvailabilityPattern, "available to review");
    additionalWarnings.push("unsafe_model_claim: availability language was softened because Ready Stays require recheck before booking.");
  }

  if (isNarrowDvcIntent(params.latestUserMessage ?? "") && /^I have \d+ resort options? worth considering\b/i.test(message)) {
    const [, ...rest] = message.split(/\n{2,}/);
    if (rest.length) {
      message = rest.join("\n\n").trim();
      additionalWarnings.push("immediate_intent_guard: generic resort ranking intro was removed for a narrow DVC question.");
    }
  }

  const hasReadyStayTool = params.toolResults.some((result) => result.toolName === "find_ready_stays" && result.ok);
  if (hasReadyStayTool && !/recheck|may change|before booking/i.test(message)) {
    additionalWarnings.push("Ready Stay inventory and price must be rechecked before booking.");
  }

  const recommendationResult = params.toolResults.map(asRecommendationResult).find((result): result is PixieRecommendationResult => Boolean(result));
  let recommendationIntroduction: string | undefined;
  if (recommendationResult && shouldAddRecommendationIntroduction(params.modelResult, recommendationResult, params.latestUserMessage)) {
    recommendationIntroduction = buildRecommendationIntroduction(recommendationResult);
  }
  const topRecommendationName = recommendationResult?.recommendations[0]?.displayName;
  if (recommendationIntroduction && topRecommendationName && !message.includes(topRecommendationName)) {
    message = `${recommendationIntroduction}\n\n${message}`;
  }

  message = removeAnsweredMechanicalQuestions(message, params.completeness);

  return {
    message,
    nextQuestionKey: params.modelResult.nextQuestionKey ?? params.completeness.suggestedNextQuestionKey,
    warnings: Array.from(new Set(additionalWarnings)),
    disclosureKeys: hasReadyStayTool ? ["recheck_required_before_booking"] : [],
  };
}
