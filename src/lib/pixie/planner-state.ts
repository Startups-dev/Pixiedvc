import { PIXIE_AGE_GROUPS, PIXIE_LIMITS, PIXIE_SCHEMA_VERSION } from "@/lib/pixie/constants";
import {
  pixieTripPatchSchema,
  pixieTripStateSchema,
  type PixieTripPatch,
  type PixieTripState,
  type PixieTraveller,
} from "@/lib/pixie/schema";
import type { PixieAgeGroup, PixiePatchError, PixiePatchResult, PixiePlanningStage } from "@/lib/pixie/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function nowIso() {
  return new Date().toISOString();
}

function parseDateOnlyToUtcMs(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(date).toISOString().slice(0, 10);
  return roundTrip === value ? date : null;
}

export function calculateDateOnlyNights(arrivalDate?: string, departureDate?: string) {
  if (!arrivalDate || !departureDate) return undefined;
  const start = parseDateOnlyToUtcMs(arrivalDate);
  const end = parseDateOnlyToUtcMs(departureDate);
  if (start === null || end === null) return undefined;
  const nights = Math.round((end - start) / MS_PER_DAY);
  return nights > 0 ? nights : undefined;
}

export function normalizeStringArray(values: string[] | undefined, maxItems: number = PIXIE_LIMITS.maxPreferencesPerGroup) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values ?? []) {
    const trimmed = value.trim().replace(/\s+/g, " ");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= maxItems) break;
  }
  return result;
}

export function deriveAgeGroup(age?: number, category?: PixieTraveller["category"]): PixieAgeGroup {
  if (typeof age === "number") {
    if (age < 2) return "infant";
    if (age <= 5) return "preschooler";
    if (age <= 12) return "child";
    if (age <= 17) return "teen";
    return "adult";
  }
  if (category === "adult") return "adult";
  if (category === "infant") return "infant";
  if (category === "child") return "child";
  return "unknown";
}

function normalizeTraveller(traveller: PixieTraveller): PixieTraveller {
  return {
    ...traveller,
    displayName: traveller.displayName?.trim() || undefined,
    label: traveller.label?.trim() || undefined,
    ageGroup: deriveAgeGroup(traveller.age, traveller.category),
    interests: normalizeStringArray(traveller.interests, PIXIE_LIMITS.maxTravellerInterests),
    notes: traveller.notes?.trim() || undefined,
    accessibilityNeeds: traveller.accessibilityNeeds?.trim() || undefined,
  };
}

function normalizeOptionalText(value: string | undefined) {
  return value?.trim().replace(/\s+/g, " ") || undefined;
}

function normalizeById<T extends { id: string }>(values: T[] | undefined, normalizeItem: (item: T) => T, maxItems: number = PIXIE_LIMITS.maxArrayItems) {
  const byId = new Map<string, T>();
  for (const item of values ?? []) {
    const normalized = normalizeItem({ ...item, id: item.id.trim() });
    byId.set(normalized.id, normalized);
  }
  return Array.from(byId.values()).slice(-maxItems);
}

function mergeByKey<T>(current: T[], incoming: T[] | undefined, keyFor: (item: T) => string, maxItems: number = PIXIE_LIMITS.maxArrayItems) {
  const byKey = new Map<string, T>();
  for (const item of current) byKey.set(keyFor(item), item);
  for (const item of incoming ?? []) {
    const key = keyFor(item);
    byKey.set(key, { ...byKey.get(key), ...item });
  }
  return Array.from(byKey.values()).slice(-maxItems);
}

function derivePlanningStageFromState(state: PixieTripState): PixiePlanningStage {
  const datesComplete = Boolean(state.dates.arrivalDate && state.dates.departureDate && state.dates.numberOfNights);
  const hasUsableDates = datesComplete || Boolean(state.dates.flexibleDates && (state.dates.dateNotes || state.dates.arrivalDate));
  const partyComplete = Boolean((state.party.totalPartySize ?? 0) > 0);
  const hasPreferences =
    state.preferences.resortPriorities.length > 0 ||
    state.preferences.parkPriorities.length > 0 ||
    state.preferences.preferredResorts.length > 0 ||
    state.preferences.attractionInterests.length > 0 ||
    Boolean(state.preferences.generalNotes);
  const hasCandidateResort = Boolean(state.selectedOptions.selectedResortSlug || state.selectedOptions.selectedResortId);
  const hasRoom = Boolean(state.selectedOptions.selectedRoomType || state.preferences.roomPreferences.length > 0);
  const hasItineraryInputs =
    Boolean(state.dates.numberOfNights || state.dates.flexibleDates) &&
    (state.preferences.parkPriorities.length > 0 ||
      state.preferences.attractionInterests.length > 0 ||
      state.preferences.vacationPace !== "unknown" ||
      state.preferences.parkDayIntention === true);

  if (datesComplete && partyComplete && hasCandidateResort && hasRoom) return "booking_ready";
  if (hasUsableDates && partyComplete && hasPreferences && hasItineraryInputs) return "plan_ready";
  if (hasUsableDates && partyComplete && hasPreferences) return "recommendation_ready";
  if (hasPreferences) return "preferences_defined";
  if (partyComplete) return "party_defined";
  if (hasUsableDates) return "dates_defined";
  if (state.tripName || state.dates.dateNotes || state.party.partyNotes || state.preferences.generalNotes) return "discovering";
  return "new";
}

