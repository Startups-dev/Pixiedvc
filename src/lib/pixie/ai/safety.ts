import { PIXIE_LIMITS } from "@/lib/pixie/constants";
import type { PixieAiError } from "@/lib/pixie/ai/errors";
import { pixieAiError } from "@/lib/pixie/ai/errors";
import type { PixieRecentMessage } from "@/lib/pixie/ai/schemas";

export const PIXIE_AI_LIMITS = {
  maxInputChars: 4000,
  maxRecentMessages: PIXIE_LIMITS.maxRecentDraftMessages,
  maxRecentMessageChars: 1000,
  maxRecentMessagesTotalChars: 4000,
  maxPlannerStateBytes: 80 * 1024,
  maxModelOutputChars: 8000,
  maxToolCallsPerTurn: 5,
  maxToolRounds: 2,
  maxOrchestrationMs: 20_000,
  maxToolExecutionMs: 5000,
  defaultModelTimeoutMs: 12_000,
  defaultMaxOutputTokens: 1200,
} as const;

export function getPixieAiConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    model: env.PIXIE_MODEL || "gpt-5.6",
    maxOutputTokens: parsePositiveInt(env.PIXIE_MAX_OUTPUT_TOKENS, PIXIE_AI_LIMITS.defaultMaxOutputTokens),
    modelTimeoutMs: parsePositiveInt(env.PIXIE_MODEL_TIMEOUT_MS, PIXIE_AI_LIMITS.defaultModelTimeoutMs),
    maxToolRounds: parsePositiveInt(env.PIXIE_MAX_TOOL_ROUNDS, PIXIE_AI_LIMITS.maxToolRounds),
    maxInputChars: parsePositiveInt(env.PIXIE_MAX_INPUT_CHARS, PIXIE_AI_LIMITS.maxInputChars),
    maxRecentMessages: parsePositiveInt(env.PIXIE_MAX_RECENT_MESSAGES, PIXIE_AI_LIMITS.maxRecentMessages),
  };
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeUserMessage(message: string, maxChars: number = PIXIE_AI_LIMITS.maxInputChars) {
  const normalized = message.trim().replace(/\s+/g, " ");
  if (normalized.length > maxChars) {
    return { ok: false as const, error: pixieAiError("message_too_large", `Message exceeds ${maxChars} characters.`) };
  }
  return { ok: true as const, message: normalized };
}

export function limitRecentMessages(messages: PixieRecentMessage[], maxMessages: number = PIXIE_AI_LIMITS.maxRecentMessages) {
  const limited = messages
    .slice(-maxMessages)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, PIXIE_AI_LIMITS.maxRecentMessageChars),
    }))
    .filter((message) => message.content.length > 0);
  let total = 0;
  const result: PixieRecentMessage[] = [];
  for (const message of limited.reverse()) {
    total += message.content.length;
    if (total > PIXIE_AI_LIMITS.maxRecentMessagesTotalChars) break;
    result.unshift(message);
  }
  return result;
}

export function validatePlannerStateSize(state: unknown): PixieAiError | null {
  const bytes = new TextEncoder().encode(JSON.stringify(state)).byteLength;
  if (bytes > PIXIE_AI_LIMITS.maxPlannerStateBytes) {
    return pixieAiError("state_too_large", `Planner state exceeds ${PIXIE_AI_LIMITS.maxPlannerStateBytes} bytes.`);
  }
  return null;
}

export function detectPromptInjectionAttempt(message: string): PixieAiError | null {
  const normalized = message.toLowerCase();
  const riskyPairs = [
    ["ignore", "instructions"],
    ["reveal", "system prompt"],
    ["show", "api key"],
    ["bypass", "tool"],
  ];
  const detected = riskyPairs.some(([a, b]) => normalized.includes(a) && normalized.includes(b));
  return detected ? pixieAiError("prompt_injection_detected", "Message contained instruction-overriding language; Pixie will treat it only as user text.") : null;
}

export function withTimeoutSignal(timeoutMs: number, parent?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const onAbort = () => controller.abort(parent?.reason);
  if (parent) parent.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeout);
      if (parent) parent.removeEventListener("abort", onAbort);
    },
  };
}
