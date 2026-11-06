import { describe, expect, it } from "vitest";
import { normalizeQuoteParty } from "../src/ui/quoteParty";
import { formatDvcRoomLabel } from "../src/engine/accommodations";

describe("calculator quote handoff", () => {
  it("preserves adults and children from trip intent with safe defaults", () => {
    expect(normalizeQuoteParty(3, 2)).toEqual({ adults: 3, children: 2 });
    expect(normalizeQuoteParty()).toEqual({ adults: 1, children: 0 });
  });

  it("uses the shared customer label for Aulani Hotel Room", () => {
    expect(formatDvcRoomLabel("HOTELROOM")).toBe("Hotel Room");
  });
});
