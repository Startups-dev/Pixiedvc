import { describe, expect, it } from "vitest";

import { applyPointsDelta, resolveResortMapping } from "./owner-membership-utils";

describe("applyPointsDelta", () => {
  it("increments owned and available points", () => {
    const result = applyPointsDelta({ pointsOwned: 100, pointsAvailable: 80, delta: 25 });
    expect(result).toEqual({ pointsOwned: 125, pointsAvailable: 105 });
  });

  it("rejects non-positive delta", () => {
    expect(() => applyPointsDelta({ pointsOwned: 10, pointsAvailable: 10, delta: 0 })).toThrow();
    expect(() => applyPointsDelta({ pointsOwned: 10, pointsAvailable: 10, delta: -5 })).toThrow();
  });
});

describe("resolveResortMapping", () => {
  it("resolves resort id by calculator code", () => {
    const resorts = [
      { id: "resort-1", name: "Bay Lake Tower", calculator_code: "BLT" },
      { id: "resort-2", name: "Riviera", calculator_code: "RVA" },
    ];
    expect(resolveResortMapping("blt", resorts)).toBe("resort-1");
  });

  it("returns null when no match exists", () => {
    const resorts = [{ id: "resort-1", name: "Bay Lake Tower", calculator_code: "BLT" }];
    expect(resolveResortMapping("AKV", resorts)).toBeNull();
  });
});
