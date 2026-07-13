import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { evaluatePixieCompleteness } from "@/lib/pixie/completeness";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";
import { emptyPixieUsage } from "@/lib/pixie/ai/usage";
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
        { type: "assistant_text_delta", text: "Who will be traveling with you?" },
        { type: "turn_completed", result: baseTurnResult() },
      ]),
    );
  });

  afterEach(() => {
    vi.doUnmock("@/lib/pixie/ai/orchestrator");
    vi.resetModules();
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
