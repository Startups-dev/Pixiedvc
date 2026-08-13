import { detectLiveDisneyIntents } from "@/lib/pixie/live/intent";
import { createThemeParksWikiProvider } from "@/lib/pixie/live/providers/themeparks-wiki";
import {
  DISNEY_WORLD_TIME_ZONE,
  type AttractionOperatingStatus,
  type CurrentDiningInfo,
  type DiningReservationAvailability,
  type EntertainmentSchedule,
  type LiveDisneyContext,
  type LiveDisneyError,
  type LiveDisneyIntent,
  type LiveDisneyIntentKind,
  type LiveDisneyProvider,
  type LiveDisneyRetrievalInput,
  type LiveDisneyService,
  type LiveDisneyUnavailable,
  type ParkOperatingHours,
} from "@/lib/pixie/live/types";

const DEFAULT_MAX_RESULTS = 6;
const DEFAULT_TIMEOUT_MS = 2500;
const MENU_ITEM_BOUND = 8;
const SCHEDULE_TIME_BOUND = 12;

const TTL_BY_KIND: Record<LiveDisneyIntentKind, number> = {
  park_hours: 6 * 60 * 60 * 1000,
  entertainment_times: 60 * 60 * 1000,
  attraction_status: 2 * 60 * 1000,
  refurbishment_status: 60 * 60 * 1000,
  current_menu: 6 * 60 * 60 * 1000,
  current_price: 6 * 60 * 60 * 1000,
  current_meal_period: 6 * 60 * 60 * 1000,
  current_wait_time: 60 * 1000,
  dining_reservation_availability: 60 * 1000,
};

type LiveResult = ParkOperatingHours | EntertainmentSchedule | AttractionOperatingStatus | CurrentDiningInfo | DiningReservationAvailability | LiveDisneyUnavailable;

type CachedLiveResult = {
  expiresAt: number;
  result: LiveResult | LiveResult[];
};

const defaultLiveCache = new Map<string, CachedLiveResult>();

function emptyLiveContext(retrievedAt: string, intents: LiveDisneyIntent[] = []): LiveDisneyContext {
  return {
    source: "live_disney_v1",
    retrievedAt,
    timeZone: DISNEY_WORLD_TIME_ZONE,
    intents,
    parkHours: [],
    entertainment: [],
    attractionStatus: [],
    diningCurrent: [],
    diningAvailability: [],
    unavailable: [],
    errors: [],
  };
}

function unsupportedResult(intent: LiveDisneyIntent, now: string, reason: string): LiveDisneyUnavailable {
  return {
    kind: intent.kind,
    entity: intent.entity,
    date: intent.date,
    status: "live_source_unavailable",
    reason,
    provenance: {
      sourceType: "unsupported",
      sourceName: "Hara Live Disney V1",
      retrievedAt: now,
      effectiveDate: intent.date,
      status: "live_source_unavailable",
      confidence: "high",
    },
  };
}

function errorResult(intent: LiveDisneyIntent, provider: LiveDisneyProvider, now: string, error: unknown): LiveDisneyError {
  return {
    kind: intent.kind,
    entity: intent.entity,
    date: intent.date,
    status: "live_source_error",
    reason: error instanceof Error ? error.message : "Live Disney provider failed.",
    provenance: {
      sourceType: provider.sourceType,
      sourceName: provider.name,
      retrievedAt: now,
      effectiveDate: intent.date,
      status: "live_source_error",
      confidence: "low",
    },
  };
}

function cacheKey(provider: LiveDisneyProvider, intent: LiveDisneyIntent) {
  const availability = intent.diningAvailabilityQuery
    ? [
        intent.diningAvailabilityQuery.restaurants.map((restaurant) => restaurant.id).join(","),
        intent.diningAvailabilityQuery.partySize ?? "party_unknown",
        intent.diningAvailabilityQuery.windowStart ?? "start_unknown",
        intent.diningAvailabilityQuery.windowEnd ?? "end_unknown",
      ].join(":")
    : "";
  return [provider.name, intent.kind, intent.entity?.id ?? "none", intent.entity?.providerEntityId ?? "none", intent.date ?? "none", intent.timeContext ?? "none", availability].join(":");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Live Disney provider timed out.")), timeoutMs);
    promise
      .then(resolve, reject)
      .finally(() => clearTimeout(timeout));
  });
}

function boundResult(result: LiveResult): LiveResult {
  if ("availableTimes" in result) return { ...result, availableTimes: result.availableTimes.slice(0, 5) };
  if ("menuItems" in result && result.menuItems) return { ...result, menuItems: result.menuItems.slice(0, MENU_ITEM_BOUND) };
  if ("times" in result) return { ...result, times: result.times.slice(0, SCHEDULE_TIME_BOUND) };
  return result;
}

