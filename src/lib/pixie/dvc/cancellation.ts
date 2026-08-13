import { compareDateOnly } from "@/lib/pixie/dvc/booking-windows";
import { dvcNeedsReviewRule, dvcStableRule } from "@/lib/pixie/dvc/rules";
import type { DvcCancellationInput, DvcRuleResult } from "@/lib/pixie/dvc/types";

function daysBetween(start: string, end: string) {
  const startMs = Date.parse(`${start}T00:00:00.000Z`);
  const endMs = Date.parse(`${end}T00:00:00.000Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return undefined;
  return Math.round((endMs - startMs) / 86_400_000);
}

export function evaluateDvcCancellation(input: DvcCancellationInput): DvcRuleResult {
  const factsUsed: DvcRuleResult["factsUsed"] = [{ label: "cancellationDate", value: input.cancellationDate, source: "USER_FACT" }];
  const missingFacts: string[] = [];
  const reasonCodes: DvcRuleResult["reasonCodes"] = [];
  const consequences: string[] = [];
  const knownConsequences: string[] = [];
  const uncertainConsequences: string[] = [];
  const accountGaps: string[] = [];

  if (input.checkInDate) factsUsed.push({ label: "checkInDate", value: input.checkInDate, source: "USER_FACT" });
  else missingFacts.push("check-in date");

  const daysBefore = input.checkInDate ? daysBetween(input.cancellationDate, input.checkInDate) : undefined;
  if (daysBefore !== undefined) factsUsed.push({ label: "daysBeforeCheckIn", value: daysBefore, source: "DETERMINISTIC_RESULT" });
  const holdingRisk = daysBefore !== undefined && daysBefore >= 0 && daysBefore < 31;

  if (holdingRisk) {
    reasonCodes.push("HOLDING_RISK");
    knownConsequences.push("At this cancellation timing, returned points generally go into Holding rather than behaving like ordinary reusable points.");
    uncertainConsequences.push("Holding does not mean the points are simply lost, but exact downstream use restrictions and expiration impact should be verified against the current policy and the point lots involved.");
  } else if (input.checkInDate && compareDateOnly(input.cancellationDate, input.checkInDate) <= 0) {
    knownConsequences.push("This appears to be outside the modeled Holding-risk timing.");
    uncertainConsequences.push("The actual point outcome still depends on what points were used.");
  }

  if (input.allocationKnown === false || !input.pointLots?.length) {
    reasonCodes.push("CANCELLATION_ALLOCATION_UNKNOWN");
    accountGaps.push("Exact reservation point allocation is account-specific and not known.");
    uncertainConsequences.push("Do not cancel until the reservation's actual point allocation is known, especially if banked, borrowed, transferred, or expiring points may be involved.");
  }
  consequences.push(...knownConsequences, ...uncertainConsequences);

  return {
    id: "dvc_cancellation",
    topic: "cancellation",
    status: holdingRisk ? "conditional" : "unknown",
    reasonCodes,
    factsUsed,
    missingFacts,
    consequences,
    knownConsequences,
    uncertainConsequences,
    verificationRequired: true,
    liveGaps: [],
    accountGaps,
    provenance: dvcStableRule,
  };
}

export function evaluateDvcModificationRisk(): DvcRuleResult {
  return {
    id: "dvc_modification",
    topic: "modification",
    status: "unknown",
    reasonCodes: ["MODIFICATION_BEHAVIOR_ACCOUNT_SPECIFIC"],
    factsUsed: [{ label: "modificationVsCancellation", value: true, source: "DVC_RULE" }],
    missingFacts: ["exact reservation details", "current Disney/DVC system behavior for the transaction"],
    consequences: [
      "Modification and cancel/rebook can have different practical consequences, but Hara should not claim modification always protects points.",
      "Before cancelling and rebooking, verify whether the change can be made as a modification and which points are tied to the existing reservation.",
    ],
    verificationRequired: true,
    liveGaps: [],
    accountGaps: ["Reservation-specific point allocation and modifiability require account verification."],
    provenance: dvcNeedsReviewRule,
  };
}
