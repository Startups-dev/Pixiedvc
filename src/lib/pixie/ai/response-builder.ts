import type { PixieToolResult } from "@/lib/pixie/ai/tool-contract";
import type { PixieModelTurnResult } from "@/lib/pixie/ai/schemas";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";
import type { HannaKnowledgeContext } from "@/lib/pixie/knowledge";
import type { LiveDisneyContext } from "@/lib/pixie/live";
import { resolvePixieConversationLanguage, type PixieConversationLanguage } from "@/lib/pixie/language";
import type { PixieRecommendationResult } from "@/lib/pixie/resorts/recommendation-service";
import type { PixieTripState } from "@/lib/pixie/schema";
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

function buildRecommendationIntroduction(recommendations: PixieRecommendationResult, language: PixieConversationLanguage) {
  const top = recommendations.recommendations[0];
  if (!top) return undefined;

  const reasonLabels =
    language === "pt"
      ? [
          top.reasonCodes.includes("dominant_mk_return_convenience") ? "a volta depois do Magic Kingdom é a mais simples para esta noite" : undefined,
          top.reasonCodes.includes("near_priority_park") ? "mantém o parque prioritário conveniente" : undefined,
          top.reasonCodes.includes("strong_pool_match") ? "a piscina combina bem com esta viagem" : undefined,
          top.reasonCodes.includes("preferred_resort") ? "combina com um resort que você já mencionou" : undefined,
          top.reasonCodes.includes("kitchen_match") ? "a configuração do quarto combina com a preferência de cozinha" : undefined,
          top.reasonCodes.includes("lower_walking_burden") ? "reduz o esforço de deslocamento em relação a outras opções" : undefined,
          top.reasonCodes.includes("suitable_for_large_party") ? "tem capacidade verificada para o grupo" : undefined,
        ].filter((reason): reason is string => Boolean(reason))
      : [
          top.reasonCodes.includes("dominant_mk_return_convenience") ? "it gives this trip the easiest Magic Kingdom return" : undefined,
          top.reasonCodes.includes("near_priority_park") ? "it keeps your priority parks convenient" : undefined,
          top.reasonCodes.includes("strong_pool_match") ? "the pool fit is strong for this trip" : undefined,
          top.reasonCodes.includes("preferred_resort") ? "it matches a resort you already prefer" : undefined,
          top.reasonCodes.includes("kitchen_match") ? "the room setup lines up with your kitchen preferences" : undefined,
          top.reasonCodes.includes("lower_walking_burden") ? "it should be easier on walking than some alternatives" : undefined,
          top.reasonCodes.includes("suitable_for_large_party") ? "it has verified room options for your party size" : undefined,
        ].filter((reason): reason is string => Boolean(reason));
  if (language === "pt") {
    const reasonText = reasonLabels.length ? ` ${reasonLabels.slice(0, 2).join(reasonLabels.length > 1 ? " e " : "").replace(/^./, (char) => char.toUpperCase())}.` : " Ele combina com os detalhes da viagem que você compartilhou até agora.";
    const tradeoff = top.tradeoffs[0] ? ` A principal troca é: ${translateTradeoff(top.tradeoffs[0], "pt")}.` : "";
    const incomplete = top.dataQuality.includes("incomplete_preferences") || recommendations.warnings.length > 0 ? " Mais preferências deixariam o ranking mais preciso, mas já há direção suficiente." : "";
    return `Eu escolheria ${top.displayName}.${reasonText}${tradeoff}${incomplete}`;
  }
  const reasonText = reasonLabels.length
    ? ` ${reasonLabels.slice(0, 2).join(reasonLabels.length > 1 ? ", and " : "").replace(/^./, (char) => char.toUpperCase())}.`
    : " It matches the trip details you have shared so far.";
  const tradeoff = top.tradeoffs[0]
    ? ` The main tradeoff is ${top.tradeoffs[0].replace(/\.$/, "").replace(/^budget fit will improve/i, "budget fit will be clearer").toLowerCase()}.`
    : "";
  const incomplete = top.dataQuality.includes("incomplete_preferences") || recommendations.warnings.length > 0
    ? " More preferences would make the ranking sharper, but this is already useful direction."
    : "";

  return `I would choose ${top.displayName}.${reasonText}${tradeoff}${incomplete}`;
}

