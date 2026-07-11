import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieReadyStayListingSourceRow } from "@/lib/pixie/ready-stays/types";

export function makeReadyStayTrip(overrides: Partial<PixieTripState> = {}) {
  const base = createEmptyPixieTripState("2026-07-11T12:00:00.000Z");
  return normalizePixieTripState(
    {
      ...base,
      dates: {
        ...base.dates,
        arrivalDate: "2026-10-10",
        departureDate: "2026-10-15",
        flexibleDates: false,
      },
      party: {
        ...base.party,
        adults: 2,
        children: 2,
      },
      preferences: {
        ...base.preferences,
        preferredResorts: ["Riviera"],
        resortPriorities: ["skyliner"],
        roomPreferences: ["studio"],
      },
      budget: {
        amountCents: 350000,
        currency: "USD",
        budgetType: "accommodation_only",
      },
      ...overrides,
    },
    { now: "2026-07-11T12:00:00.000Z", preserveUpdatedAt: true },
  );
}

export function makeReadyStayRow(overrides: Partial<PixieReadyStayListingSourceRow> = {}): PixieReadyStayListingSourceRow {
  return {
    id: "ready-1",
    resort_id: "resort-rva",
    check_in: "2026-10-10",
    check_out: "2026-10-15",
    points: 120,
    room_type: "Deluxe Studio",
    season_type: "standard",
    guest_price_per_point_cents: 2500,
    original_guest_price_per_point_cents: null,
    price_reduced_at: null,
    sleeps: 4,
    status: "active",
    is_test_listing: false,
    is_visible_publicly: false,
    test_guest_total_cents: null,
    slug: "ready-1",
    title: "Riviera Ready Stay",
    image_url: "https://example.com/riviera.jpg",
    href: null,
    expires_at: null,
    locked_until: null,
    verification_status: "approved",
    updated_at: "2026-07-11T12:00:00.000Z",
    resorts: {
      name: "Disney's Riviera Resort",
      slug: "riviera-resort",
      calculator_code: "RVA",
    },
    ...overrides,
  };
}
