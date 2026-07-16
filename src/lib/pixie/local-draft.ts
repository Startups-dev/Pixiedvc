import { PIXIE_LIMITS, PIXIE_LOCAL_DRAFT_STORAGE_KEY, PIXIE_LOCAL_DRAFT_VERSION } from "@/lib/pixie/constants";
import { pixieRecentMessageSchema } from "@/lib/pixie/ai/schemas";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import { pixieTripStateSchema, type PixieTripState } from "@/lib/pixie/schema";
import type { PixieDraftParseResult } from "@/lib/pixie/types";
import { z } from "zod";

const recentMessageSchema = pixieRecentMessageSchema.extend({
  content: z.string().trim().min(1).max(PIXIE_LIMITS.maxRecentDraftMessageLength),
});

const pixieLocalDraftEnvelopeSchema = z
  .object({
    draftVersion: z.literal(PIXIE_LOCAL_DRAFT_VERSION),
    savedAt: z.string().datetime(),
    state: pixieTripStateSchema,
    recentMessages: z.array(recentMessageSchema).max(PIXIE_LIMITS.maxRecentDraftMessages).default([]),
  })
  .strict();

export type PixieLocalDraftEnvelope = z.infer<typeof pixieLocalDraftEnvelopeSchema>;

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function freshResult(reason: PixieDraftParseResult["reason"], errors: string[] = []): PixieDraftParseResult {
  const state = createEmptyPixieTripState();
  if (reason === "none") {
    return { ok: true, state, recovered: false, reason };
  }
  return { ok: false, state, recovered: true, reason, errors };
}

function stripLegacyRecentMessageMetadata(value: unknown) {
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.recentMessages)) return value;
  return {
    ...record,
    recentMessages: record.recentMessages.map((message) => {
      if (!message || typeof message !== "object") return message;
      const entry = message as Record<string, unknown>;
      return {
        role: entry.role,
        content: entry.content,
      };
    }),
  };
}

export function serializePixieDraft(
  state: PixieTripState,
  options: { recentMessages?: PixieLocalDraftEnvelope["recentMessages"]; now?: string } = {},
) {
  const normalized = normalizePixieTripState(state, { now: options.now });
  const envelope: PixieLocalDraftEnvelope = {
    draftVersion: PIXIE_LOCAL_DRAFT_VERSION,
    savedAt: options.now ?? new Date().toISOString(),
    state: normalized,
    recentMessages: (options.recentMessages ?? []).slice(-PIXIE_LIMITS.maxRecentDraftMessages),
  };
  const json = JSON.stringify(pixieLocalDraftEnvelopeSchema.parse(envelope));
  if (byteLength(json) > PIXIE_LIMITS.maxLocalDraftBytes) {
    throw new Error(`Pixie draft exceeds ${PIXIE_LIMITS.maxLocalDraftBytes} bytes.`);
  }
  return json;
}

export function migratePixieDraft(value: unknown): PixieDraftParseResult {
  if (!value || typeof value !== "object") {
    return freshResult("invalid_state", ["Draft payload is not an object."]);
  }

  const record = value as Record<string, unknown>;
  if (record.draftVersion === PIXIE_LOCAL_DRAFT_VERSION) {
    const parsed = pixieLocalDraftEnvelopeSchema.safeParse(record);
    const recoveredParsed = parsed.success
      ? parsed
      : pixieLocalDraftEnvelopeSchema.safeParse(stripLegacyRecentMessageMetadata(record));
    if (recoveredParsed.success) {
      return {
        ok: true,
        state: normalizePixieTripState(recoveredParsed.data.state, { preserveUpdatedAt: true }),
        recovered: !parsed.success,
        reason: parsed.success ? "none" : "migrated",
      };
    }
    const issues = parsed.success ? ["Draft payload is invalid."] : parsed.error.issues.map((issue) => issue.message);
    return freshResult("invalid_state", issues);
  }

  if (record.draftVersion === undefined && record.state && typeof record.state === "object") {
    const parsedState = pixieTripStateSchema.safeParse(record.state);
    if (!parsedState.success) {
      return freshResult("invalid_state", parsedState.error.issues.map((issue) => issue.message));
    }
    return {
      ok: true,
      state: normalizePixieTripState(parsedState.data),
      recovered: true,
      reason: "migrated",
    };
  }

  return freshResult("unsupported_draft_version", [`Unsupported Pixie draft version: ${String(record.draftVersion)}`]);
}

export function deserializePixieDraft(value: string | null | undefined): PixieDraftParseResult {
  if (!value) return freshResult("empty", ["No Pixie draft was found."]);
  if (byteLength(value) > PIXIE_LIMITS.maxLocalDraftBytes) {
    return freshResult("oversized", [`Draft exceeds ${PIXIE_LIMITS.maxLocalDraftBytes} bytes.`]);
  }

  try {
    return migratePixieDraft(JSON.parse(value));
  } catch {
    return freshResult("corrupt_json", ["Draft JSON could not be parsed."]);
  }
}

export function resetPixieDraft() {
  return createEmptyPixieTripState();
}

export { PIXIE_LOCAL_DRAFT_STORAGE_KEY };
