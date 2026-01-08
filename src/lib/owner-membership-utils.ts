export type ResortOption = {
  id: string;
  name: string;
  calculator_code: string | null;
};

export type PointsDeltaInput = {
  pointsOwned: number;
  pointsAvailable: number;
  delta: number;
};

export function applyPointsDelta(input: PointsDeltaInput) {
  if (!Number.isFinite(input.delta)) {
    throw new Error("Invalid points delta");
  }
  if (input.delta <= 0) {
    throw new Error("Points delta must be positive");
  }

  const newOwned = input.pointsOwned + input.delta;
  const newAvailable = input.pointsAvailable + input.delta;

  if (newOwned < 0 || newAvailable < 0) {
    throw new Error("Points cannot be negative");
  }

  return { pointsOwned: newOwned, pointsAvailable: newAvailable };
}

export function resolveResortMapping(homeResort: string | null, resorts: ResortOption[]) {
  if (!homeResort) return null;
  const normalized = homeResort.trim().toUpperCase();
  const match = resorts.find((resort) => (resort.calculator_code ?? "").toUpperCase() === normalized);
  return match?.id ?? null;
}
