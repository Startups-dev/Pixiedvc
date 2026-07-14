import { describe, expect, it } from "vitest";

import { createOpenAiPixieProvider } from "@/lib/pixie/ai/openai-provider";
import { runPixiePlannerTurn } from "@/lib/pixie/ai/orchestrator";
import { PIXIE_AI_PROMPT_VERSION } from "@/lib/pixie/ai/schemas";
import { getPixieModelToolDefinitions } from "@/lib/pixie/ai/tool-registry";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";

const runLiveSmoke = process.env.PIXIE_LIVE_OPENAI_SMOKE === "1" && Boolean(process.env.OPENAI_API_KEY) && Boolean(process.env.PIXIE_MODEL);

describe.skipIf(!runLiveSmoke)("Pixie OpenAI provider live smoke test", () => {
  it("returns a valid structured planner result for synthetic input", async () => {
    const state = normalizePixieTripState({
      ...createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
      dates: { arrivalDate: "2027-09-07", departureDate: "2027-09-12" },
      party: { adults: 2, children: 2 },
      preferences: { parkPriorities: ["Magic Kingdom"], resortPriorities: ["easy transportation"] },
    });
    const provider = createOpenAiPixieProvider(process.env);
    const result = await provider.createPlannerTurn({
      currentState: state,
      latestUserMessage: "We are two adults and two children planning five nights at Walt Disney World. What should Pixie ask next?",
      recentMessages: [],
      completeness: evaluatePixieCompleteness(state),
      availableTools: getPixieModelToolDefinitions(),
      destinationScope: "walt_disney_world",
    });

    expect(result.metadata.provider).toBe("openai");
    expect(result.metadata.model).toBe(process.env.PIXIE_MODEL);
    expect(result.metadata.promptVersion).toBe(PIXIE_AI_PROMPT_VERSION);
    expect(result.result.assistantResponse.length).toBeGreaterThan(0);
    expect(result.result.planningIntent).toBeTruthy();
    expect(result.usage.model).toBe(process.env.PIXIE_MODEL);
    expect(JSON.stringify(result)).not.toMatch(/OPENAI_API_KEY|sk-/);
  }, 30_000);

  it("extracts the Phase 6 first family message and produces recommendations", async () => {
    const state = createEmptyPixieTripState("2026-07-14T12:00:00.000Z");
    const result = await runPixiePlannerTurn({
      state,
      message:
        "We are two adults and two children, ages 6 and 9. We want to visit October 10 through October 17, 2026. We love EPCOT and swimming, and we want a balanced trip.",
      recentMessages: [],
      provider: createOpenAiPixieProvider(process.env),
      now: "2026-07-14T12:01:00.000Z",
    });

    expect(result.updatedState.party.adultCount).toBe(2);
    expect(result.updatedState.party.childCount).toBe(2);
    expect(result.updatedState.party.travellers.map((traveller) => traveller.age).filter(Boolean).sort()).toEqual([6, 9]);
    expect(result.updatedState.dates.arrivalDate).toBe("2026-10-10");
    expect(result.updatedState.dates.departureDate).toBe("2026-10-17");
    expect(result.updatedState.dates.numberOfNights).toBe(7);
    expect(result.updatedState.preferences.parkPriorities).toContain("EPCOT");
    expect(result.updatedState.preferences.poolImportance).toBe("high");
    expect(result.updatedState.preferences.vacationPace).toBe("balanced");
    expect(result.planningStage).not.toBe("new");
    expect(result.nextQuestionKey).not.toBe("ask_dates");
    expect(result.recommendations?.recommendations.length).toBeGreaterThan(0);
  }, 45_000);
});
