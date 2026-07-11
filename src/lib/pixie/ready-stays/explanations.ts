import type { PixieReadyStayReasonCode } from "@/lib/pixie/ready-stays/types";

export const PIXIE_READY_STAY_EXPLANATIONS: Record<PixieReadyStayReasonCode, string> = {
  exact_dates: "Listing dates exactly match the requested trip.",
  within_flexible_dates: "Listing dates are within the declared flexibility window.",
  same_trip_length: "Listing length matches the requested trip length.",
  requires_date_shift: "This option requires changing trip dates.",
  requires_length_change: "This option has a different trip length.",
  partial_overlap_only: "This listing overlaps the requested dates but does not satisfy the full stay.",
  full_stay_satisfied: "The listing satisfies the full requested stay.",
  preferred_resort: "The listing is at a preferred resort.",
  selected_resort: "The listing matches the selected resort.",
  preferred_room_type: "The listing room type matches a room preference.",
  preferred_sub_property: "The listing matches a preferred AKV building.",
  capacity_verified: "Sleeping capacity is explicitly listed and fits the party.",
  spare_capacity: "The listing has extra sleeping capacity.",
  within_accommodation_budget: "Listing price is within the compatible accommodation budget.",
  near_accommodation_budget: "Listing price is near the compatible accommodation budget.",
  over_accommodation_budget: "Listing price is above the compatible accommodation budget.",
  budget_context_incompatible: "Budget context cannot be compared safely to a Ready Stay listing price.",
  listing_price_verified: "Ready Stay listing price comes from the public listing.",
  listing_price_unavailable: "Listing price could not be verified.",
  public_visible_listing: "The listing passed public Ready Stay visibility rules.",
  visible_test_listing: "This is a visible test listing.",
  inventory_may_change: "Inventory and price may change before booking.",
  stale_listing_warning: "The listing must be rechecked before any booking action.",
  unknown_room_mapping: "Room category mapping is not fully verified.",
  unknown_sub_property: "AKV building is not verified from listing data.",
  user_excluded_resort: "The user excluded this resort.",
  insufficient_capacity: "The listing does not sleep the full party.",
  malformed_listing: "The listing is missing required matching data.",
  unsupported_resort_identifier: "The listing resort could not be mapped to Pixie v1 WDW resorts.",
};

export function explanationFragmentsForReadyStay(codes: PixieReadyStayReasonCode[]) {
  return Array.from(new Set(codes)).map((code) => PIXIE_READY_STAY_EXPLANATIONS[code]);
}
