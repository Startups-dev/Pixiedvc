import { evaluateDvcCancellation, evaluateDvcModificationRisk } from "@/lib/pixie/dvc/cancellation";
import { evaluateDvcResortEligibility } from "@/lib/pixie/dvc/eligibility";
import { evaluateDvcPointStrategy, evaluateSplitStayConcept, evaluateTransferredPoints, evaluateWaitlistConcept } from "@/lib/pixie/dvc/point-strategy";
import { dvcNeedsReviewRule, dvcStableRule } from "@/lib/pixie/dvc/rules";
import type { DvcContext, DvcContextBuilderInput, DvcContractContext, DvcIntent, DvcIntentTopic, DvcPointLot, DvcRuleResult, DvcUseYearMonth } from "@/lib/pixie/dvc/types";
import { bankingDeadlineForUseYear, parseUseYearMonth, pointExpirationDateForUseYear, useYearEndForDate, useYearStartForDate } from "@/lib/pixie/dvc/use-year";
import { resolvePixieResortId } from "@/lib/pixie/resorts/identifiers";

function normalizeText(value: string) {
  return value.toLowerCase().replace(/&/g, " and ").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function hasAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

function addTopic(topics: Set<DvcIntentTopic>, topic: DvcIntentTopic) {
  topics.add(topic);
}

function extractDate(message: string, now: string) {
  const monthNames = "january|february|march|april|may|june|july|august|september|october|november|december";
  const months: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const normalized = normalizeText(message);
  const iso = normalized.match(/\b(20\d{2}) (\d{1,2}) (\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const named = normalized.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:\\s+(20\\d{2}))?\\b`));
  if (!named) return undefined;
  const year = named[3] ?? now.slice(0, 4);
  return `${year}-${months[named[1]]}-${named[2].padStart(2, "0")}`;
}

function extractRequestedPoints(message: string) {
  const normalized = normalizeText(message);
  const match = normalized.match(/\bneed\s+(\d{1,4})\b/) ?? normalized.match(/\brequires?\s+(\d{1,4})\b/);
  return match ? Number(match[1]) : undefined;
}

function resolveResortFromText(message: string) {
  const direct = resolvePixieResortId(message.trim());
  if (direct.ok) return direct.resort;
  const candidates = ["BoardWalk Villas", "Beach Club Villas", "Saratoga Springs", "Riviera Resort", "Bay Lake Tower", "Grand Floridian Villas", "Polynesian Villas", "Animal Kingdom Villas", "Old Key West", "Copper Creek Villas", "Boulder Ridge Villas"];
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate).replace(/ villas$/, "").replace(/ springs$/, "");
    if (!normalizeText(message).includes(normalizedCandidate)) continue;
    const resolved = resolvePixieResortId(candidate);
    if (resolved.ok) return resolved.resort;
  }
  return undefined;
}

function targetResortFromText(message: string) {
  const targetMatch = /\b(?:want|book|switch to|get|reserve|target)\s+([a-zA-Z'’\s]+?)(?:\.|,|$|\s+for|\s+on|\s+with|\s+but|\s+and|\s+at)/i.exec(message);
  if (targetMatch?.[1]) {
    const resolved = resolveResortFromText(targetMatch[1]);
    if (resolved) return resolved;
  }
  if (normalizeText(message).includes("riviera")) {
    const riviera = resolvePixieResortId("Riviera Resort");
    if (riviera.ok) return riviera.resort;
  }
  return resolveResortFromText(message);
}

function explicitOwnedResort(message: string) {
  const ownershipMatch = /(?:i|we)\s+(?:own|have a contract|have points)(?:\s+(?:at|for))?\s+([a-zA-Z'’\s]+?)(?:\.|,|$|\s+but|\s+and|\s+with)/i.exec(message);
  if (!ownershipMatch?.[1]) return undefined;
  const resolved = resolveResortFromText(ownershipMatch[1]);
  return resolved;
}

export function detectDvcIntent(message: string, now = new Date().toISOString()): DvcIntent {
  const normalized = normalizeText(message);
  const topics = new Set<DvcIntentTopic>();
  if (hasAny(normalized, ["dvc", "home resort", "book home", "home then switch", "11 months", "7 months", "book this resort", "booking window", "when can i book", "can i book", "book boardwalk", "book beach club", "book riviera"])) addTopic(topics, "booking_window");
  if (hasAny(normalized, ["home resort", "own at", "contract"])) addTopic(topics, "home_resort");
  if (hasAny(normalized, ["resale", "direct", "riviera resale", "restricted"])) addTopic(topics, "resale_eligibility");
  if (hasAny(normalized, ["use year", "expiration", "expire", "banking deadline"])) addTopic(topics, "use_year");
  if (hasAny(normalized, ["bank", "banked", "banking"])) addTopic(topics, "banking");
  if (hasAny(normalized, ["borrow", "borrowing", "borrowed"])) addTopic(topics, "borrowing");
  if (hasAny(normalized, ["transfer", "transferred"])) addTopic(topics, "transferred_points");
  if (hasAny(normalized, ["holding"])) addTopic(topics, "holding");
  if (hasAny(normalized, ["cancel", "cancellation"])) addTopic(topics, "cancellation");
  if (hasAny(normalized, ["modify", "modification", "change reservation", "cancel and rebook", "cancel rebook"])) addTopic(topics, "modification");
  if (hasAny(normalized, ["which points", "use first", "need", "options", "current points", "future points"])) addTopic(topics, "point_strategy");
  if (hasAny(normalized, ["waitlist", "wait list"])) addTopic(topics, "waitlist");
  if (hasAny(normalized, ["split stay", "split-stay", "part of the stay"])) addTopic(topics, "split_stay");
  if (hasAny(normalized, ["available", "availability", "can i get", "studio for"])) addTopic(topics, "inventory");
  if (hasAny(normalized, ["how many banked", "how many points", "my balance", "account balance"])) addTopic(topics, "account_balance");

  const resort = targetResortFromText(message);
  return {
    topics: [...topics],
    targetResortId: resort?.id,
    targetResortName: resort?.shortName,
    checkInDate: extractDate(message, now),
    cancellationDate: hasAny(normalized, ["today", "tonight"]) ? now.slice(0, 10) : undefined,
    requestedPoints: extractRequestedPoints(message),
  };
}

function asUseYearMonth(value: number | undefined, fallback?: DvcUseYearMonth): DvcUseYearMonth | undefined {
  return value && value >= 1 && value <= 12 ? (value as DvcUseYearMonth) : fallback;
}

function contractsFromState(input: DvcContextBuilderInput, useYearMonth?: DvcUseYearMonth): DvcContractContext[] {
  const contracts: DvcContractContext[] = [];
  for (const contract of input.currentState.dvcContext.contracts) {
    const resolved = contract.homeResort ? resolvePixieResortId(contract.homeResort) : undefined;
    contracts.push({
      id: contract.id,
      homeResortId: resolved?.ok ? resolved.resort.id : undefined,
      homeResortName: resolved?.ok ? resolved.resort.shortName : contract.homeResort,
      acquisitionType: contract.acquisitionType,
      useYearMonth: asUseYearMonth(contract.useYearMonth, useYearMonth),
      points: contract.points,
      source: contract.source === "user_provided" ? "TRIP_STATE_FACT" : "INFERENCE",
      notes: contract.notes,
    });
  }
  const explicitOwner = explicitOwnedResort(input.latestUserMessage);
  const normalized = normalizeText(input.latestUserMessage);
  const acquisitionType = normalized.includes("resale") ? "resale" : normalized.includes("direct") ? "direct" : "unknown";
  if (explicitOwner && !contracts.some((contract) => contract.homeResortId === explicitOwner.id)) {
    contracts.push({
      id: `contract_${explicitOwner.id}`,
      homeResortId: explicitOwner.id,
      homeResortName: explicitOwner.shortName,
      acquisitionType,
      useYearMonth,
      source: "USER_FACT",
    });
  }
  const stateHome = input.currentState.dvcContext.homeResort ? resolvePixieResortId(input.currentState.dvcContext.homeResort) : undefined;
  if (stateHome?.ok && !contracts.some((contract) => contract.homeResortId === stateHome.resort.id)) {
    contracts.push({
      id: `contract_${stateHome.resort.id}`,
      homeResortId: stateHome.resort.id,
      homeResortName: stateHome.resort.shortName,
      acquisitionType: "unknown",
      useYearMonth,
      source: "TRIP_STATE_FACT",
    });
  }
  return contracts.slice(0, 4);
}

function pointLotsFromState(input: DvcContextBuilderInput, useYearMonth?: DvcUseYearMonth): DvcPointLot[] {
  const dvc = input.currentState.dvcContext;
  const structuredLots = dvc.pointLots.map((lot): DvcPointLot => ({
    id: lot.id,
    state: lot.state,
    points: lot.points,
    useYearMonth: asUseYearMonth(lot.useYearMonth, useYearMonth),
    expirationDate: lot.expirationDate,
    contractId: lot.contractId,
    source: lot.source === "user_provided" ? "TRIP_STATE_FACT" : "INFERENCE",
    notes: lot.notes,
  }));
  return [
    ...structuredLots,
    dvc.currentUseYearPoints ? { id: "current_points", state: "current" as const, points: dvc.currentUseYearPoints.points, useYearMonth, source: "TRIP_STATE_FACT" as const } : undefined,
    dvc.bankedPoints ? { id: "banked_points", state: "banked" as const, points: dvc.bankedPoints.points, useYearMonth, source: "TRIP_STATE_FACT" as const } : undefined,
    dvc.borrowedPoints ? { id: "borrowed_points", state: "borrowed" as const, points: dvc.borrowedPoints.points, useYearMonth, source: "TRIP_STATE_FACT" as const } : undefined,
    dvc.transferredPoints ? { id: "transferred_points", state: "transferred" as const, points: dvc.transferredPoints.points, useYearMonth, source: "TRIP_STATE_FACT" as const } : undefined,
    dvc.nextUseYearPoints ? { id: "future_points", state: "unknown" as const, points: dvc.nextUseYearPoints.points, useYearMonth, source: "TRIP_STATE_FACT" as const, notes: "Future points may be borrowable only when rules and account facts support it." } : undefined,
  ].filter((lot): lot is DvcPointLot => Boolean(lot));
}

function useYearResult(stayDate: string | undefined, useYearMonth: DvcUseYearMonth | undefined): DvcRuleResult {
  const missingFacts: string[] = [];
  if (!stayDate) missingFacts.push("stay date");
  if (!useYearMonth) missingFacts.push("Use Year month");
  const start = stayDate && useYearMonth ? useYearStartForDate(stayDate, useYearMonth) : undefined;
  const end = stayDate && useYearMonth ? useYearEndForDate(stayDate, useYearMonth) : undefined;
  const expiration = stayDate && useYearMonth ? pointExpirationDateForUseYear(stayDate, useYearMonth) : undefined;
  const bankingDeadline = stayDate && useYearMonth ? bankingDeadlineForUseYear(stayDate, useYearMonth) : undefined;
  return {
    id: "dvc_use_year",
    topic: "use_year",
    status: start && end ? "eligible" : "unknown",
    reasonCodes: useYearMonth ? [] : ["USE_YEAR_UNKNOWN"],
    factsUsed: [
      { label: "stayDate", value: stayDate ?? "unknown", source: stayDate ? "USER_FACT" : "ACCOUNT_GAP" },
      { label: "useYearMonth", value: useYearMonth ?? "unknown", source: useYearMonth ? "TRIP_STATE_FACT" : "ACCOUNT_GAP" },
      ...(start ? [{ label: "useYearStart", value: start, source: "DETERMINISTIC_RESULT" as const }] : []),
      ...(end ? [{ label: "useYearEnd", value: end, source: "DETERMINISTIC_RESULT" as const }] : []),
      ...(expiration ? [{ label: "pointExpirationBoundary", value: expiration, source: "DETERMINISTIC_RESULT" as const }] : []),
      ...(bankingDeadline ? [{ label: "modeledBankingDeadline", value: bankingDeadline, source: "NEEDS_VERIFICATION" as const }] : []),
    ],
    missingFacts,
    consequences: ["Use Year is not the same as calendar year; it controls which point lifecycle the trip falls into."],
    verificationRequired: true,
    liveGaps: [],
    accountGaps: missingFacts,
    provenance: dvcNeedsReviewRule,
  };
}

export function buildDvcContext(input: DvcContextBuilderInput): DvcContext {
  const now = input.now ?? new Date().toISOString();
  const intent = detectDvcIntent(input.latestUserMessage, now);
  if (intent.topics.length === 0) {
    return { source: "pixie_dvc_rules_v1", intents: [], contracts: [], pointLots: [], results: [], liveGaps: [], accountGaps: [] };
  }
  const useYearMonth = parseUseYearMonth(input.currentState.dvcContext.useYear);
  const contracts = contractsFromState(input, useYearMonth);
  const pointLots = pointLotsFromState(input, useYearMonth);
  const results: DvcRuleResult[] = [];
  const asOfDate = now.slice(0, 10);

  if (intent.topics.some((topic) => ["booking_window", "home_resort", "resale_eligibility", "inventory"].includes(topic))) {
    results.push(evaluateDvcResortEligibility({ contract: contracts[0], targetResortId: intent.targetResortId, targetResortName: intent.targetResortName, checkInDate: intent.checkInDate ?? input.currentState.dates.arrivalDate, asOfDate }));
  }
  if (intent.topics.includes("use_year") || intent.topics.includes("banking")) results.push(useYearResult(intent.checkInDate ?? input.currentState.dates.arrivalDate, useYearMonth));
  if (intent.topics.includes("cancellation") || intent.topics.includes("holding")) {
    results.push(evaluateDvcCancellation({ checkInDate: intent.checkInDate ?? input.currentState.dates.arrivalDate, cancellationDate: intent.cancellationDate ?? asOfDate, pointLots, allocationKnown: pointLots.length > 0 }));
  }
  if (intent.topics.includes("modification")) results.push(evaluateDvcModificationRisk());
  if (intent.topics.some((topic) => ["point_strategy", "borrowing", "banking"].includes(topic))) results.push(evaluateDvcPointStrategy({ requestedPoints: intent.requestedPoints, pointLots }));
  const transfer = evaluateTransferredPoints(pointLots);
  if (transfer && intent.topics.includes("transferred_points")) results.push(transfer);
  if (intent.topics.includes("waitlist")) results.push(evaluateWaitlistConcept());
  if (intent.topics.includes("split_stay")) results.push(evaluateSplitStayConcept());
  if (intent.topics.includes("account_balance")) {
    results.push({
      id: "dvc_account_balance",
      topic: "account_balance",
      status: "unknown",
      reasonCodes: ["ACCOUNT_BALANCE_REQUIRED"],
      factsUsed: [],
      missingFacts: ["member account balance"],
      consequences: ["Hara cannot know actual banked/current/borrowed/transferred point balances without account access or user-provided facts."],
      verificationRequired: true,
      liveGaps: [],
      accountGaps: ["Actual DVC point balances require account-specific access."],
      provenance: dvcStableRule,
    });
  }

  const boundedResults = results.slice(0, input.maxResults ?? 4);
  return {
    source: "pixie_dvc_rules_v1",
    intents: intent.topics,
    contracts,
    pointLots,
    results: boundedResults,
    liveGaps: [...new Set(boundedResults.flatMap((result) => result.liveGaps))].slice(0, 4),
    accountGaps: [...new Set(boundedResults.flatMap((result) => result.accountGaps))].slice(0, 4),
  };
}
