import { describe, expect, it } from "vitest";

import { calculateStayPoints, StayCalculatorError } from "@/lib/stay/stayCalculator";

function expectStayCalculatorError(input: Parameters<typeof calculateStayPoints>[0], code: StayCalculatorError["code"]) {
  expect(() => calculateStayPoints(input)).toThrowError(StayCalculatorError);

  try {
    calculateStayPoints(input);
  } catch (error) {
    expect(error).toBeInstanceOf(StayCalculatorError);
    expect((error as StayCalculatorError).code).toBe(code);
  }
}

describe("stayCalculator", () => {
  it("expands nights as check-in inclusive and check-out exclusive", () => {
    const result = calculateStayPoints({
      resortCalculatorCode: "BCV",
      roomCode: "STUDIO",
      viewCode: "S",
      checkIn: "2026-12-24",
      checkOut: "2026-12-26",
    });

    expect(result.totalNights).toBe(2);
    expect(result.nights).toHaveLength(2);
    expect(result.nights[0]?.night).toBe("2026-12-24");
    expect(result.nights[1]?.night).toBe("2026-12-25");
    expect(result.totalPoints).toBe(result.nights.reduce((sum, row) => sum + row.points, 0));
  });

  it("treats invalid checkout as a one-night stay", () => {
    const result = calculateStayPoints({
      resortCalculatorCode: "BCV",
      roomCode: "STUDIO",
      viewCode: "S",
      checkIn: "2026-12-24",
      checkOut: "2026-12-24",
    });

    expect(result.totalNights).toBe(1);
    expect(result.nights).toHaveLength(1);
    expect(result.nights[0]?.night).toBe("2026-12-24");
  });

  it("quotes exact BLT Studio categories without collapsing views", () => {
    expect(
      calculateStayPoints({
        resortCalculatorCode: "BLT",
        roomCode: "STUDIO",
        viewCode: "S",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      }).totalPoints,
    ).toBe(26);

    expect(
      calculateStayPoints({
        resortCalculatorCode: "BLT",
        roomCode: "STUDIO",
        viewCode: "L",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      }).totalPoints,
    ).toBe(32);

    expect(
      calculateStayPoints({
        resortCalculatorCode: "BLT",
        roomCode: "STUDIO",
        viewCode: "T",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      }).totalPoints,
    ).toBe(36);
  });

  it("rejects generic BLT Studio as ambiguous", () => {
    expectStayCalculatorError(
      {
        resortCalculatorCode: "BLT",
        roomType: "Studio",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      },
      "ambiguous_accommodation",
    );
  });

  it("keeps legacy generic room compatibility when it maps to one exact identity", () => {
    const generic = calculateStayPoints({
      resortCalculatorCode: "BCV",
      roomType: "Studio",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
    });

    const exact = calculateStayPoints({
      resortCalculatorCode: "BCV",
      roomCode: "STUDIO",
      viewCode: "S",
      checkIn: "2026-09-01",
      checkOut: "2026-09-03",
    });

    expect(generic.totalPoints).toBe(exact.totalPoints);
  });

  it("rejects generic Studio when multiple studio-like room codes or categories exist", () => {
    expectStayCalculatorError(
      {
        resortCalculatorCode: "PVB",
        roomType: "Studio",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      },
      "ambiguous_accommodation",
    );
  });

  it("rejects invalid exact identities without normalizing to another room or view", () => {
    expectStayCalculatorError(
      {
        resortCalculatorCode: "BLT",
        roomCode: "STUDIO",
        viewCode: "SV",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      },
      "invalid_accommodation",
    );

    expectStayCalculatorError(
      {
        resortCalculatorCode: "BLT",
        roomCode: "CABIN",
        viewCode: "S",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      },
      "invalid_accommodation",
    );

    expectStayCalculatorError(
      {
        resortCalculatorCode: "NOPE",
        roomCode: "STUDIO",
        viewCode: "S",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
      },
      "unsupported_resort",
    );
  });
});