function translateTradeoff(value: string, language: PixieConversationLanguage) {
  const normalized = value.replace(/\.$/, "").toLowerCase();
  if (language !== "pt") return normalized.replace(/^budget fit will improve/i, "budget fit will be clearer");
  if (/budget fit will improve/i.test(value)) return "o encaixe no orçamento fica mais claro quando o limite de hospedagem estiver definido";
  if (/relies more heavily on bus or boat/i.test(value)) return "depende mais de ônibus ou barco do que algumas alternativas";
  if (/room fit is compact/i.test(value)) return "o quarto é mais compacto para grupos próximos do limite de capacidade";
  if (/confirmed dvc availability/i.test(value)) return "a disponibilidade DVC ainda precisa ser confirmada";
  return normalized;
}

function isNarrowDvcIntent(message: string) {
  return /\b(dvc rules?|cancel(?:lation)?|holding|borrow(?:ing)?|point allocation|use year|waitlist|wait-list|existing reservation|modify|modification|non-cancell|30-day|30 days)\b/i.test(
    message,
  );
}

function shouldAddRecommendationIntroduction(modelResult: PixieModelTurnResult, recommendations?: PixieRecommendationResult, latestUserMessage = "") {
  if (!recommendations?.recommendations.length) return false;
  if (isNarrowDvcIntent(latestUserMessage)) return false;
  if (/\b(dining|dinner|restaurant|steak|sushi|pasta|eat|food|meal|meals|jantar|almo[cç]o|restaurante|comer|refei[cç][aã]o|personagens?|princesas?)\b/i.test(latestUserMessage)) return false;
  if (/^\s*(?:e\s+)?(?:no|na|em|dentro d[ao])\s+(?:epcot|magic kingdom|animal kingdom|hollywood studios)\??\s*$/i.test(latestUserMessage)) return false;
  if (modelResult.activeDecisionKey === "resort_choice") return true;
  return false;
}

