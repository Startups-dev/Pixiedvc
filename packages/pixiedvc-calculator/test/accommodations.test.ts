import { describe, expect, it } from "vitest";

import { Resorts } from "../src/engine/charts";
import {
  dvcAccommodationIdentityKey,
  getDvcAccommodationOption,
  getDvcAccommodationOptions,
  isValidDvcAccommodationIdentity,
} from "../src/engine/accommodations";

describe("DVC accommodation identity helpers", () => {
  it("enumerates distinct BLT studio options", () => {
    const studioOptions = getDvcAccommodationOptions("BLT").filter((option) => option.roomCode === "STUDIO");

    expect(studioOptions.map((option) => `${option.roomCode}/${option.viewCode}`)).toEqual([
      "STUDIO/S",
      "STUDIO/L",
      "STUDIO/T",
    ]);
    expect(new Set(studioOptions.map(dvcAccommodationIdentityKey)).size).toBe(3);
    expect(new Set(studioOptions.map((option) => option.categoryLabel)).size).toBe(3);
    expect(new Set(studioOptions.map((option) => option.displayLabel)).size).toBe(3);
  });

  it("keeps single-category rooms exact", () => {
    const beachClubStudioOptions = getDvcAccommodationOptions("BCV").filter((option) => option.roomCode === "STUDIO");

    expect(beachClubStudioOptions).toHaveLength(1);
    expect(beachClubStudioOptions[0]).toMatchObject({
      resortCode: "BCV",
      roomCode: "STUDIO",
      viewCode: "S",
    });
  });

  it("does not collapse multiple studio-like room codes", () => {
    const polynesianStudioLikeOptions = getDvcAccommodationOptions("PVB").filter((option) =>
      option.roomLabel.toLowerCase().includes("studio"),
    );
    const exactRoomCodes = new Set(polynesianStudioLikeOptions.map((option) => option.roomCode));

    expect(exactRoomCodes).toEqual(new Set(["STUDIO", "DUOSTUDIO", "DELUXESTUDIO"]));
    expect(polynesianStudioLikeOptions.map((option) => `${option.roomCode}/${option.viewCode}`)).toContain(
      "DUOSTUDIO/PM",
    );
    expect(polynesianStudioLikeOptions.map((option) => `${option.roomCode}/${option.viewCode}`)).toContain(
      "DELUXESTUDIO/TP",
    );
  });

  it("validates exact accommodation identities without substitution", () => {
    expect(isValidDvcAccommodationIdentity({ resortCode: "BLT", roomCode: "STUDIO", viewCode: "L" })).toBe(true);
    expect(isValidDvcAccommodationIdentity({ resortCode: "BLT", roomCode: "CABIN", viewCode: "S" })).toBe(false);
    expect(isValidDvcAccommodationIdentity({ resortCode: "BLT", roomCode: "STUDIO", viewCode: "SV" })).toBe(false);
    expect(isValidDvcAccommodationIdentity({ resortCode: "NOPE", roomCode: "STUDIO", viewCode: "S" })).toBe(false);
  });

  it("looks up one exact option by identity", () => {
    expect(getDvcAccommodationOption({ resortCode: "BLT", roomCode: "STUDIO", viewCode: "L" })).toMatchObject({
      resortCode: "BLT",
      roomCode: "STUDIO",
      viewCode: "L",
      categoryLabel: "Lake View",
    });
    expect(getDvcAccommodationOption({ resortCode: "BLT", roomCode: "STUDIO", viewCode: "SV" })).toBeNull();
  });

  it("enumerates valid, unique, labelled options across calculator metadata", () => {
    const keys = new Set<string>();

    for (const resort of Resorts) {
      const options = getDvcAccommodationOptions(resort.code);
      expect(options.length).toBeGreaterThan(0);

      for (const option of options) {
        expect(option.resortCode).toBe(resort.code);
        expect(option.roomCode).toBeTruthy();
        expect(option.viewCode).toBeTruthy();
        expect(option.displayLabel.trim()).not.toBe("");
        expect(option.roomLabel.trim()).not.toBe("");
        expect(option.categoryLabel.trim()).not.toBe("");
        expect(isValidDvcAccommodationIdentity(option)).toBe(true);

        const key = dvcAccommodationIdentityKey(option);
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    }
  });
});
