import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieResortId } from "@/lib/pixie/resorts/types";

export type DvcRuleFreshness = "stable" | "refreshable" | "needs_review";
export type DvcFactSource = "USER_FACT" | "TRIP_STATE_FACT" | "DVC_RULE" | "DETERMINISTIC_RESULT" | "INFERENCE" | "LIVE_GAP" | "ACCOUNT_GAP" | "NEEDS_VERIFICATION";
export type DvcRuleStatus = "eligible" | "ineligible" | "conditional" | "unknown";
export type DvcBookingWindowStatus = "not_open" | "home_resort_window" | "seven_month_window" | "already_open";
export type DvcAcquisitionType = "direct" | "resale" | "unknown";
export type DvcPointState = "current" | "banked" | "borrowed" | "transferred" | "holding" | "unknown";
export type DvcUseYearMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type DvcRuleProvenance = {
  source: "curated_hanna";
  freshness: DvcRuleFreshness;
  status: "verified" | "needs_review";
  verifiedAt?: string;
};

export type DvcReasonCode =
  | "HOME_RESORT"
  | "NON_HOME_RESORT"
  | "BOOKING_WINDOW_NOT_OPEN"
  | "HOME_WINDOW_OPEN"
  | "SEVEN_MONTH_WINDOW_OPEN"
  | "LIVE_INVENTORY_REQUIRED"
  | "ACCOUNT_BALANCE_REQUIRED"
  | "HOME_RESORT_UNKNOWN"
  | "CONTRACT_TYPE_UNKNOWN"
  | "RESALE_RESTRICTION"
  | "RESTRICTED_RESORT"
  | "ACQUISITION_DATE_OR_RULE_UNKNOWN"
  | "USE_YEAR_UNKNOWN"
  | "BANKING_RULE_NEEDS_VERIFICATION"
  | "BORROWING_POLICY_NEEDS_VERIFICATION"
  | "TRANSFERRED_POINTS_NEED_ACCOUNT_VERIFICATION"
  | "HOLDING_RISK"
  | "CANCELLATION_ALLOCATION_UNKNOWN"
  | "MODIFICATION_BEHAVIOR_ACCOUNT_SPECIFIC"
  | "WAITLIST_NOT_RESERVATION"
  | "SPLIT_STAY_LOGISTICS";

export type DvcFact = {
  label: string;
  value?: string | number | boolean;
  source: DvcFactSource;
};

export type DvcRuleResult = {
  id: string;
  topic: DvcIntentTopic;
  status: DvcRuleStatus;
  reasonCodes: DvcReasonCode[];
  factsUsed: DvcFact[];
  missingFacts: string[];
  consequences: string[];
  verificationRequired: boolean;
  liveGaps: string[];
  accountGaps: string[];
  provenance: DvcRuleProvenance;
};

export type DvcContractContext = {
  id: string;
  homeResortId?: PixieResortId;
  homeResortName?: string;
  acquisitionType: DvcAcquisitionType;
  useYearMonth?: DvcUseYearMonth;
  points?: number;
  source: DvcFactSource;
  notes?: string;
};

export type DvcPointLot = {
  id: string;
  state: DvcPointState;
  points: number;
  useYearMonth?: DvcUseYearMonth;
  expirationDate?: string;
  contractId?: string;
  source: DvcFactSource;
  notes?: string;
};

export type DvcCancellationInput = {
  checkInDate?: string;
  cancellationDate: string;
  pointLots?: DvcPointLot[];
  allocationKnown?: boolean;
};

export type DvcIntentTopic =
  | "booking_window"
  | "home_resort"
  | "resale_eligibility"
  | "use_year"
  | "banking"
  | "borrowing"
  | "transferred_points"
  | "holding"
  | "cancellation"
  | "modification"
  | "point_strategy"
  | "waitlist"
  | "split_stay"
  | "inventory"
  | "account_balance";

export type DvcIntent = {
  topics: DvcIntentTopic[];
  targetResortId?: PixieResortId;
  targetResortName?: string;
  checkInDate?: string;
  cancellationDate?: string;
  requestedPoints?: number;
};

export type DvcContext = {
  source: "pixie_dvc_rules_v1";
  intents: DvcIntentTopic[];
  contracts: DvcContractContext[];
  pointLots: DvcPointLot[];
  results: DvcRuleResult[];
  liveGaps: string[];
  accountGaps: string[];
};

export type DvcContextBuilderInput = {
  latestUserMessage: string;
  currentState: PixieTripState;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  now?: string;
  maxResults?: number;
};
