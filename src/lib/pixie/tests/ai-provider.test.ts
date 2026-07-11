import { describe, expect, it } from "vitest";

import { createFixturePixieProvider } from "@/lib/pixie/ai/provider";
import { PIXIE_AI_PROMPT_VERSION, pixieModelTurnResultSchema } from "@/lib/pixie/ai/schemas";

describe("Pixie AI provider contract", () => {
  it("fixture provider returns repository-owned metadata without secrets", async () => {
    const provider = createFixturePixieProvider({
      result: {
        assistantResponse: "When are you hoping to travel?",
        tripPatch: {},
        requestedTools: [],
        nextQuestionKey: "ask_dates",
        planningIntent: "collect_information",
        confidence: 0.7,
        warnings: [],
      },
      promptVersion: PIXIE_AI_PROMPT_VERSION,
    });
    const result = await provider.createPlannerTurn({} as never);
    expect(result.metadata.provider).toBe("fixture");
    expect(result.metadata.promptVersion).toBe(PIXIE_AI_PROMPT_VERSION);
    expect(JSON.stringify(result)).not.toMatch(/OPENAI_API_KEY|sk-/);
  });

  it("provider output validates through strict schema", () => {
    expect(
      pixieModelTurnResultSchema.parse({
        assistantResponse: "I can help.",
        tripPatch: {},
        requestedTools: [],
        planningIntent: "collect_information",
        confidence: 0.5,
        warnings: [],
      }),
    ).toBeTruthy();
  });
});

