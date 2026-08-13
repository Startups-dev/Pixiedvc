import { evaluateDvcBookingWindow } from "@/lib/pixie/dvc/booking-windows";
import { dvcNeedsReviewRule, dvcStableRule } from "@/lib/pixie/dvc/rules";
import type { DvcContractContext, DvcRuleResult } from "@/lib/pixie/dvc/types";
import type { PixieResortId } from "@/lib/pixie/resorts/types";

const RESALE_RESTRICTED_TARGETS: PixieResortId[] = ["rva"];

export function evaluateDvcResortEligibility(params: {
  contract?: DvcContractContext;
  targetResortId?: PixieResortId;
  targetResortName?: string;
  checkInDate?: string;
  asOfDate: string;
}): DvcRuleResult {
  const factsUsed: DvcRuleResult["factsUsed"] = [];
  const missingFacts: string[] = [];
  const reasonCodes: DvcRuleResult["reasonCodes"] = [];
  const consequences: string[] = [];
  const liveGaps = ["Actual DVC villa inventory is live and not known from rules."];
  const accountGaps: string[] = [];
  const targetName = params.targetResortName ?? params.targetResortId ?? "the target resort";
  const isHomeResort = Boolean(params.contract?.homeResortId && params.targetResortId && params.contract.homeResortId === params.targetResortId);

  if (params.targetResortId) factsUsed.push({ label: "targetResort", value: params.targetResortId, source: "USER_FACT" });
  else missingFacts.push("target resort");
  if (params.checkInDate) factsUsed.push({ label: "checkInDate", value: params.checkInDate, source: "USER_FACT" });
  else missingFacts.push("check-in date");

  if (!params.contract) {
    missingFacts.push("eligible DVC contract or ownership context");
    reasonCodes.push("HOME_RESORT_UNKNOWN", "CONTRACT_TYPE_UNKNOWN");
    consequences.push("Hara can explain the 11-month and 7-month windows, but cannot determine whether this is your Home Resort without ownership context.");
    return {
      id: "dvc_resort_eligibility",
      topic: "booking_window",
      status: "unknown",
      reasonCodes,
      factsUsed,
      missingFacts,
      consequences,
      verificationRequired: true,
      liveGaps,
      accountGaps,
      provenance: dvcStableRule,
    };
  }

  factsUsed.push({ label: "contractHomeResort", value: params.contract.homeResortId ?? "unknown", source: params.contract.source });
  factsUsed.push({ label: "contractAcquisitionType", value: params.contract.acquisitionType, source: params.contract.source });
  if (isHomeResort) reasonCodes.push("HOME_RESORT");
  else reasonCodes.push("NON_HOME_RESORT");

  if (params.contract.acquisitionType === "unknown") {
    reasonCodes.push("CONTRACT_TYPE_UNKNOWN");
    accountGaps.push("Contract acquisition type is needed to evaluate resale restrictions.");
  }

  if (params.contract.acquisitionType === "resale" && params.targetResortId && RESALE_RESTRICTED_TARGETS.includes(params.targetResortId) && !isHomeResort) {
    reasonCodes.push("RESALE_RESTRICTION", "RESTRICTED_RESORT", "ACQUISITION_DATE_OR_RULE_UNKNOWN");
    consequences.push(`${targetName} may be affected by resale/restricted-resort rules for this contract; do not assume these points can book it without verification.`);
    return {
      id: "dvc_resort_eligibility",
      topic: "resale_eligibility",
      status: "unknown",
      reasonCodes,
      factsUsed,
      missingFacts: [...missingFacts, "authoritative resale restriction applicability for this contract"],
      consequences,
      verificationRequired: true,
      liveGaps,
      accountGaps,
      provenance: dvcNeedsReviewRule,
    };
  }

  const window = params.checkInDate
    ? evaluateDvcBookingWindow({ checkInDate: params.checkInDate, asOfDate: params.asOfDate, isHomeResort })
    : undefined;
  if (window) {
    factsUsed.push({ label: "homeOpenDate", value: window.homeOpenDate, source: "DVC_RULE" });
    factsUsed.push({ label: "nonHomeOpenDate", value: window.nonHomeOpenDate, source: "DVC_RULE" });
    if (window.status === "not_open") {
      reasonCodes.push("BOOKING_WINDOW_NOT_OPEN");
      consequences.push(`${targetName} cannot be booked yet under the applicable DVC booking window. Planning can continue, but securing the reservation has to wait until ${window.applicableOpenDate}.`);
    } else if (window.status === "home_resort_window") {
      reasonCodes.push("HOME_WINDOW_OPEN");
      consequences.push(`${targetName} is in the Home Resort priority window for this contract; non-home resort assumptions should not be applied.`);
    } else {
      reasonCodes.push("SEVEN_MONTH_WINDOW_OPEN");
      reasonCodes.push("LIVE_INVENTORY_REQUIRED");
      consequences.push(`${targetName} is inside the 7-month DVC booking window for eligible non-home booking, but actual availability still requires a live check.`);
    }
  }

  return {
    id: "dvc_resort_eligibility",
    topic: "booking_window",
    status: window?.status === "not_open" ? "ineligible" : "eligible",
    reasonCodes,
    factsUsed,
    missingFacts,
    consequences,
    verificationRequired: accountGaps.length > 0,
    liveGaps,
    accountGaps,
    provenance: dvcStableRule,
  };
}
