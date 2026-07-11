import { describe, expect, it } from "vitest";

import { evaluateReadyStayBudgetFit } from "@/lib/pixie/ready-stays/budget-fit";
import { makeReadyStayTrip } from "@/lib/pixie/tests/ready-stay-test-helpers";

describe("Ready Stay budget fit", () => {
  it("compares accommodation-only budget directly", () => {
    const state = makeReadyStayTrip({ budget: { amountCents: 300000, currency: "USD", budgetType: "accommodation_only" } });
    expect(evaluateReadyStayBudgetFit({ state, listingPriceCents: 290000, listingNights: 5 }).budgetStatus).toBe("within_budget");
  });

  it("compares nightly budget against listing total divided by listing nights", () => {
    const state = makeReadyStayTrip({ budget: { amountCents: 60000, currency: "USD", budgetType: "nightly" } });
    expect(evaluateReadyStayBudgetFit({ state, listingPriceCents: 300000, listingNights: 5 }).budgetStatus).toBe("within_budget");
  });

  it("does not treat total-trip budget as accommodation budget", () => {
    const state = makeReadyStayTrip({ budget: { amountCents: 500000, currency: "USD", budgetType: "total_trip" } });
    expect(evaluateReadyStayBudgetFit({ state, listingPriceCents: 300000, listingNights: 5 }).budgetStatus).toBe("cannot_evaluate");
  });

  it("returns price_unavailable when listing price is missing", () => {
    const state = makeReadyStayTrip();
    expect(evaluateReadyStayBudgetFit({ state, listingNights: 5 }).budgetStatus).toBe("price_unavailable");
  });

  it("uses deterministic near-budget tolerance with integer cents", () => {
    const state = makeReadyStayTrip({ budget: { amountCents: 300000, currency: "USD", budgetType: "accommodation_only" } });
    const result = evaluateReadyStayBudgetFit({ state, listingPriceCents: 330000, listingNights: 5 });
    expect(result.budgetStatus).toBe("near_budget");
    expect(result.differenceCents).toBe(30000);
    expect(result.percentageDifferenceBps).toBe(1000);
  });
});
