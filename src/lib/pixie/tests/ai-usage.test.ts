import { describe, expect, it } from "vitest";

import { createMemoryPixieRateLimiter } from "@/lib/pixie/ai/rate-limit";
import { emptyPixieUsage, mergePixieUsage } from "@/lib/pixie/ai/usage";

describe("Pixie AI usage and rate limits", () => {
  it("merges token usage without cost estimation", () => {
    const usage = mergePixieUsage(
      emptyPixieUsage("openai", "gpt-4o-mini", "prompt"),
      { provider: "openai", model: "gpt-4o-mini", promptVersion: "prompt", inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      2,
    );
    expect(usage.totalTokens).toBe(15);
    expect(usage.toolCalls).toBe(2);
    expect(usage.estimatedCostCents).toBeUndefined();
  });

  it("memory rate limiter returns retry metadata", () => {
    const limiter = createMemoryPixieRateLimiter();
    expect(limiter.check({ kind: "anonymous_ip", value: "hash" }, { limit: 1, nowMs: 1000 }).allowed).toBe(true);
    const blocked = limiter.check({ kind: "anonymous_ip", value: "hash" }, { limit: 1, nowMs: 1001 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});

