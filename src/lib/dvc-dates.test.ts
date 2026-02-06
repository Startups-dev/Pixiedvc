import { describe, expect, it } from "vitest";

import { getBankingDeadline } from "./dvc-dates";

describe("getBankingDeadline", () => {
  it("returns Sep 30 for Feb 1 use year start", () => {
    expect(getBankingDeadline("2026-02-01")).toBe("2026-09-30");
  });

  it("returns Apr 30 for Sep 1 use year start", () => {
    expect(getBankingDeadline("2026-09-01")).toBe("2027-04-30");
  });

  it("returns May 31 for Oct 1 use year start", () => {
    expect(getBankingDeadline("2026-10-01")).toBe("2027-05-31");
  });

  it("returns Jul 31 for Dec 1 use year start", () => {
    expect(getBankingDeadline("2026-12-01")).toBe("2027-07-31");
  });
});