function addResult(context: LiveDisneyContext, result: LiveResult) {
  if (result.status === "live_source_unavailable" || result.status === "no_result") {
    context.unavailable.push(result as LiveDisneyUnavailable);
    return;
  }
  if (result.kind === "park_hours") context.parkHours.push(result as ParkOperatingHours);
  else if (result.kind === "entertainment_times") context.entertainment.push(result as EntertainmentSchedule);
  else if (result.kind === "dining_reservation_availability") context.diningAvailability.push(result as DiningReservationAvailability);
  else if (result.kind === "current_menu" || result.kind === "current_price" || result.kind === "current_meal_period") context.diningCurrent.push(result as CurrentDiningInfo);
  else context.attractionStatus.push(result as AttractionOperatingStatus);
}

async function fetchIntent(provider: LiveDisneyProvider, intent: LiveDisneyIntent, now: string): Promise<LiveResult | LiveResult[]> {
  if (intent.kind === "park_hours") {
    if (!provider.getParkHours) return unsupportedResult(intent, now, "No trusted park-hours live provider is configured for this request.");
    return provider.getParkHours({ intent, now });
  }
  if (intent.kind === "entertainment_times") {
    if (!provider.getEntertainmentSchedule) return unsupportedResult(intent, now, "No trusted entertainment-schedule live provider is configured for this request.");
    return provider.getEntertainmentSchedule({ intent, now });
  }
  if (intent.kind === "attraction_status" || intent.kind === "refurbishment_status" || intent.kind === "current_wait_time") {
    if (!provider.getAttractionStatus) return unsupportedResult(intent, now, "No trusted current-attraction-status live provider is configured for this request.");
    return provider.getAttractionStatus({ intent, now });
  }
  if (intent.kind === "dining_reservation_availability") {
    if (!provider.getDiningAvailability) return unsupportedResult(intent, now, "No production-safe dining reservation availability provider is configured.");
    return provider.getDiningAvailability({ intent, now });
  }
  if (!provider.getCurrentDiningInfo) return unsupportedResult(intent, now, "No trusted current dining/menu/pricing live provider is configured for this request.");
  return provider.getCurrentDiningInfo({ intent, now });
}

export type CreateLiveDisneyServiceOptions = {
  provider?: LiveDisneyProvider;
  timeoutMs?: number;
  cache?: Map<string, CachedLiveResult>;
};

export function createLiveDisneyService(options: CreateLiveDisneyServiceOptions = {}): LiveDisneyService {
  const provider = options.provider ?? createThemeParksWikiProvider();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cache = options.cache ?? (options.provider ? new Map<string, CachedLiveResult>() : defaultLiveCache);

  return {
    async retrieve(input: LiveDisneyRetrievalInput) {
      const now = input.now ?? new Date().toISOString();
      const intents = detectLiveDisneyIntents({ latestUserMessage: input.latestUserMessage, currentState: input.currentState, knowledgeContext: input.knowledgeContext, now });
      const context = emptyLiveContext(now, intents);
      if (!intents.length) return context;

      const maxResults = input.maxResults ?? DEFAULT_MAX_RESULTS;
      for (const intent of intents.slice(0, maxResults)) {
        const key = cacheKey(provider, intent);
        const cached = cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
          const cachedResults = Array.isArray(cached.result) ? cached.result : [cached.result];
          for (const result of cachedResults.map(boundResult)) addResult(context, result);
          continue;
        }

        try {
          const rawResult = await withTimeout(fetchIntent(provider, intent, now), timeoutMs);
          const results = Array.isArray(rawResult) ? rawResult.map(boundResult).slice(0, maxResults) : [boundResult(rawResult)];
          cache.set(key, { result: results.length ? results : unsupportedResult(intent, now, "Live provider returned no normalized result."), expiresAt: Date.now() + TTL_BY_KIND[intent.kind] });
          for (const result of results) addResult(context, result);
        } catch (error) {
          context.errors.push(errorResult(intent, provider, now, error));
        }
      }

      context.parkHours = context.parkHours.slice(0, maxResults);
      context.entertainment = context.entertainment.slice(0, maxResults);
      context.attractionStatus = context.attractionStatus.slice(0, maxResults);
      context.diningCurrent = context.diningCurrent.slice(0, maxResults);
      context.diningAvailability = context.diningAvailability.slice(0, maxResults);
      context.unavailable = context.unavailable.slice(0, maxResults);
      context.errors = context.errors.slice(0, maxResults);
      return context;
    },
  };
}
