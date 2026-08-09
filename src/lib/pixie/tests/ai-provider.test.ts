import { afterEach, describe, expect, it, vi } from "vitest";

import { PixieAiException } from "@/lib/pixie/ai/errors";
import { createOpenAiPixieProvider } from "@/lib/pixie/ai/openai-provider";
import type { PixiePlannerTurnInput } from "@/lib/pixie/ai/provider";
import { createFixturePixieProvider } from "@/lib/pixie/ai/provider";
import { PIXIE_AI_PROMPT_VERSION, pixieModelTurnResultSchema } from "@/lib/pixie/ai/schemas";
import { getPixieAiConfig } from "@/lib/pixie/ai/safety";
import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie AI provider contract", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function plannerInput(): PixiePlannerTurnInput {
    const currentState = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
    return {
      currentState,
      latestUserMessage: "We are two adults and two kids planning Walt Disney World.",
      recentMessages: [],
      completeness: evaluatePixieCompleteness(currentState),
      availableTools: [],
      destinationScope: "walt_disney_world",
    };
  }

  function validOpenAiPayload(overrides: Record<string, unknown> = {}) {
    return {
      id: "resp_test_123",
      output_text: JSON.stringify({
        assistantResponse: "I can help. When are you hoping to travel?",
        tripPatch: {},
        requestedTools: [],
        nextQuestionKey: "ask_dates",
        planningIntent: "collect_information",
        conversationMode: "discovery",
        activeDecisionKey: "dates",
        delightMomentKey: "none",
        confidence: 0.75,
        warnings: [],
      }),
      usage: {
        input_tokens: 101,
        output_tokens: 52,
        total_tokens: 153,
        input_tokens_details: { cached_tokens: 7 },
      },
      ...overrides,
    };
  }

  function maxOutputIncompletePayload() {
    return {
      id: "resp_incomplete_test",
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [{ type: "reasoning", content: [] }],
      usage: {
        input_tokens: 120,
        output_tokens: 800,
        total_tokens: 920,
      },
    };
  }

  function mockOpenAiResponse(response: Response) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
  }

  function testEnv(values: Record<string, string> = {}): NodeJS.ProcessEnv {
    return { NODE_ENV: "test", ...values } as unknown as NodeJS.ProcessEnv;
  }

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

  it("requires PIXIE_MODEL instead of silently falling back", () => {
    expect(() => getPixieAiConfig(testEnv())).toThrow(PixieAiException);
    try {
      getPixieAiConfig(testEnv());
    } catch (error) {
      expect(error).toMatchObject({ code: "configuration_error" });
    }
  });

  it("uses the configured gpt-5.6-sol model exactly in the Responses API request", async () => {
    const fetchMock = mockOpenAiResponse(Response.json(validOpenAiPayload()));
    const provider = createOpenAiPixieProvider(testEnv({
      OPENAI_API_KEY: "sk-test-redacted",
      PIXIE_MODEL: "gpt-5.6-sol",
      PIXIE_MAX_OUTPUT_TOKENS: "800",
    }));

    const result = await provider.createPlannerTurn(plannerInput());
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { model?: string; text?: unknown };

    expect(requestBody.model).toBe("gpt-5.6-sol");
    expect(JSON.stringify(requestBody)).not.toContain("gpt-5.6\"");
    expect(JSON.stringify(requestBody)).toContain("2026-07-15.concierge-personality");
    expect(result.metadata.model).toBe("gpt-5.6-sol");
    expect(result.usage).toMatchObject({
      model: "gpt-5.6-sol",
      inputTokens: 101,
      outputTokens: 52,
      cachedInputTokens: 7,
      totalTokens: 153,
    });
  });

  it("requires concierge metadata in the strict OpenAI structured-output schema", async () => {
    const fetchMock = mockOpenAiResponse(Response.json(validOpenAiPayload()));
    const provider = createOpenAiPixieProvider(testEnv({
      OPENAI_API_KEY: "sk-test-redacted",
      PIXIE_MODEL: "gpt-5.6-sol",
    }));

    await provider.createPlannerTurn(plannerInput());
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      text?: { format?: { schema?: { required?: string[]; properties?: Record<string, unknown> } } };
    };
    const schema = requestBody.text?.format?.schema;

    expect(schema?.required).toEqual(
      expect.arrayContaining(["conversationMode", "activeDecisionKey", "delightMomentKey"]),
    );
    expect(schema?.properties).toHaveProperty("conversationMode");
    expect(schema?.properties).toHaveProperty("activeDecisionKey");
    expect(schema?.properties).toHaveProperty("delightMomentKey");
  });

  it("returns a typed configuration error when the API key is missing", async () => {
    const provider = createOpenAiPixieProvider(testEnv({ PIXIE_MODEL: "gpt-5.6-sol" }));
    await expect(provider.createPlannerTurn(plannerInput())).rejects.toMatchObject({ code: "configuration_error" });
  });

  it("maps invalid or inaccessible models to a typed model_not_found error", async () => {
    mockOpenAiResponse(Response.json({ error: { code: "model_not_found", message: "model not found" } }, { status: 404 }));
    const provider = createOpenAiPixieProvider(testEnv({ OPENAI_API_KEY: "sk-test-redacted", PIXIE_MODEL: "missing-model" }));
    await expect(provider.createPlannerTurn(plannerInput())).rejects.toMatchObject({ code: "model_not_found", status: 404 });
  });

  it("sanitizes authentication failures", async () => {
    mockOpenAiResponse(Response.json({ error: { message: "invalid api key: sk-test-redacted" } }, { status: 401 }));
    const provider = createOpenAiPixieProvider(testEnv({ OPENAI_API_KEY: "sk-test-redacted", PIXIE_MODEL: "gpt-5.6-sol" }));
    await provider.createPlannerTurn(plannerInput()).catch((error) => {
      expect(error).toMatchObject({ code: "authentication_failed", status: 401 });
      expect(String(error.message)).not.toContain("sk-test-redacted");
    });
  });

  it("maps rate limits with safe retry metadata", async () => {
    mockOpenAiResponse(
      Response.json(
        { error: { type: "rate_limit_exceeded", message: "slow down" } },
        { status: 429, headers: { "retry-after": "2" } },
      ),
    );
    const provider = createOpenAiPixieProvider(testEnv({ OPENAI_API_KEY: "sk-test-redacted", PIXIE_MODEL: "gpt-5.6-sol" }));
    await expect(provider.createPlannerTurn(plannerInput())).rejects.toMatchObject({ code: "rate_limited", status: 429, retryAfterMs: 2000 });
  });

  it("fails safely on malformed structured output", async () => {
    mockOpenAiResponse(Response.json(validOpenAiPayload({ output_text: "{not-json" })));
    const provider = createOpenAiPixieProvider(testEnv({ OPENAI_API_KEY: "sk-test-redacted", PIXIE_MODEL: "gpt-5.6-sol" }));
    await expect(provider.createPlannerTurn(plannerInput())).rejects.toMatchObject({ code: "invalid_model_output" });
  });

  it("detects incomplete max-output responses and retries once with a larger output budget", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(maxOutputIncompletePayload()))
      .mockResolvedValueOnce(Response.json(maxOutputIncompletePayload()));
    const provider = createOpenAiPixieProvider(testEnv({
      OPENAI_API_KEY: "sk-test-redacted",
      PIXIE_MODEL: "gpt-5.6-sol",
      PIXIE_MAX_OUTPUT_TOKENS: "800",
    }));

    await expect(provider.createPlannerTurn(plannerInput())).rejects.toMatchObject({
      code: "invalid_model_output",
      message: expect.stringMatching(/current model capacity/i),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as { max_output_tokens?: number };
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as { max_output_tokens?: number };
    expect(firstBody.max_output_tokens).toBe(800);
    expect(secondBody.max_output_tokens).toBe(2000);
  });

  it("returns a valid planner result when the max-output retry succeeds", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(maxOutputIncompletePayload()))
      .mockResolvedValueOnce(Response.json(validOpenAiPayload()));
    const provider = createOpenAiPixieProvider(testEnv({
      OPENAI_API_KEY: "sk-test-redacted",
      PIXIE_MODEL: "gpt-5.6-sol",
      PIXIE_MAX_OUTPUT_TOKENS: "800",
    }));

    const result = await provider.createPlannerTurn(plannerInput());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.result.assistantResponse).toBe("I can help. When are you hoping to travel?");
    expect(result.metadata.provider).toBe("openai");
  });

  it("maps a timeout during the max-output retry to the planning-capacity fallback", async () => {
    vi.useFakeTimers();
    try {
      const fetchMock = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json(maxOutputIncompletePayload()))
        .mockImplementationOnce(
          () =>
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error("timeout")), 20);
            }) as Promise<Response>,
        );
      const provider = createOpenAiPixieProvider(testEnv({
        OPENAI_API_KEY: "sk-test-redacted",
        PIXIE_MODEL: "gpt-5.6-sol",
        PIXIE_MAX_OUTPUT_TOKENS: "800",
        PIXIE_MODEL_TIMEOUT_MS: "10",
      }));

      const turn = provider.createPlannerTurn(plannerInput());
      const rejection = expect(turn).rejects.toMatchObject({
        code: "invalid_model_output",
        message: expect.stringMatching(/current model capacity/i),
      });
      await vi.advanceTimersByTimeAsync(20);

      await rejection;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not expose secrets or raw provider payloads in successful output", async () => {
    mockOpenAiResponse(Response.json(validOpenAiPayload({ private_debug: "should-not-return" })));
    const provider = createOpenAiPixieProvider(testEnv({ OPENAI_API_KEY: "sk-test-secret-value", PIXIE_MODEL: "gpt-5.6-sol" }));
    const result = await provider.createPlannerTurn(plannerInput());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("sk-test-secret-value");
    expect(serialized).not.toContain("private_debug");
  });
});
