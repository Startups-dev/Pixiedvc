import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { pixieAiError, type PixieAiError } from "@/lib/pixie/ai/errors";
import { streamPixiePlannerTurn, type PixiePlannerStreamEvent } from "@/lib/pixie/ai/orchestrator";
import { createMemoryPixieRateLimiter, PIXIE_RATE_LIMIT_DEFAULTS } from "@/lib/pixie/ai/rate-limit";
import { getPixieAiConfig, PIXIE_AI_LIMITS } from "@/lib/pixie/ai/safety";
import { pixieRecentMessageSchema } from "@/lib/pixie/ai/schemas";
import { pixieTripStateSchema } from "@/lib/pixie/schema";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 96 * 1024;

const chatRequestSchema = z
  .object({
    state: pixieTripStateSchema,
    message: z.string().trim().min(1).max(PIXIE_AI_LIMITS.maxInputChars),
    recentMessages: z.array(pixieRecentMessageSchema).max(PIXIE_AI_LIMITS.maxRecentMessages).default([]),
    draftId: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

const globalPixieChatRoute = globalThis as typeof globalThis & {
  __pixieChatRateLimiter?: ReturnType<typeof createMemoryPixieRateLimiter>;
};

const rateLimiter = globalPixieChatRoute.__pixieChatRateLimiter ?? createMemoryPixieRateLimiter();
if (!globalPixieChatRoute.__pixieChatRateLimiter) {
  globalPixieChatRoute.__pixieChatRateLimiter = rateLimiter;
}

function noStoreHeaders(extra?: HeadersInit) {
  return {
    "Cache-Control": "no-store, max-age=0",
    ...extra,
  };
}

function isPixiePublicEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.PIXIE_PUBLIC_ENABLED === "true") return true;
  if (env.PIXIE_PUBLIC_ENABLED === "false") return false;
  return env.NODE_ENV !== "production";
}

function rateLimitWindowMs(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(env.PIXIE_RATE_LIMIT_WINDOW_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : PIXIE_RATE_LIMIT_DEFAULTS.windowMs;
}

function rateLimitMaxRequests(env: NodeJS.ProcessEnv = process.env) {
  const parsed = Number.parseInt(env.PIXIE_RATE_LIMIT_MAX_REQUESTS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : PIXIE_RATE_LIMIT_DEFAULTS.anonymousPerMinute;
}

function requestIpHash(request: Request) {
  const headers = request.headers;
  const raw =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown";
  return createHash("sha256").update(`pixie:${raw}`).digest("hex").slice(0, 32);
}

function safeError(code: PixieAiError["code"] | "pixie_disabled" | "invalid_json", message: string, status: number, retryAfterMs?: number) {
  return NextResponse.json(
    { ok: false, error: { code, message, retryAfterMs } },
    {
      status,
      headers: noStoreHeaders(retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined),
    },
  );
}

function sanitizeStreamEvent(event: PixiePlannerStreamEvent): PixiePlannerStreamEvent {
  if (event.type === "turn_failed") {
    return {
      type: "turn_failed",
      turnId: event.turnId,
      error: pixieAiError(event.error.code, safeErrorMessage(event.error), event.error.path, {
        status: event.error.status,
        retryAfterMs: event.error.retryAfterMs,
      }),
    };
  }
  return event;
}

function safeErrorMessage(error: PixieAiError) {
  if (error.code === "invalid_model_output" && /planning turn within the current model capacity/i.test(error.message)) {
    return "Hara could not finish this planning turn in one pass. Please send the availability details in two smaller parts, and Hara can continue from there.";
  }

  switch (error.code) {
    case "message_too_large":
      return "That message is a little too long. Try sending it in two parts.";
    case "state_too_large":
      return "This draft is too large to process safely.";
    case "rate_limited":
      return "Hara is temporarily busy. Please try again in a moment.";
    case "configuration_error":
    case "model_not_found":
    case "authentication_failed":
    case "provider_unavailable":
    case "provider_timeout":
      return "Hara is having trouble responding right now. Your trip draft is still safe.";
    default:
      return "Hara could not complete that turn safely.";
  }
}

function ndjsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export async function POST(request: Request) {
  if (!isPixiePublicEnabled()) {
    return safeError("pixie_disabled", "Hara is not available yet.", 404);
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return safeError("state_too_large", "Hara request is too large.", 413);
  }

  try {
    getPixieAiConfig();
  } catch {
    return safeError("configuration_error", "Hara is not configured for public planning yet.", 503);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError("invalid_json", "Request body must be valid JSON.", 400);
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return safeError("invalid_model_output", parsed.error.issues[0]?.message ?? "Invalid Hara request.", 400);
  }

  const windowMs = rateLimitWindowMs();
  const limit = rateLimitMaxRequests();
  const ipLimit = rateLimiter.check({ kind: "anonymous_ip", value: requestIpHash(request) }, { limit, windowMs });
  if (!ipLimit.allowed) {
    return safeError("rate_limited", "Hara is temporarily busy. Please try again in a moment.", 429, ipLimit.retryAfterMs);
  }

  if (parsed.data.draftId) {
    const draftLimit = rateLimiter.check({ kind: "draft_session", value: parsed.data.draftId }, { limit: PIXIE_RATE_LIMIT_DEFAULTS.draftPerMinute, windowMs });
    if (!draftLimit.allowed) {
      return safeError("rate_limited", "Hara is temporarily busy. Please try again in a moment.", 429, draftLimit.retryAfterMs);
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of streamPixiePlannerTurn({
          state: parsed.data.state,
          message: parsed.data.message,
          recentMessages: parsed.data.recentMessages,
          context: { sessionId: parsed.data.draftId },
        })) {
          if (request.signal.aborted) break;
          controller.enqueue(encoder.encode(ndjsonLine(sanitizeStreamEvent(event))));
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            ndjsonLine({
              type: "turn_failed",
              turnId: "pixie_turn_route_error",
              error: pixieAiError("tool_execution_failed", "Hara could not complete that turn safely."),
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: noStoreHeaders({
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    }),
  });
}
