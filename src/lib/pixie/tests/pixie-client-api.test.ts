import { afterEach, describe, expect, it, vi } from "vitest";

import { PixieChatApiError, sendPixieMessage } from "@/lib/pixie/client/api";
import { createEmptyPixieTripState } from "@/lib/pixie/planner-state";

describe("Pixie client API", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a safe error for malformed NDJSON stream events", async () => {
    globalThis.fetch = vi.fn(async () => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"type":"turn_started","turnId":"turn_test"}\n{bad json}\n'));
          controller.close();
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      });
    }) as typeof fetch;

    await expect(
      sendPixieMessage({
        state: createEmptyPixieTripState("2026-07-12T12:00:00.000Z"),
        message: "Hi",
        recentMessages: [],
        draftId: "draft_test",
        onEvent: vi.fn(),
      }),
    ).rejects.toMatchObject({
      error: {
        code: "malformed_stream_event",
        message: "Pixie returned an unreadable response. Your trip draft is still safe.",
      },
    });
  });
});
