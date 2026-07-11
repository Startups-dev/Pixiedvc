import type { PixieTripState } from "@/lib/pixie/schema";
import type { PixieReadyStayBudgetFit } from "@/lib/pixie/ready-stays/types";

export const PIXIE_READY_STAY_NEAR_BUDGET_TOLERANCE_BPS = 1000;

function makeCannotEvaluate(state: PixieTripState, listingPriceCents?: number): PixieReadyStayBudgetFit {
  return {
    budgetStatus: "cannot_evaluate",
    budgetContext: state.budget.budgetType,
    budgetAmountCents: state.budget.amountCents,
    listingPriceCents,
    explanationCode: "budget_context_incompatible",
  };
}

export function evaluateReadyStayBudgetFit(params: {
  state: PixieTripState;
  listingPriceCents?: number;
  listingNights: number;
}): PixieReadyStayBudgetFit {
  const price = params.listingPriceCents;
  if (!Number.isFinite(price) || !price || price <= 0) {
    return {
      budgetStatus: "price_unavailable",
      budgetContext: params.state.budget.budgetType,
      budgetAmountCents: params.state.budget.amountCents,
      explanationCode: "listing_price_unavailable",
    };
  }

  const budget = params.state.budget.amountCents;
  if (!Number.isFinite(budget) || budget === undefined) return makeCannotEvaluate(params.state, price);

  let compatibleBudgetCents: number | undefined;
  if (params.state.budget.budgetType === "accommodation_only") {
    compatibleBudgetCents = budget;
  } else if (params.state.budget.budgetType === "nightly") {
    if (!Number.isFinite(params.listingNights) || params.listingNights <= 0) return makeCannotEvaluate(params.state, price);
    compatibleBudgetCents = budget * params.listingNights;
  } else {
    return makeCannotEvaluate(params.state, price);
  }

  const differenceCents = price - compatibleBudgetCents;
  const percentageDifferenceBps = compatibleBudgetCents > 0 ? Math.round((differenceCents * 10000) / compatibleBudgetCents) : undefined;
  if (differenceCents <= 0) {
    return {
      budgetStatus: "within_budget",
      budgetContext: params.state.budget.budgetType,
      budgetAmountCents: budget,
      listingPriceCents: price,
      differenceCents,
      percentageDifferenceBps,
      explanationCode: "within_accommodation_budget",
    };
  }

  const status = (percentageDifferenceBps ?? Number.POSITIVE_INFINITY) <= PIXIE_READY_STAY_NEAR_BUDGET_TOLERANCE_BPS ? "near_budget" : "over_budget";
  return {
    budgetStatus: status,
    budgetContext: params.state.budget.budgetType,
    budgetAmountCents: budget,
    listingPriceCents: price,
    differenceCents,
    percentageDifferenceBps,
    explanationCode: status === "near_budget" ? "near_accommodation_budget" : "over_accommodation_budget",
  };
}
