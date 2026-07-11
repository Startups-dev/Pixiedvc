export type PixieRateLimitKey = {
  kind: "anonymous_ip" | "authenticated_user" | "draft_session" | "global_provider";
  value: string;
};

export type PixieRateLimitResult =
  | { allowed: true; remaining: number; retryAfterMs?: undefined }
  | { allowed: false; remaining: 0; retryAfterMs: number };

export type PixieRateLimiter = {
  check: (key: PixieRateLimitKey, options?: { limit?: number; windowMs?: number; nowMs?: number }) => PixieRateLimitResult;
};

export const PIXIE_RATE_LIMIT_DEFAULTS = {
  anonymousPerMinute: 12,
  authenticatedPerMinute: 30,
  draftPerMinute: 20,
  globalProviderPerMinute: 120,
  windowMs: 60_000,
} as const;

export function createMemoryPixieRateLimiter(): PixieRateLimiter {
  const store = new Map<string, number[]>();
  return {
    check(key, options = {}) {
      const now = options.nowMs ?? Date.now();
      const windowMs = options.windowMs ?? PIXIE_RATE_LIMIT_DEFAULTS.windowMs;
      const limit = options.limit ?? PIXIE_RATE_LIMIT_DEFAULTS.anonymousPerMinute;
      const id = `${key.kind}:${key.value}`;
      const history = (store.get(id) ?? []).filter((timestamp) => timestamp > now - windowMs);
      if (history.length >= limit) {
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, windowMs - (now - history[0])) };
      }
      history.push(now);
      store.set(id, history);
      return { allowed: true, remaining: Math.max(0, limit - history.length) };
    },
  };
}

