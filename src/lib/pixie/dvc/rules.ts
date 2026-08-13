import type { DvcRuleProvenance } from "@/lib/pixie/dvc/types";

export const dvcStableRule: DvcRuleProvenance = {
  source: "curated_hanna",
  freshness: "stable",
  status: "verified",
  verifiedAt: "2026-08-13",
};

export const dvcNeedsReviewRule: DvcRuleProvenance = {
  source: "curated_hanna",
  freshness: "needs_review",
  status: "needs_review",
  verifiedAt: "2026-08-13",
};

export const dvcRefreshableRule: DvcRuleProvenance = {
  source: "curated_hanna",
  freshness: "refreshable",
  status: "needs_review",
  verifiedAt: "2026-08-13",
};

export const DVC_RULE_NOTES = {
  homeWindow: "Home Resort priority is represented as the 11-month booking window before check-in.",
  nonHomeWindow: "Non-home DVC resort booking is represented as the 7-month booking window before check-in.",
  inventory: "Booking-window eligibility does not imply villa availability.",
  account: "Actual balances, allocations, and member-account restrictions require account-specific verification.",
  holding: "Holding risk is modeled as a cancellation-timing consequence, not as automatic point loss.",
};
