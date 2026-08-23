import type { PixieBudgetType } from "@/lib/pixie/types";
import type { PixieRoomTypeId, PixieResortId } from "@/lib/pixie/resorts/types";

export type PixieReadyStaySubProperty = "kidani" | "jambo" | "unknown";

export type PixieReadyStayListingSourceRow = {
  id: string;
  resort_id?: string | null;
  check_in: string;
  check_out: string;
  points: number | null;
  room_type: string | null;
  season_type?: string | null;
  guest_price_per_point_cents: number | null;
  original_guest_price_per_point_cents?: number | null;
  price_reduced_at?: string | null;
  sleeps: number | null;
  status: string | null;
  is_test_listing?: boolean | null;
  is_visible_publicly?: boolean | null;
  test_guest_total_cents?: number | null;
  slug?: string | null;
  title?: string | null;
  image_url?: string | null;
  href?: string | null;
  expires_at?: string | null;
  locked_until?: string | null;
  verification_status?: string | null;
  updated_at?: string | null;
  owner?: {
    lifecycle_status?: string | null;
    owners?: Array<{ lifecycle_status?: string | null }> | { lifecycle_status?: string | null } | null;
  } | null;
  resorts?: {
    name?: string | null;
    slug?: string | null;
    calculator_code?: string | null;
  } | null;
};

export type PixieReadyStayListingWarning =
  | "visible_test_listing"
  | "inventory_may_change"
  | "recheck_required_before_booking"
  | "unknown_room_mapping"
  | "unknown_sub_property"
  | "listing_price_unavailable";

export type PixieReadyStayListing = {
  listingId: string;
  resortId: PixieResortId;
  canonicalResortSlug: string;
  displayResortName: string;
  subProperty: PixieReadyStaySubProperty;
  roomTypeId?: PixieRoomTypeId;
  roomDisplayName: string;
  arrivalDate: string;
  departureDate: string;
  numberOfNights: number;
  sleeps: number;
  points: number;
  listingPriceCents?: number;
  ratePerPointCents?: number;
  currency: "USD";
  status: string;
  visibilityStatus: "public_visible";
  bookingPath: string;
  imageReference?: string;
  isTestListing: boolean;
  sourceUpdatedAt?: string;
  warnings: PixieReadyStayListingWarning[];
};

export type PixieReadyStayAdapterErrorCode =
  | "malformed_listing"
  | "malformed_dates"
  | "missing_capacity"
  | "missing_price"
  | "unsupported_resort_identifier"
  | "ambiguous_resort_identifier"
  | "private_listing";

export type PixieReadyStayAdapterResult =
  | { ok: true; listing: PixieReadyStayListing }
  | { ok: false; code: PixieReadyStayAdapterErrorCode; listingId?: string; message: string };

export type PixieReadyStayMatchClassification =
  | "exact_match"
  | "flexible_date_match"
  | "near_date_match"
  | "partial_overlap"
  | "resort_preference_match"
  | "budget_match"
  | "no_match";

export type PixieReadyStayDateMatch = {
  classification: PixieReadyStayMatchClassification;
  arrivalDifferenceDays?: number;
  departureDifferenceDays?: number;
  listingNights: number;
  requestedNights?: number;
  overlapNights: number;
  withinFlexibility: boolean;
  sameDuration: boolean;
  satisfiesFullStay: boolean;
  satisfiesDates: boolean;
  requiresDateChange: boolean;
  requiresLengthChange: boolean;
  partialStayOnly: boolean;
  reasonCodes: PixieReadyStayReasonCode[];
  warnings: string[];
};

export type PixieReadyStayCapacityMatch = {
  capacityStatus: "fits" | "insufficient" | "unknown";
  requiredCapacity: number;
  listingCapacity?: number;
  fitsParty: boolean;
  spareCapacity?: number;
  confidence: "verified" | "missing";
  warnings: string[];
};

export type PixieReadyStayBudgetStatus =
  | "within_budget"
  | "near_budget"
  | "over_budget"
  | "cannot_evaluate"
  | "price_unavailable";

export type PixieReadyStayBudgetFit = {
  budgetStatus: PixieReadyStayBudgetStatus;
  budgetContext: PixieBudgetType;
  budgetAmountCents?: number;
  listingPriceCents?: number;
  differenceCents?: number;
  percentageDifferenceBps?: number;
  explanationCode: PixieReadyStayReasonCode;
};

export type PixieReadyStayReasonCode =
  | "exact_dates"
  | "within_flexible_dates"
  | "same_trip_length"
  | "requires_date_shift"
  | "requires_length_change"
  | "partial_overlap_only"
  | "full_stay_satisfied"
  | "preferred_resort"
  | "selected_resort"
  | "preferred_room_type"
  | "preferred_sub_property"
  | "capacity_verified"
  | "spare_capacity"
  | "within_accommodation_budget"
  | "near_accommodation_budget"
  | "over_accommodation_budget"
  | "budget_context_incompatible"
  | "listing_price_verified"
  | "listing_price_unavailable"
  | "public_visible_listing"
  | "visible_test_listing"
  | "inventory_may_change"
  | "stale_listing_warning"
  | "unknown_room_mapping"
  | "unknown_sub_property"
  | "user_excluded_resort"
  | "insufficient_capacity"
  | "malformed_listing"
  | "unsupported_resort_identifier";

export type PixieReadyStayDataQuality = "complete" | "partial" | "price_unavailable" | "room_mapping_unknown";

export type PixieReadyStayMatch = {
  matchId: string;
  listingId: string;
  classification: PixieReadyStayMatchClassification;
  rank: number;
  score: number;
  resortId: PixieResortId;
  resortSlug: string;
  resortDisplayName: string;
  subProperty: PixieReadyStaySubProperty;
  roomTypeId?: PixieRoomTypeId;
  roomDisplayName: string;
  arrivalDate: string;
  departureDate: string;
  numberOfNights: number;
  sleeps: number;
  points: number;
  listingPrice?: {
    pricingContext: "ready_stay_listing_price";
    totalCents: number;
    ratePerPointCents?: number;
    currency: "USD";
    estimateStatus: "listing_price";
    source: string;
    sourceVersion: string;
  };
  dateMatch: PixieReadyStayDateMatch;
  capacityMatch: PixieReadyStayCapacityMatch;
  budgetFit: PixieReadyStayBudgetFit;
  reasonCodes: PixieReadyStayReasonCode[];
  explanationFragments: string[];
  warnings: string[];
  dataQuality: PixieReadyStayDataQuality;
  inventoryStatus: "available_to_view" | "recheck_required_before_booking";
  bookingPath: string;
  imageReference?: string;
  sourceUpdatedAt?: string;
  isTestListing: boolean;
};

export type PixieReadyStayExcludedListing = {
  listingId?: string;
  code: PixieReadyStayAdapterErrorCode | PixieReadyStayReasonCode | "not_ready";
  message: string;
};

export type PixieReadyStayMatchResult = {
  matches: PixieReadyStayMatch[];
  groups: {
    exact: PixieReadyStayMatch[];
    flexible: PixieReadyStayMatch[];
    alternatives: PixieReadyStayMatch[];
  };
  excludedListings: PixieReadyStayExcludedListing[];
  warnings: string[];
  inputSummary: {
    arrivalDate?: string;
    departureDate?: string;
    numberOfNights?: number;
    partySize: number;
    flexibleDates: boolean;
  };
  readiness: {
    ready: boolean;
    warnings: string[];
  };
  generatedAt: string;
  matchingVersion: string;
  pricingSource: string;
  visibilitySource: string;
  inventoryDisclaimerKey: "recheck_required_before_booking";
};