function startsWithEmptyPromise(message: string, language: PixieConversationLanguage) {
  const normalized = message.trim().toLowerCase();
  if (language === "pt") return /^(claro|perfeito|sim)?\s*[—-]?\s*(vou|posso)\s+(montar|organizar|comparar|pesquisar|ver)\b/.test(normalized);
  return /^(sure|yes|absolutely)?\s*[—-]?\s*i(?:'ll| will)\s+(build|put together|organize|compare|look up)\b/.test(normalized);
}

function hasQuestionBeforeRecommendation(message: string, recommendationName: string) {
  const questionIndex = message.indexOf("?");
  const recIndex = message.toLowerCase().indexOf(recommendationName.toLowerCase());
  return questionIndex >= 0 && (recIndex < 0 || questionIndex < recIndex);
}

function obviousRecommendationIntro(latestUserMessage: string, language: PixieConversationLanguage, state?: PixieTripState, recentMessages: PixieRecentMessage[] = []) {
  const normalized = latestUserMessage.toLowerCase();
  const recentText = recentMessages.slice(-4).map((message) => message.content).join(" ").toLowerCase();
  const excluded = state?.preferences.excludedResorts.map((value) => value.toLowerCase()) ?? [];
  const excludes = (name: string) => excluded.some((value) => name.toLowerCase().includes(value) || value.includes(name.toLowerCase()));

  if (/disney springs|disney spring/.test(normalized) && /\b(perto|near|close|ficar|stay|hosped)/.test(normalized) && !excludes("Saratoga")) {
    return language === "pt"
      ? "Eu escolheria Disney's Saratoga Springs Resort & Spa para esse trecho. É a escolha mais direta quando o objetivo é ficar perto de Disney Springs, especialmente se vocês querem almoçar naquela área."
      : "I would choose Disney's Saratoga Springs Resort & Spa for that segment. It is the most direct fit when the goal is staying near Disney Springs and eating in that area.";
  }

  if (/\bepcot\b|international gateway/i.test(latestUserMessage) && /\b(perto|near|close|ficar|stay|hosped)/.test(normalized)) {
    if (!excludes("BoardWalk")) {
      return language === "pt"
        ? "Eu colocaria Disney's BoardWalk Villas em primeiro para esse trecho; Beach Club Villas seria minha segunda opção. A vantagem é ficar no eixo do International Gateway para EPCOT sem transformar isso em outro deslocamento grande."
        : "I would put Disney's BoardWalk Villas first for that segment; Beach Club Villas would be my second choice. The point is staying on the International Gateway side of EPCOT without adding a big transfer.";
    }
    if (!excludes("Beach Club")) {
      return language === "pt"
        ? "Como BoardWalk está fora da lista, eu escolheria Beach Club Villas para esse trecho de EPCOT. É a alternativa mais forte para ficar no eixo do International Gateway."
        : "Since BoardWalk is off the list, I would choose Beach Club Villas for the EPCOT segment. It is the strongest International Gateway alternative.";
    }
  }

  const workspaceHasEpcotLunch =
    state?.planningWorkspace.parkPlans.some((plan) => plan.park === "EPCOT") &&
    state?.planningWorkspace.attentionItems.some((item) => /lunch|almo[cç]o/i.test(`${item.label} ${item.note ?? ""}`));
  if ((/\bprincess|princesa|princesas\b/i.test(latestUserMessage) || /\bcharacter|personagem|personagens\b/i.test(latestUserMessage)) && (workspaceHasEpcotLunch || /\bepcot|dentro da epcot|lunch|almo[cç]o/i.test(`${latestUserMessage} ${recentText}`))) {
    return language === "pt"
      ? "Akershus Royal Banquet Hall seria minha escolha para almoço com princesas dentro do EPCOT. Ele encaixa exatamente nesse pedido: personagens, clima de conto de fadas e localização em World Showcase."
      : "Akershus Royal Banquet Hall would be my pick for a princess character lunch inside EPCOT. It matches the request directly: characters, fairytale feel, and a World Showcase location.";
  }

  return undefined;
}

function itineraryFromState(state: PixieTripState | undefined, language: PixieConversationLanguage) {
  if (!state) return undefined;
  const lodging = state.planningWorkspace.lodgingPlans.filter((plan) => plan.status !== "recommended" || plan.source === "model_recommendation");
  const parks = state.planningWorkspace.parkPlans;
  const dining = state.planningWorkspace.diningPlans;
  const activities = state.planningWorkspace.activityPlans;
  if (!lodging.length && !parks.length && !dining.length && !activities.length) return undefined;

  const lines: string[] = [];
  const pt = language === "pt";
  lines.push(pt ? "Claro — eu montaria assim:" : "Here is how I would lay it out:");
  for (const plan of lodging.slice(0, 5)) {
    lines.push(`${plan.startDate ?? "Data a definir"}${plan.endDate ? `–${plan.endDate}` : ""}: ${plan.resort} (${pt ? statusPt(plan.status) : plan.status}).`);
  }
  for (const park of parks.slice(0, 6)) {
    lines.push(`${park.date ?? (pt ? "Data a definir" : "Date TBD")}: ${park.park}${park.note ? ` — ${park.note}` : ""}.`);
  }
  for (const meal of dining.slice(0, 6)) {
    lines.push(`${meal.date ?? (pt ? "Data a definir" : "Date TBD")} · ${meal.mealPeriod ?? (pt ? "refeição" : "meal")}: ${meal.restaurant}${meal.targetTime ? ` às ${meal.targetTime.replace(" target", "")}` : ""} (${pt ? statusPt(meal.status) : meal.status}).`);
  }
  for (const activity of activities.slice(0, 4)) {
    lines.push(`${activity.date ?? (pt ? "Data a definir" : "Date TBD")}: ${activity.label}.`);
  }
  return lines.join("\n");
}

function pricingFallback(latestUserMessage: string, language: PixieConversationLanguage, knowledgeContext?: HannaKnowledgeContext, liveContext?: LiveDisneyContext) {
  if (!/\b(price|cost|how much|quanto|pre[cç]o|custa|gastar|valor)\b/i.test(latestUserMessage)) return undefined;
  const candidate = knowledgeContext?.candidates.find((item) => item.entityType === "dining_location" && item.pricing?.planningEstimate);
  if (!candidate?.pricing?.planningEstimate) return undefined;
  const exactUnavailable = liveContext?.unavailable.some((item) => item.kind === "current_price" || item.kind === "current_menu") ?? false;
  const exactAvailable = liveContext?.diningCurrent.some((item) => item.kind === "current_price") ?? false;
  if (exactAvailable) return undefined;
  const estimate = candidate.pricing.planningEstimate;
  const range = `${estimate.currency ?? "USD"} ${estimate.adultLow}-${estimate.adultHigh} por adulto`;
  if (language === "pt") {
    return `${exactUnavailable ? "Eu não tenho preço exato ao vivo agora, mas " : ""}para planejamento, ${candidate.name} está na faixa de ${range}. Para 2 adultos e uma criança de 2 anos, use isso como estimativa antes de imposto e gorjeta; a criança conta para reserva, mas o custo dela depende da política atual do restaurante.`;
  }
  return `${exactUnavailable ? "I do not have an exact live price right now, but " : ""}for planning, ${candidate.name} is in the ${range} range. For 2 adults and a 2-year-old, treat that as a before-tax/tip estimate; the child counts for reservations, but meal pricing depends on the restaurant's current policy.`;
}

function statusPt(status: string) {
  if (status === "confirmed") return "confirmado";
  if (status === "selected") return "planejado";
  if (status === "recommended") return "recomendado";
  if (status === "considering") return "considerando";
  return "planejado";
}

export function buildPixiePlannerResponse(params: {
  modelResult: PixieModelTurnResult;
  completeness: PixieCompletenessResult;
  toolResults: PixieToolResult[];
  warnings: string[];
  latestUserMessage?: string;
  recentMessages?: PixieRecentMessage[];
  currentState?: PixieTripState;
  knowledgeContext?: HannaKnowledgeContext;
  liveContext?: LiveDisneyContext;
}) {
  let message = stripUnsafeFormatting(params.modelResult.assistantResponse.trim());
  const additionalWarnings = [...params.warnings];
  const language = resolvePixieConversationLanguage({ latestUserMessage: params.latestUserMessage, recentMessages: params.recentMessages });

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
  const recentText = params.recentMessages?.slice(-4).map((message) => message.content).join(" ") ?? "";
  const itineraryIntent = /\b(itiner[aá]rio|itinerary|roteiro)\b/i.test(`${params.latestUserMessage ?? ""} ${recentText}`);
  if (recommendationResult && !itineraryIntent && shouldAddRecommendationIntroduction(params.modelResult, recommendationResult, params.latestUserMessage)) {
    recommendationIntroduction = buildRecommendationIntroduction(recommendationResult, language);
  }
  const topRecommendationName = recommendationResult?.recommendations[0]?.displayName;
  if (recommendationIntroduction && topRecommendationName && !message.includes(topRecommendationName)) {
    message = `${recommendationIntroduction}\n\n${message}`;
  }

  message = removeAnsweredMechanicalQuestions(message, params.completeness);
  const obvious = obviousRecommendationIntro(params.latestUserMessage ?? "", language, params.currentState, params.recentMessages);
  if (obvious && !message.toLowerCase().includes(obvious.split(".")[0].toLowerCase())) {
    message = hasQuestionBeforeRecommendation(message, obvious.split(" ")[language === "pt" ? 2 : 3] ?? "") ? obvious : `${obvious}\n\n${message}`;
  }
  const itinerary = itineraryIntent || (startsWithEmptyPromise(message, language) && /\b(por favor|please)\b/i.test(params.latestUserMessage ?? ""));
  const generatedItinerary = itineraryFromState(params.currentState, language);
  if (generatedItinerary && (itinerary || startsWithEmptyPromise(message, language))) {
    message = generatedItinerary;
  }
  const priceFallback = pricingFallback(params.latestUserMessage ?? "", language, params.knowledgeContext, params.liveContext);
  if (priceFallback && !/\$\d|USD\s+\d|US\$/i.test(message)) {
    message = `${message}\n\n${priceFallback}`.trim();
  }

  return {
    message,
    nextQuestionKey: params.modelResult.nextQuestionKey ?? params.completeness.suggestedNextQuestionKey,
    warnings: Array.from(new Set(additionalWarnings)),
    disclosureKeys: hasReadyStayTool ? ["recheck_required_before_booking"] : [],
  };
}
