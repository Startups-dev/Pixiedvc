export type ReadyStayResortLookup = {
  id: string;
  slug?: string | null;
  calculator_code?: string | null;
};

export function resolveReadyStayResortId(
  value: string | undefined,
  resorts: ReadyStayResortLookup[],
): { id: string | null; requested: boolean } {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return { id: null, requested: false };

  const match = resorts.find(
    (resort) =>
      resort.id.toLowerCase() === normalized ||
      resort.slug?.toLowerCase() === normalized ||
      resort.calculator_code?.toLowerCase() === normalized,
  );
  return { id: match?.id ?? null, requested: true };
}

export function matchesReadyStayDates(
  stay: { check_in: string; check_out: string },
  checkIn?: string,
  checkOut?: string,
) {
  if (checkIn && stay.check_in !== checkIn) return false;
  if (checkOut && stay.check_out !== checkOut) return false;
  return true;
}

export function normalizeReadyStayDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}
