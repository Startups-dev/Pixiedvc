import { dvcNeedsReviewRule, dvcRefreshableRule } from "@/lib/pixie/dvc/rules";
import type { DvcPointLot, DvcRuleResult } from "@/lib/pixie/dvc/types";

export function evaluateDvcPointStrategy(params: {
  requestedPoints?: number;
  pointLots: DvcPointLot[];
}): DvcRuleResult {
  const totalKnown = params.pointLots.reduce((sum, lot) => sum + lot.points, 0);
  const current = params.pointLots.filter((lot) => lot.state === "current").reduce((sum, lot) => sum + lot.points, 0);
  const banked = params.pointLots.filter((lot) => lot.state === "banked").reduce((sum, lot) => sum + lot.points, 0);
  const future = params.pointLots.filter((lot) => lot.state === "unknown").reduce((sum, lot) => sum + lot.points, 0);
  const consequences: string[] = [];
  const reasonCodes: DvcRuleResult["reasonCodes"] = [];

  if (banked > 0) {
    reasonCodes.push("USE_YEAR_UNKNOWN");
    consequences.push("Known banked points should be treated as more constrained than ordinary current points because expiration risk can matter.");
  }
  if (params.requestedPoints && current + banked < params.requestedPoints && future > 0) {
    reasonCodes.push("BORROWING_POLICY_NEEDS_VERIFICATION");
    consequences.push("Borrowing may be a possible strategy if eligible future points are available, but it should not be recommended casually when current or banked points can solve the stay.");
  }

  return {
    id: "dvc_point_strategy",
    topic: "point_strategy",
    status: params.requestedPoints && totalKnown >= params.requestedPoints ? "conditional" : "unknown",
    reasonCodes,
    factsUsed: [
      { label: "requestedPoints", value: params.requestedPoints ?? "unknown", source: params.requestedPoints ? "USER_FACT" : "ACCOUNT_GAP" },
      { label: "knownPointLots", value: params.pointLots.length, source: "TRIP_STATE_FACT" },
    ],
    missingFacts: params.requestedPoints ? [] : ["points required for the reservation"],
    consequences,
    verificationRequired: true,
    liveGaps: [],
    accountGaps: ["Actual DVC account balances and final reservation allocation require account verification."],
    provenance: dvcRefreshableRule,
  };
}

export function evaluateTransferredPoints(pointLots: DvcPointLot[]): DvcRuleResult | undefined {
  if (!pointLots.some((lot) => lot.state === "transferred")) return undefined;
  return {
    id: "dvc_transferred_points",
    topic: "transferred_points",
    status: "unknown",
    reasonCodes: ["TRANSFERRED_POINTS_NEED_ACCOUNT_VERIFICATION"],
    factsUsed: [{ label: "transferredPointsPresent", value: true, source: "TRIP_STATE_FACT" }],
    missingFacts: ["transfer-specific account restrictions"],
    consequences: ["Transferred points should not be treated as ordinary current points without account-specific verification."],
    verificationRequired: true,
    liveGaps: [],
    accountGaps: ["Transferred-point banking, borrowing, and usage details require account verification."],
    provenance: dvcNeedsReviewRule,
  };
}

export function evaluateWaitlistConcept(): DvcRuleResult {
  return {
    id: "dvc_waitlist",
    topic: "waitlist",
    status: "conditional",
    reasonCodes: ["WAITLIST_NOT_RESERVATION"],
    factsUsed: [{ label: "waitlistConcept", value: "waitlist is not a secured reservation", source: "DVC_RULE" }],
    missingFacts: ["current waitlist rules and account status"],
    consequences: ["A waitlist can be part of a strategy, but it should not replace a secure lodging fallback unless the traveler accepts that risk."],
    verificationRequired: true,
    liveGaps: ["Current waitlist status and fulfillment are live/account-specific."],
    accountGaps: ["Existing waitlists and replacement behavior require account verification."],
    provenance: dvcNeedsReviewRule,
  };
}

export function evaluateSplitStayConcept(): DvcRuleResult {
  return {
    id: "dvc_split_stay",
    topic: "split_stay",
    status: "conditional",
    reasonCodes: ["SPLIT_STAY_LOGISTICS"],
    factsUsed: [{ label: "splitStayConcept", value: true, source: "DVC_RULE" }],
    missingFacts: [],
    consequences: ["Split stays can solve availability or geography problems, but they add resort-move, luggage, and family-pacing friction."],
    verificationRequired: false,
    liveGaps: ["Actual segment availability requires live inventory."],
    accountGaps: [],
    provenance: dvcRefreshableRule,
  };
}
