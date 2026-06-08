export type ReadyStayTestPricingRow = {
  points: number | null | undefined;
  guest_price_per_point_cents: number | null | undefined;
  is_test_listing?: boolean | null;
  test_guest_total_cents?: number | null;
};

export function getReadyStayGuestTotalCents(row: ReadyStayTestPricingRow) {
  if (row.is_test_listing && typeof row.test_guest_total_cents === 'number' && row.test_guest_total_cents >= 0) {
    return row.test_guest_total_cents;
  }

  return Number(row.points ?? 0) * Number(row.guest_price_per_point_cents ?? 0);
}
