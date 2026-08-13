import { PIXIE_LIMITS, PIXIE_LOCAL_DRAFT_STORAGE_KEY, PIXIE_LOCAL_DRAFT_VERSION } from "@/lib/pixie/constants";
import { pixieRecentMessageSchema } from "@/lib/pixie/ai/schemas";
import { createEmptyPixieTripState, normalizePixieTripState } from "@/lib/pixie/planner-state";
import {
  pixieAccessibilitySchema,
  pixieBudgetSchema,
  pixieDatesSchema,
  pixieDvcContextSchema,
  pixieGeneratedSchema,
  pixieMetadataSchema,
  pixiePartySchema,
  pixiePlanningWorkspaceSchema,
  pixieWorkspaceActivityPlanSchema,
  pixieWorkspaceAttentionItemSchema,
  pixieWorkspaceDiningPlanSchema,
  pixieWorkspaceLodgingPlanSchema,
  pixieWorkspaceParkPlanSchema,
  pixieWorkingItineraryNightSchema,
  pixieAvailabilityObservationSchema,
  pixieActivePlanningDecisionSchema,
  pixiePlanningStageSchema,
  pixiePreferencesSchema,
  pixieSelectedOptionsSchema,
  pixieTravellerSchema,
  pixieTripStateSchema,
  type PixieTripState,
} from "@/lib/pixie/schema";
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
const LODGING_ESTIMATE_STATUSES = new Set(["estimate", "unsupported", "not_requested"]);

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

function recoverObjectSection<T>(
  schema: { strip: () => { safeParse: (value: unknown) => { success: true; data: T } | { success: false } } },
  value: unknown,
) {
  if (!value || typeof value !== "object") return undefined;
  const parsed = schema.strip().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function recoverPartySection(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const travellers = Array.isArray(record.travellers)
    ? record.travellers
        .map((traveller) => pixieTravellerSchema.strip().safeParse(traveller))
        .filter((result): result is Extract<typeof result, { success: true }> => result.success)
        .map((result) => result.data)
    : undefined;
  return recoverObjectSection(pixiePartySchema, {
    ...record,
    ...(travellers ? { travellers } : {}),
  });
}

function safeWorkspaceItems<T>(
  values: unknown,
  schema: { strip: () => { safeParse: (value: unknown) => { success: true; data: T } | { success: false } } },
  maxItems: number = PIXIE_LIMITS.maxArrayItems,
) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const parsed = schema.strip().safeParse(item);
      return parsed.success ? parsed.data : null;
    })
    .filter((item): item is T => Boolean(item))
    .slice(0, maxItems);
}

function recoverLodgingPlans(values: unknown) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const pointsEstimateStatus = typeof record.pointsEstimateStatus === "string" && LODGING_ESTIMATE_STATUSES.has(record.pointsEstimateStatus)
        ? record.pointsEstimateStatus
        : undefined;
      const rentalEstimateStatus = typeof record.rentalEstimateStatus === "string" && LODGING_ESTIMATE_STATUSES.has(record.rentalEstimateStatus)
        ? record.rentalEstimateStatus
        : undefined;
      const sanitized = {
        ...record,
        checkIn: typeof record.checkIn === "string" ? record.checkIn : record.startDate,
        checkOut: typeof record.checkOut === "string" ? record.checkOut : record.endDate,
        startDate: typeof record.startDate === "string" ? record.startDate : record.checkIn,
        endDate: typeof record.endDate === "string" ? record.endDate : record.checkOut,
        roomType: typeof record.roomType === "string" ? record.roomType : undefined,
        numberOfNights: Number.isInteger(record.numberOfNights) ? record.numberOfNights : undefined,
        estimatedPoints: Number.isInteger(record.estimatedPoints) ? record.estimatedPoints : undefined,
        pointsEstimateStatus,
        estimatedRentalCostCents: Number.isInteger(record.estimatedRentalCostCents) ? record.estimatedRentalCostCents : undefined,
        rentalEstimateStatus,
        estimateNotes: typeof record.estimateNotes === "string" ? record.estimateNotes : undefined,
      };
      const parsed = pixieWorkspaceLodgingPlanSchema.strip().safeParse(sanitized);
      return parsed.success ? parsed.data : null;
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 8);
}

