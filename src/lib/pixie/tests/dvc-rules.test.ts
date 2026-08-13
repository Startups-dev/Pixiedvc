import { describe, expect, it } from "vitest";

import {
  addCalendarMonths,
  buildDvcContext,
  evaluateDvcBookingWindow,
  homeResortBookingOpenDate,
  nonHomeResortBookingOpenDate,
  useYearEndForDate,
  useYearStartForDate,
} from "@/lib/pixie/dvc";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie DVC rules foundation", () => {
  it("Case A calculates 11-month Home Resort opening and marks future stays not open", () => {
    const context = buildDvcContext({
      latestUserMessage: "I own at BoardWalk. Can I book BoardWalk for December 15 2028?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({
      status: "ineligible",
      reasonCodes: expect.arrayContaining(["HOME_RESORT", "BOOKING_WINDOW_NOT_OPEN"]),
    });
    expect(context.results[0]?.factsUsed).toEqual(expect.arrayContaining([expect.objectContaining({ label: "homeOpenDate", value: "2028-01-15" })]));
    expect(context.results[0]?.consequences.join(" ")).toMatch(/Planning can continue/i);
  });

  it("Case B recognizes Home Resort window inside 11 months but outside 7 months", () => {
    const result = evaluateDvcBookingWindow({ checkInDate: "2027-07-15", asOfDate: "2026-09-01", isHomeResort: true });

    expect(result).toMatchObject({
      status: "home_resort_window",
      homeOpenDate: "2026-08-15",
      nonHomeOpenDate: "2026-12-15",
    });
  });

  it("Case C marks non-home resort outside 7 months as not open", () => {
    const context = buildDvcContext({
      latestUserMessage: "I own at Saratoga but want Beach Club on July 15 2027. Can I book it?",
      currentState: createEmptyPixieTripState("2026-09-01T12:00:00.000Z"),
      now: "2026-09-01T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({
      status: "ineligible",
      reasonCodes: expect.arrayContaining(["NON_HOME_RESORT", "BOOKING_WINDOW_NOT_OPEN"]),
    });
  });

  it("Case D marks eligible non-home resort inside 7 months while preserving live inventory boundary", () => {
    const context = buildDvcContext({
      latestUserMessage: "I own at Saratoga. Can I get a BoardWalk studio for October 10 2026?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({
      status: "eligible",
      reasonCodes: expect.arrayContaining(["SEVEN_MONTH_WINDOW_OPEN", "LIVE_INVENTORY_REQUIRED"]),
    });
    expect(context.liveGaps.join(" ")).toMatch(/inventory/i);
  });

  it("Case E uses calendar-month arithmetic at month-end boundaries", () => {
    expect(addCalendarMonths("2027-03-31", -11)).toBe("2026-04-30");
    expect(homeResortBookingOpenDate("2027-01-31")).toBe("2026-02-28");
    expect(nonHomeResortBookingOpenDate("2027-03-31")).toBe("2026-08-31");
  });

  it("Case F does not infer ownership from a preferred resort", () => {
    const context = buildDvcContext({
      latestUserMessage: "I really want BoardWalk for July 15 2027. When can I book it?",
      currentState: createEmptyPixieTripState("2026-09-01T12:00:00.000Z"),
      now: "2026-09-01T12:00:00.000Z",
    });

    expect(context.contracts).toEqual([]);
    expect(context.results[0]?.reasonCodes).toEqual(expect.arrayContaining(["HOME_RESORT_UNKNOWN"]));
  });

  it("Case G represents explicit ownership as Home Resort context", () => {
    const context = buildDvcContext({
      latestUserMessage: "I own at BoardWalk. When can I book BoardWalk?",
      currentState: createEmptyPixieTripState("2026-09-01T12:00:00.000Z"),
      now: "2026-09-01T12:00:00.000Z",
    });

    expect(context.contracts).toEqual(expect.arrayContaining([expect.objectContaining({ homeResortId: "bwv", source: "USER_FACT" })]));
  });

  it("Case H keeps multiple contracts distinct", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      dvcContext: {
        contracts: [
          { id: "bwv_direct", homeResort: "BoardWalk Villas", acquisitionType: "direct", points: 150 },
          { id: "ssr_resale", homeResort: "Saratoga Springs", acquisitionType: "resale", points: 100 },
        ],
      },
    });
    const context = buildDvcContext({
      latestUserMessage: "Can these contracts book Riviera?",
      currentState: state,
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.contracts).toHaveLength(2);
    expect(context.contracts.map((contract) => contract.id)).toEqual(["bwv_direct", "ssr_resale"]);
  });

  it("Case I returns verification-needed for Riviera resale restrictions instead of fabricating permission", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      dvcContext: { contracts: [{ id: "ssr_resale", homeResort: "Saratoga Springs", acquisitionType: "resale" }] },
    });
    const context = buildDvcContext({
      latestUserMessage: "Can my Saratoga resale points book Riviera for March 1 2027?",
      currentState: state,
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({
      status: "unknown",
      reasonCodes: expect.arrayContaining(["RESALE_RESTRICTION", "RESTRICTED_RESORT", "ACQUISITION_DATE_OR_RULE_UNKNOWN"]),
      verificationRequired: true,
    });
  });

  it("Case J calculates Use Year boundaries independently of calendar year", () => {
    expect(useYearStartForDate("2027-08-31", 9)).toBe("2026-09-01");
    expect(useYearEndForDate("2027-08-31", 9)).toBe("2027-08-31");
    expect(useYearStartForDate("2027-09-01", 9)).toBe("2027-09-01");
  });

  it("Case K surfaces borrowing as a possible strategy with consequences", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      dvcContext: {
        currentUseYearPoints: { points: 80, source: "user_provided" },
        nextUseYearPoints: { points: 100, source: "user_provided" },
      },
    });
    const context = buildDvcContext({
      latestUserMessage: "I have 80 current points and need 120. Should I borrow?",
      currentState: state,
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results.some((result) => result.reasonCodes.includes("BORROWING_POLICY_NEEDS_VERIFICATION"))).toBe(true);
  });

  it("Case L keeps banked points visible for expiration-sensitive strategy", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      dvcContext: { pointLots: [{ id: "banked_2026", state: "banked", points: 40, expirationDate: "2027-08-31" }] },
    });
    const context = buildDvcContext({
      latestUserMessage: "Which points should I use first?",
      currentState: state,
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.pointLots[0]).toMatchObject({ state: "banked", expirationDate: "2027-08-31" });
    expect(context.results[0]?.consequences.join(" ")).toMatch(/expiration risk/i);
  });

  it("Case M surfaces Holding risk for cancellation inside modeled timing", () => {
    const context = buildDvcContext({
      latestUserMessage: "If I cancel today for September 1 2026, what happens?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({ reasonCodes: expect.arrayContaining(["HOLDING_RISK"]) });
    expect(context.results[0]?.consequences.join(" ")).toMatch(/does not mean the points are simply lost/i);
  });

  it("Case N marks cancellation allocation as account-specific when unknown", () => {
    const context = buildDvcContext({
      latestUserMessage: "What happens to my points if I cancel?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.accountGaps.join(" ")).toMatch(/allocation/i);
    expect(context.results[0]?.reasonCodes).toEqual(expect.arrayContaining(["CANCELLATION_ALLOCATION_UNKNOWN"]));
  });

  it("Case O compares modification risk without guaranteeing protection", () => {
    const context = buildDvcContext({
      latestUserMessage: "Should I modify this reservation or cancel and rebook?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results.some((result) => result.reasonCodes.includes("MODIFICATION_BEHAVIOR_ACCOUNT_SPECIFIC"))).toBe(true);
  });

  it("Case Q treats account balance questions as account-required", () => {
    const context = buildDvcContext({
      latestUserMessage: "How many banked points do I have?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.accountGaps.join(" ")).toMatch(/balances/i);
  });

  it("Case R supports home-then-switch strategy without availability guarantees", () => {
    const context = buildDvcContext({
      latestUserMessage: "I own Saratoga but want Beach Club. Should I book home then switch?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.contracts[0]).toMatchObject({ homeResortId: "ssr" });
    expect(context.results[0]?.liveGaps.join(" ")).toMatch(/inventory/i);
  });

  it("Case S models waitlist as not a reservation", () => {
    const context = buildDvcContext({
      latestUserMessage: "Should I waitlist this?",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
    });

    expect(context.results[0]).toMatchObject({ reasonCodes: expect.arrayContaining(["WAITLIST_NOT_RESERVATION"]) });
  });

  it("Case U keeps broad DVC provider context bounded", () => {
    const context = buildDvcContext({
      latestUserMessage: "Explain DVC booking windows, banking, borrowing, waitlists, split stays, cancellation, holding, resale, and points.",
      currentState: createEmptyPixieTripState("2026-08-13T12:00:00.000Z"),
      now: "2026-08-13T12:00:00.000Z",
      maxResults: 4,
    });

    expect(context.results.length).toBeLessThanOrEqual(4);
    expect(context.liveGaps.length).toBeLessThanOrEqual(4);
    expect(context.accountGaps.length).toBeLessThanOrEqual(4);
  });
});
