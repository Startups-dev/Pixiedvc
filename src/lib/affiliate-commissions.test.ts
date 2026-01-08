import { calculateCommission } from "@/lib/affiliate-commissions";

describe("affiliate commission", () => {
  it("rounds to two decimals", () => {
    expect(calculateCommission(123.456, 0.07)).toBe(8.64);
  });

  it("handles empty values", () => {
    expect(calculateCommission(null, 0.07)).toBe(0);
    expect(calculateCommission(250, null)).toBe(0);
  });
});
