import { describe, expect, it } from "vitest";

import { evaluateReadyStayCapacity } from "@/lib/pixie/ready-stays/capacity";
import { makeReadyStayTrip } from "@/lib/pixie/tests/ready-stay-test-helpers";

describe("Ready Stay capacity", () => {
  it("accepts exact and larger sleeping capacity", () => {
    const trip = makeReadyStayTrip();
    expect(evaluateReadyStayCapacity({ party: trip.party, sleeps: 4 }).fitsParty).toBe(true);
    expect(evaluateReadyStayCapacity({ party: trip.party, sleeps: 6 }).spareCapacity).toBe(2);
  });

  it("hard excludes insufficient capacity", () => {
    const trip = makeReadyStayTrip();
    const result = evaluateReadyStayCapacity({ party: trip.party, sleeps: 3 });
    expect(result.fitsParty).toBe(false);
    expect(result.capacityStatus).toBe("insufficient");
  });

  it("fails closed for missing capacity without room-name fallback", () => {
    const trip = makeReadyStayTrip();
    const result = evaluateReadyStayCapacity({ party: trip.party, sleeps: null });
    expect(result.fitsParty).toBe(false);
    expect(result.capacityStatus).toBe("unknown");
    expect(result.confidence).toBe("missing");
  });

  it("respects traveller-derived party size", () => {
    const trip = makeReadyStayTrip({
      party: {
        adults: 1,
        children: 0,
        travellers: [
          { id: "a", category: "adult", interests: [] },
          { id: "b", category: "adult", interests: [] },
          { id: "c", category: "child", age: 8, interests: [] },
        ],
      },
    });
    const result = evaluateReadyStayCapacity({ party: trip.party, sleeps: 2 });
    expect(result.requiredCapacity).toBe(3);
    expect(result.fitsParty).toBe(false);
  });
});