export function evaluatePixiePlanningStage(state: PixieTripState): PixiePlanningStage {
  return derivePlanningStageFromState(normalizePixieTripState(state, { preserveUpdatedAt: true }));
}

export function normalizePixieTripState(
  input: unknown,
  options: { now?: string; preserveUpdatedAt?: boolean } = {},
): PixieTripState {
  const parsed = pixieTripStateSchema.parse(input);
  const timestamp = options.now ?? nowIso();
  const createdAt = parsed.metadata.createdAt ?? timestamp;

  const numberOfNights = calculateDateOnlyNights(parsed.dates.arrivalDate, parsed.dates.departureDate);
  if (parsed.dates.arrivalDate && parsed.dates.departureDate) {
    if (!numberOfNights) {
      throw new Error("Departure date must be after arrival date.");
    }
    if (numberOfNights > PIXIE_LIMITS.maxTripDurationNights) {
      throw new Error(`Trip duration cannot exceed ${PIXIE_LIMITS.maxTripDurationNights} nights.`);
    }
  }

  const travellers = parsed.party.travellers.map(normalizeTraveller);
  const travellerAdults = travellers.filter((traveller) => traveller.ageGroup === "adult").length;
  const travellerChildren = travellers.filter((traveller) => traveller.ageGroup !== "adult" && traveller.ageGroup !== "unknown").length;
  const adultCount =
    parsed.party.adults !== undefined ? Math.max(parsed.party.adults, travellerAdults) : travellerAdults > 0 ? travellerAdults : undefined;
  const childCount =
    parsed.party.children !== undefined ? Math.max(parsed.party.children, travellerChildren) : travellerChildren > 0 ? travellerChildren : undefined;
  const totalPartySize =
    adultCount !== undefined ? adultCount + (childCount ?? 0) : parsed.party.totalPartySize !== undefined ? parsed.party.totalPartySize : undefined;
  if ((totalPartySize ?? 0) > PIXIE_LIMITS.maxPartySize) {
    throw new Error(`Party size cannot exceed ${PIXIE_LIMITS.maxPartySize}.`);
  }

  const ageGroupSummary = Object.fromEntries(PIXIE_AGE_GROUPS.map((group) => [group, 0])) as Record<PixieAgeGroup, number>;
  for (const traveller of travellers) {
    ageGroupSummary[traveller.ageGroup ?? "unknown"] += 1;
  }

  const normalized: PixieTripState = {
    ...parsed,
    schemaVersion: PIXIE_SCHEMA_VERSION,
    tripName: parsed.tripName?.trim() || undefined,
    dates: {
      ...parsed.dates,
      dateNotes: parsed.dates.dateNotes?.trim() || undefined,
      numberOfNights,
    },
    party: {
      ...parsed.party,
      adults: adultCount,
      children: childCount,
      travellers,
      totalPartySize,
      adultCount,
      childCount,
      ageGroupSummary,
      partyNotes: parsed.party.partyNotes?.trim() || undefined,
    },
    budget: {
      ...parsed.budget,
      currency: parsed.budget.currency ?? (parsed.budget.amountCents !== undefined ? "USD" : undefined),
      notes: parsed.budget.notes?.trim() || undefined,
    },
    preferences: {
      ...parsed.preferences,
      parkPriorities: normalizeStringArray(parsed.preferences.parkPriorities),
      favoriteCharactersOrThemes: normalizeStringArray(parsed.preferences.favoriteCharactersOrThemes),
      attractionInterests: normalizeStringArray(parsed.preferences.attractionInterests),
      resortPriorities: normalizeStringArray(parsed.preferences.resortPriorities),
      preferredResorts: normalizeStringArray(parsed.preferences.preferredResorts),
      excludedResorts: normalizeStringArray(parsed.preferences.excludedResorts),
      roomPreferences: normalizeStringArray(parsed.preferences.roomPreferences),
      transportationPreferences: normalizeStringArray(parsed.preferences.transportationPreferences),
      diningPreferences: normalizeStringArray(parsed.preferences.diningPreferences),
      celebrationNotes: parsed.preferences.celebrationNotes?.trim() || undefined,
      generalNotes: parsed.preferences.generalNotes?.trim() || undefined,
    },
    dvcContext: {
      ...parsed.dvcContext,
      homeResort: normalizeOptionalText(parsed.dvcContext.homeResort),
      contracts: normalizeById(parsed.dvcContext.contracts, (contract) => ({
        ...contract,
        homeResort: normalizeOptionalText(contract.homeResort),
        notes: contract.notes?.trim() || undefined,
      })),
      bookingWindowContext: parsed.dvcContext.bookingWindowContext?.trim() || undefined,
      useYear: normalizeOptionalText(parsed.dvcContext.useYear),
      pointLots: normalizeById(parsed.dvcContext.pointLots, (lot) => ({
        ...lot,
        contractId: normalizeOptionalText(lot.contractId),
        notes: lot.notes?.trim() || undefined,
      })),
      existingReservationSegments: normalizeStringArray(parsed.dvcContext.existingReservationSegments, PIXIE_LIMITS.maxArrayItems),
      proposedReservationChanges: normalizeStringArray(parsed.dvcContext.proposedReservationChanges, PIXIE_LIMITS.maxArrayItems),
      planningRisks: normalizeStringArray(parsed.dvcContext.planningRisks, PIXIE_LIMITS.maxArrayItems),
      unresolvedDecisions: normalizeStringArray(parsed.dvcContext.unresolvedDecisions, PIXIE_LIMITS.maxArrayItems),
    },
    planningWorkspace: {
      workingItinerary: [...parsed.planningWorkspace.workingItinerary]
        .map((night) => ({
          ...night,
          resort: normalizeOptionalText(night.resort),
          roomType: normalizeOptionalText(night.roomType),
          alternatives: night.alternatives.map((alternative) => ({
            ...alternative,
            resort: normalizeOptionalText(alternative.resort),
            roomType: normalizeOptionalText(alternative.roomType),
            rationale: alternative.rationale?.trim() || undefined,
          })),
          rationale: night.rationale?.trim() || undefined,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      availabilityObservations: [...parsed.planningWorkspace.availabilityObservations]
        .map((observation) => ({
          ...observation,
          resort: normalizeOptionalText(observation.resort) ?? observation.resort,
          roomType: normalizeOptionalText(observation.roomType),
          notes: observation.notes?.trim() || undefined,
        }))
        .sort((a, b) => `${a.date}|${a.resort}`.localeCompare(`${b.date}|${b.resort}`)),
      activeDecisions: parsed.planningWorkspace.activeDecisions.map((decision) => ({
        ...decision,
        label: normalizeOptionalText(decision.label) ?? decision.label,
        currentSecureOption: normalizeOptionalText(decision.currentSecureOption),
        potentialBenefit: decision.potentialBenefit?.trim() || undefined,
        risk: decision.risk?.trim() || undefined,
      })),
    },
    metadata: {
      ...parsed.metadata,
      createdAt,
      updatedAt: options.preserveUpdatedAt ? (parsed.metadata.updatedAt ?? timestamp) : timestamp,
    },
  };

  normalized.planningStage = derivePlanningStageFromState(normalized);
  return pixieTripStateSchema.parse(normalized);
}

export function createEmptyPixieTripState(now = nowIso()): PixieTripState {
  return normalizePixieTripState(
    {
      schemaVersion: PIXIE_SCHEMA_VERSION,
      destination: "walt_disney_world",
      planningStage: "new",
      dates: {},
      party: {},
      budget: {},
      preferences: {},
      accessibility: {},
      dvcContext: {},
      planningWorkspace: {},
      generated: {},
      selectedOptions: {},
      metadata: {
        createdAt: now,
        updatedAt: now,
        source: "pixie",
      },
    },
    { now, preserveUpdatedAt: true },
  );
}

function zodErrors(error: { issues: Array<{ message: string; path: Array<string | number> }> }, code: PixiePatchError["code"]) {
  return error.issues.map((issue) => ({
    code,
    message: issue.message,
    path: issue.path,
  }));
}

function createTravellerId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `traveller_${crypto.randomUUID()}`;
  }
  return `traveller_${Math.random().toString(36).slice(2, 12)}`;
}

export function applyPixieTripPatch(
  currentState: unknown,
  patch: unknown,
  options: { now?: string } = {},
): PixiePatchResult {
  const currentParsed = pixieTripStateSchema.safeParse(currentState);
  if (!currentParsed.success) {
    return { ok: false, errors: zodErrors(currentParsed.error, "INVALID_CURRENT_STATE") };
  }

  const patchParsed = pixieTripPatchSchema.safeParse(patch);
  if (!patchParsed.success) {
    return { ok: false, errors: zodErrors(patchParsed.error, "INVALID_PATCH") };
  }

  let next: PixieTripState;
  try {
    next = normalizePixieTripState(currentParsed.data, { now: options.now, preserveUpdatedAt: true });
  } catch (error) {
    return {
      ok: false,
      errors: [{ code: "INVALID_CURRENT_STATE", message: error instanceof Error ? error.message : "Invalid current state." }],
    };
  }

  const safePatch: PixieTripPatch = patchParsed.data;

  if (safePatch.destination) next.destination = safePatch.destination;
  if ("tripName" in safePatch) next.tripName = safePatch.tripName;
  if (safePatch.dates) next.dates = { ...next.dates, ...safePatch.dates };
  if (safePatch.budget) next.budget = { ...next.budget, ...safePatch.budget };
  if (safePatch.preferences) next.preferences = { ...next.preferences, ...safePatch.preferences };
  if (safePatch.accessibility) next.accessibility = { ...next.accessibility, ...safePatch.accessibility };
  if (safePatch.dvcContext) next.dvcContext = { ...next.dvcContext, ...safePatch.dvcContext };
  if (safePatch.planningWorkspace) {
    next.planningWorkspace = {
      ...next.planningWorkspace,
      ...safePatch.planningWorkspace,
      workingItinerary: mergeByKey(
        next.planningWorkspace.workingItinerary,
        safePatch.planningWorkspace.workingItinerary,
        (night) => night.date,
        PIXIE_LIMITS.maxTripDurationNights,
      ),
      availabilityObservations: mergeByKey(
        next.planningWorkspace.availabilityObservations,
        safePatch.planningWorkspace.availabilityObservations,
        (observation) => `${observation.date}|${observation.resort.toLowerCase()}|${observation.roomType?.toLowerCase() ?? ""}|${observation.source}`,
      ),
      activeDecisions: mergeByKey(next.planningWorkspace.activeDecisions, safePatch.planningWorkspace.activeDecisions, (decision) => decision.id),
    };
  }
  if (safePatch.selectedOptions) next.selectedOptions = { ...next.selectedOptions, ...safePatch.selectedOptions };
  if (safePatch.metadata) next.metadata = { ...next.metadata, ...safePatch.metadata };

  if (safePatch.party) {
    const { travellerOperations, ...partyPatch } = safePatch.party;
    next.party = { ...next.party, ...partyPatch };
    const travellers = [...next.party.travellers];
    for (const operation of travellerOperations ?? []) {
      if (operation.op === "addTraveller") {
        const id = operation.traveller.id ?? createTravellerId();
        if (travellers.some((traveller) => traveller.id === id)) {
          return { ok: false, errors: [{ code: "DUPLICATE_TRAVELLER_ID", message: `Traveller ${id} already exists.` }] };
        }
        if (travellers.length >= PIXIE_LIMITS.maxTravellers) {
          return { ok: false, errors: [{ code: "LIMIT_EXCEEDED", message: `Traveller count cannot exceed ${PIXIE_LIMITS.maxTravellers}.` }] };
        }
        travellers.push({ ...operation.traveller, id, category: operation.traveller.category ?? "unknown", interests: operation.traveller.interests ?? [] });
      } else if (operation.op === "updateTraveller") {
        const index = travellers.findIndex((traveller) => traveller.id === operation.id);
        if (index < 0) {
          return { ok: false, errors: [{ code: "TRAVELLER_NOT_FOUND", message: `Traveller ${operation.id} was not found.` }] };
        }
        travellers[index] = { ...travellers[index], ...operation.changes };
      } else if (operation.op === "removeTraveller") {
        const index = travellers.findIndex((traveller) => traveller.id === operation.id);
        if (index < 0) {
          return { ok: false, errors: [{ code: "TRAVELLER_NOT_FOUND", message: `Traveller ${operation.id} was not found.` }] };
        }
        travellers.splice(index, 1);
      }
    }
    next.party.travellers = travellers;
  }

  try {
    return { ok: true, state: normalizePixieTripState(next, { now: options.now }) };
  } catch (error) {
    return {
      ok: false,
      errors: [{ code: "NORMALIZATION_FAILED", message: error instanceof Error ? error.message : "Unable to normalize Pixie state." }],
    };
  }
}