function recoverPlanningWorkspaceSection(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const parsed = recoverObjectSection(pixiePlanningWorkspaceSchema, value);
  if (parsed) return parsed;

  const record = value as Record<string, unknown>;
  const recovered = {
    workingItinerary: safeWorkspaceItems(record.workingItinerary, pixieWorkingItineraryNightSchema, PIXIE_LIMITS.maxTripDurationNights),
    availabilityObservations: safeWorkspaceItems(record.availabilityObservations, pixieAvailabilityObservationSchema),
    activeDecisions: safeWorkspaceItems(record.activeDecisions, pixieActivePlanningDecisionSchema),
    lodgingPlans: recoverLodgingPlans(record.lodgingPlans),
    parkPlans: safeWorkspaceItems(record.parkPlans, pixieWorkspaceParkPlanSchema, PIXIE_LIMITS.maxTripDurationNights + 4),
    diningPlans: safeWorkspaceItems(record.diningPlans, pixieWorkspaceDiningPlanSchema, 16),
    activityPlans: safeWorkspaceItems(record.activityPlans, pixieWorkspaceActivityPlanSchema, 16),
    attentionItems: safeWorkspaceItems(record.attentionItems, pixieWorkspaceAttentionItemSchema, 8),
  };

  const recoveredParsed = pixiePlanningWorkspaceSchema.safeParse(recovered);
  return recoveredParsed.success ? recoveredParsed.data : undefined;
}

function recoverTripState(value: unknown): PixieTripState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (record.destination !== undefined && record.destination !== "walt_disney_world") return undefined;
  const base = createEmptyPixieTripState();
  const planningStage = pixiePlanningStageSchema.safeParse(record.planningStage);
  const recovered = {
    ...base,
    destination: record.destination === "walt_disney_world" ? "walt_disney_world" : base.destination,
    planningStage: planningStage.success ? planningStage.data : base.planningStage,
    tripName: typeof record.tripName === "string" ? record.tripName : base.tripName,
    dates: recoverObjectSection(pixieDatesSchema, record.dates) ?? base.dates,
    party: recoverPartySection(record.party) ?? base.party,
    budget: recoverObjectSection(pixieBudgetSchema, record.budget) ?? base.budget,
    preferences: recoverObjectSection(pixiePreferencesSchema, record.preferences) ?? base.preferences,
    accessibility: recoverObjectSection(pixieAccessibilitySchema, record.accessibility) ?? base.accessibility,
    dvcContext: recoverObjectSection(pixieDvcContextSchema, record.dvcContext) ?? base.dvcContext,
    planningWorkspace: recoverPlanningWorkspaceSection(record.planningWorkspace) ?? base.planningWorkspace,
    generated: recoverObjectSection(pixieGeneratedSchema, record.generated) ?? base.generated,
    selectedOptions: recoverObjectSection(pixieSelectedOptionsSchema, record.selectedOptions) ?? base.selectedOptions,
    metadata: recoverObjectSection(pixieMetadataSchema, record.metadata) ?? base.metadata,
  };

  try {
    return normalizePixieTripState(recovered, { preserveUpdatedAt: true });
  } catch {
    return undefined;
  }
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
      try {
        return {
          ok: true,
          state: normalizePixieTripState(recoveredParsed.data.state, { preserveUpdatedAt: true }),
          recovered: !parsed.success,
          reason: parsed.success ? "none" : "migrated",
        };
      } catch {
        const recoveredState = recoverTripState(record.state);
        if (recoveredState) {
          return {
            ok: true,
            state: recoveredState,
            recovered: true,
            reason: "migrated",
          };
        }
      }
    }
    const recoveredState = recoverTripState(record.state);
    if (recoveredState) {
      return {
        ok: true,
        state: recoveredState,
        recovered: true,
        reason: "migrated",
      };
    }
    const issues = parsed.success ? ["Draft payload is invalid."] : parsed.error.issues.map((issue) => issue.message);
    return freshResult("invalid_state", issues);
  }

  if (record.draftVersion === undefined && record.state && typeof record.state === "object") {
    const parsedState = pixieTripStateSchema.safeParse(record.state);
    if (parsedState.success) {
      return {
        ok: true,
        state: normalizePixieTripState(parsedState.data),
        recovered: true,
        reason: "migrated",
      };
    }
    const recoveredState = recoverTripState(record.state);
    if (recoveredState) {
      return {
        ok: true,
        state: recoveredState,
        recovered: true,
        reason: "migrated",
      };
    }
    return freshResult("invalid_state", parsedState.error.issues.map((issue) => issue.message));
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
