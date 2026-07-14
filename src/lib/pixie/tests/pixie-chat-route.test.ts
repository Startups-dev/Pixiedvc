import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import { emptyPixieUsage } from "@/lib/pixie/ai/usage";
import { beginPixieTurn, createInitialPixieChatState, recentMessagesFromClient } from "@/lib/pixie/client/chat-state";
import type { PixiePlannerStreamEvent, PixiePlannerTurnResult } from "@/lib/pixie/ai/orchestrator";

const streamMock = vi.fn();

function baseTurnResult(): PixiePlannerTurnResult {
  const state = createEmptyPixieTripState("2026-07-12T12:00:00.000Z");
  const completeness = evaluatePixieCompleteness(state);
  return {
    assistantResponse: "Who will be traveling with you?",
    updatedState: state,
    completeness,
    planningStage: completeness.planningStage,
    toolResults: [],
    nextQuestionKey: completeness.suggestedNextQuestionKey,
    warnings: [],
    usage: emptyPixieUsage("openai", "gpt-5.6-sol", "test-prompt"),
    turnId: "pixie_turn_test",
    generatedAt: "2026-07-12T12:00:00.000Z",
  };
}

async function* events(eventsToYield: PixiePlannerStreamEvent[]) {
  for (const event of eventsToYield) yield event;
}

async function loadRoute() {
  vi.resetModules();
  vi.doMock("@/lib/pixie/ai/orchestrator", () => ({
    streamPixiePlannerTurn: streamMock,
  }));
  return import("@/app/api/pixie/chat/route");
}

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/pixie/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/pixie/chat", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      PIXIE_PUBLIC_ENABLED: "true",
      PIXIE_MODEL: "gpt-5.6-sol",
      PIXIE_RATE_LIMIT_WINDOW_MS: "60000",
      PIXIE_RATE_LIMIT_MAX_REQUESTS: "12",
    };
    delete (globalThis as { __pixieChatRateLimiter?: unknown }).__pixieChatRateLimiter;
    streamMock.mockReset();
    streamMock.mockImplementation(() =>
      events([
        { type: "turn_started", turnId: "pixie_turn_test" },
        { type: "assistant_text_delta", turnId: "pixie_turn_test", text: "Who will be traveling with you?" },
        { type: "turn_completed", turnId: "pixie_turn_test", result: baseTurnResult() },
      ]),
    );
  });

  afterEach(() => {
    vi.doUnmock("@/lib/pixie/ai/orchestrator");
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env = originalEnv;
  });

  it("streams a successful Pixie turn without raw provider data", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "We are two adults and two children.",
        recentMessages: [],
        draftId: "draft_test",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const text = await response.text();
    expect(text).toContain('"turn_completed"');
    expect(text).not.toContain("OPENAI_API_KEY");
    expect(text).not.toContain("sk-");
    expect(streamMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "We are two adults and two children.",
        context: { sessionId: "draft_test" },
      }),
    );
  });

  it("streams sanitized typed provider failures instead of completed fallback turns", async () => {
    streamMock.mockImplementation(() =>
      events([
        { type: "turn_started", turnId: "pixie_turn_timeout" },
        {
          type: "turn_failed",
          turnId: "pixie_turn_timeout",
          error: { code: "provider_timeout", message: "OpenAI provider request timed out." },
        },
      ]),
    );
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
      }),
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('"turn_failed"');
    expect(text).toContain('"provider_timeout"');
    expect(text).toContain("Pixie is having trouble responding right now. Your trip draft is still safe.");
    expect(text).not.toContain("OpenAI provider request timed out.");
    expect(text).not.toContain('"turn_completed"');
  });

  it("accepts the first-turn recent messages produced by the Pixie client", async () => {
    const { POST } = await loadRoute();
    const clientState = beginPixieTurn(
      createInitialPixieChatState({ draftId: "draft_first_turn" }),
      "We are two adults and two children, ages 6 and 9. We want to visit October 10 through October 17, 2026. We love EPCOT and swimming, and we want a balanced trip.",
    );
    const recentMessages = recentMessagesFromClient(clientState.messages);

    expect(JSON.stringify(recentMessages)).not.toContain("createdAt");

    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "We are two adults and two children, ages 6 and 9. We want to visit October 10 through October 17, 2026. We love EPCOT and swimming, and we want a balanced trip.",
        recentMessages,
        draftId: "draft_first_turn",
      }),
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('"turn_completed"');
    expect(streamMock).toHaveBeenCalled();
  });

  it("preserves strict recent-message validation at the API boundary", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [{ role: "user", content: "Hi", createdAt: "2026-07-12T12:00:00.000Z" }],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_model_output");
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("returns a safe error for invalid JSON", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request("{"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_json");
    expect(JSON.stringify(json)).not.toContain("SyntaxError");
  });

  it("returns a typed error for invalid state", async () => {
    const { POST } = await loadRoute();
    const response = await POST(request({ state: { schemaVersion: 999 }, message: "Hi", recentMessages: [] }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe("invalid_model_output");
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("rejects oversized messages before orchestration", async () => {
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "x".repeat(4001),
        recentMessages: [],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("sanitizes missing model configuration", async () => {
    delete process.env.PIXIE_MODEL;
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
      }),
    );
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error.code).toBe("configuration_error");
    expect(json.error.message).not.toContain("PIXIE_MODEL");
  });

  it("blocks public use when the feature flag is disabled", async () => {
    process.env.PIXIE_PUBLIC_ENABLED = "false";
    const { POST } = await loadRoute();
    const response = await POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
      }),
    );

    expect(response.status).toBe(404);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("keeps production disabled when the feature flag is missing or invalid", async () => {
    delete process.env.PIXIE_PUBLIC_ENABLED;
    vi.stubEnv("NODE_ENV", "production");
    let route = await loadRoute();
    let response = await route.POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
      }),
    );
    expect(response.status).toBe(404);

    process.env.PIXIE_PUBLIC_ENABLED = "maybe";
    route = await loadRoute();
    response = await route.POST(
      request({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
      }),
    );
    expect(response.status).toBe(404);
    expect(streamMock).not.toHaveBeenCalled();
  });

  it("returns safe retry metadata when rate limited", async () => {
    process.env.PIXIE_RATE_LIMIT_MAX_REQUESTS = "1";
    const { POST } = await loadRoute();
    const body = {
      state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
      message: "Hi",
      recentMessages: [],
      draftId: "draft_rate_limit",
    };

    const first = await POST(request(body, { "x-forwarded-for": "198.51.100.21" }));
    expect(first.status).toBe(200);

    const second = await POST(request(body, { "x-forwarded-for": "198.51.100.21" }));
    const json = await second.json();
    expect(second.status).toBe(429);
    expect(json.error.code).toBe("rate_limited");
    expect(json.error.retryAfterMs).toBeGreaterThan(0);
    expect(second.headers.get("retry-after")).toBeTruthy();
  });
});
