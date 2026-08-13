import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearPixieDraftFromBrowser,
  PIXIE_LOCAL_DRAFT_STORAGE_KEY,
  readPixieDraftFromBrowser,
  writePixieDraftToBrowser,
} from "@/lib/pixie/client/draft-storage";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie browser draft storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("serializes and restores a valid local draft", () => {
    const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
    writePixieDraftToBrowser(state, [{ role: "user", content: "We are flexible." }]);

    const restored = readPixieDraftFromBrowser();
    expect(restored?.state.schemaVersion).toBe(1);
    expect(restored?.recentMessages[0]?.content).toBe("We are flexible.");
    expect(restored?.recovered).toBe(false);
  });

  it("recovers safely from corrupt JSON and clears only the Pixie draft key", () => {
    window.localStorage.setItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY, "{");
    window.localStorage.setItem("pixiedvc:affiliate", "keep");

    const restored = readPixieDraftFromBrowser();

    expect(restored?.recovered).toBe(true);
    expect(restored?.notice).toMatch(/could not be read/i);
    expect(window.localStorage.getItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("pixiedvc:affiliate")).toBe("keep");
  });

  it("recovers safely from unsupported draft versions", () => {
    window.localStorage.setItem(
      PIXIE_LOCAL_DRAFT_STORAGE_KEY,
      JSON.stringify({ draftVersion: 99, savedAt: "2026-07-12T12:00:00.000Z", state: {} }),
    );

    const restored = readPixieDraftFromBrowser();
    expect(restored?.recovered).toBe(true);
    expect(restored?.notice).toMatch(/older format/i);
  });

  it("caps recent messages and does not persist sensitive diagnostic fields", () => {
    const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
    const messages = Array.from({ length: 10 }, (_, index) => ({
      role: index % 2 === 0 ? ("user" as const) : ("assistant" as const),
      content: `message ${index}`,
      createdAt: "2026-07-12T12:00:00.000Z",
    }));
    writePixieDraftToBrowser(state, messages);

    const raw = window.localStorage.getItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY) ?? "";
    const parsed = JSON.parse(raw) as { recentMessages: unknown[] };
    expect(parsed.recentMessages).toHaveLength(6);
    expect(JSON.stringify(parsed.recentMessages)).not.toContain("createdAt");
    expect(raw).not.toContain("OPENAI_API_KEY");
    expect(raw).not.toContain("systemPrompt");
    expect(raw).not.toContain("payment");
    expect(raw).not.toContain("service_role");
  });

  it("strips legacy createdAt metadata from restored recent messages", () => {
    const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
    window.localStorage.setItem(
      PIXIE_LOCAL_DRAFT_STORAGE_KEY,
      JSON.stringify({
        draftVersion: 1,
        savedAt: "2026-07-12T12:00:00.000Z",
        state,
        recentMessages: [
          {
            role: "user",
            content: "We are two adults.",
            createdAt: "2026-07-12T12:00:00.000Z",
          },
        ],
      }),
    );

    const restored = readPixieDraftFromBrowser();

    expect(restored?.recovered).toBe(true);
    expect(restored?.recentMessages).toEqual([{ role: "user", content: "We are two adults." }]);
  });

  it("restores schema-evolved local drafts by salvaging valid state fields", () => {
    const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
    window.localStorage.setItem(
      PIXIE_LOCAL_DRAFT_STORAGE_KEY,
      JSON.stringify({
        draftVersion: 1,
        savedAt: "2026-07-12T12:00:00.000Z",
        state: {
          ...state,
          futureTopLevel: "ignored",
          party: { travellers: [{ id: "traveller_preschooler", category: "child", age: 2, futureField: "ignored" }] },
          preferences: { parkPriorities: ["Magic Kingdom"], futurePreference: "ignored" },
        },
        recentMessages: [{ role: "user", content: "We're at Magic Kingdom with our 2-year-old." }],
      }),
    );

    const restored = readPixieDraftFromBrowser();

    expect(restored?.recovered).toBe(true);
    expect(restored?.notice).toMatch(/updated your local draft format/i);
    expect(restored?.state.party.childCount).toBe(1);
    expect(restored?.state.party.adultCount).toBeUndefined();
    expect(restored?.state.preferences.parkPriorities).toEqual(["Magic Kingdom"]);
    expect(window.localStorage.getItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  it("reset clears only the Pixie draft", () => {
    window.localStorage.setItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY, "draft");
    window.localStorage.setItem("pixiedvc:affiliate", "keep");
    clearPixieDraftFromBrowser();

    expect(window.localStorage.getItem(PIXIE_LOCAL_DRAFT_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("pixiedvc:affiliate")).toBe("keep");
  });
});
