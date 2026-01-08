export type DiningPlanKey = "quick" | "standard";

// Update pricing here when Disney publishes new Dining Plan rates.
export const DINING_PLAN_LABELS: Record<DiningPlanKey, string> = {
  quick: "Quick-Service Dining Plan",
  standard: "Disney Dining Plan (includes table service)",
};

export const DINING_PLAN_RATES: Record<
  DiningPlanKey,
  { adult: number; child: number }
> = {
  quick: { adult: 57.01, child: 23.83 },
  standard: { adult: 94.28, child: 29.69 },
};

export function calculateDiningTotal({
  nights,
  plan,
  adults,
  children,
}: {
  nights: number;
  plan: DiningPlanKey;
  adults: number;
  children: number;
}) {
  const rates = DINING_PLAN_RATES[plan];
  return nights * (adults * rates.adult + children * rates.child);
}
