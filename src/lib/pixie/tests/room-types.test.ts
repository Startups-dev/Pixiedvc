import { describe, expect, it } from "vitest";

import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { getPixieResortById } from "@/lib/pixie/resorts/identifiers";
import {
  canRoomAccommodateParty,
  getEligibleRoomTypes,
  getRoomTypesForResort,
  normalizeRoomTypeIdentifier,
  selectSmallestEligibleRoomType,
} from "@/lib/pixie/resorts/room-types";

function party(adults: number, children = 0) {
  return normalizePixieTripState({ ...createEmptyPixieTripState(), party: { adults, children } }).party;
}

describe("Pixie room types and capacity", () => {
  it("normalizes room-type identifiers", () => {
    expect(normalizeRoomTypeIdentifier("1 Bedroom")).toBe("one_bedroom");
    expect(normalizeRoomTypeIdentifier("grand villa")).toBe("three_bedroom_grand_villa");
    expect(normalizeRoomTypeIdentifier("Tower Studio")).toBe("tower_studio");
  });

  it("small party receives an eligible studio where supported", () => {
    const resort = getPixieResortById("blt");
    expect(resort).toBeTruthy();
    const room = selectSmallestEligibleRoomType(resort!, party(2));
    expect(room?.id).toBe("studio");
  });

  it("party too large for studio is not assigned one", () => {
    const resort = getPixieResortById("blt")!;
    expect(canRoomAccommodateParty(getRoomTypesForResort(resort).find((room) => room.id === "studio")!, party(5))).toBe(false);
  });

  it("large party receives only verified eligible room types", () => {
    const resort = getPixieResortById("ssr")!;
    const rooms = getEligibleRoomTypes(resort, party(8, 2));
    expect(rooms.every((room) => room.maximumCapacity >= 10)).toBe(true);
    expect(rooms.map((room) => room.id)).toContain("three_bedroom_grand_villa");
  });

  it("capacity never defaults optimistically", () => {
    const resort = getPixieResortById("bcv")!;
    expect(getEligibleRoomTypes(resort, party(10))).toEqual([]);
  });

  it("traveller aggregate and party count are respected", () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState(),
      party: {
        adults: 1,
        travellers: [
          { id: "traveller_1", category: "adult" },
          { id: "traveller_2", category: "child", age: 8 },
          { id: "traveller_3", category: "child", age: 10 },
        ],
      },
    });
    const resort = getPixieResortById("rva")!;
    expect(selectSmallestEligibleRoomType(resort, state.party)?.maximumCapacity).toBeGreaterThanOrEqual(3);
  });

  it("unsupported room mappings are excluded by normalization", () => {
    expect(normalizeRoomTypeIdentifier("pirate room")).toBeNull();
  });
});
