import {
  DISNEY_WORLD_TIME_ZONE,
  type AttractionOperatingStatus,
  type CurrentDiningInfo,
  type DiningAvailabilitySlot,
  type DiningReservationAvailability,
  type EntertainmentSchedule,
  type LiveDisneyIntentKind,
  type LiveDisneyProvider,
  type LiveDisneyProviderQuery,
  type LiveDisneyResultStatus,
  type LiveDisneyUnavailable,
  type ParkOperatingHours,
} from "@/lib/pixie/live/types";

type FakeLiveResult = ParkOperatingHours | EntertainmentSchedule | AttractionOperatingStatus | CurrentDiningInfo | DiningReservationAvailability | LiveDisneyUnavailable;

type FakeHandler = (query: LiveDisneyProviderQuery) => Promise<FakeLiveResult> | FakeLiveResult;

function key(kind: LiveDisneyIntentKind, entityId?: string, date?: string) {
  return `${kind}:${entityId ?? "none"}:${date ?? "none"}`;
}

function provenance(query: LiveDisneyProviderQuery, status: LiveDisneyResultStatus = "supported_live_result") {
  return {
    sourceType: "fake" as const,
    sourceName: "Fake Live Disney Provider",
    sourceRef: query.intent.entity?.id,
    retrievedAt: query.now,
    effectiveDate: query.intent.date,
    status,
    confidence: "high" as const,
  };
}

function unavailable(query: LiveDisneyProviderQuery, reason = "Fake provider has no result for this live request."): LiveDisneyUnavailable {
  return {
    kind: query.intent.kind,
    entity: query.intent.entity,
    date: query.intent.date,
    status: "live_source_unavailable",
    reason,
    provenance: provenance(query, "live_source_unavailable"),
  };
}

export type FakeLiveDisneyProvider = LiveDisneyProvider & {
  calls: LiveDisneyProviderQuery[];
  setParkHours(entityId: string, date: string, hours: { openTime?: string; closeTime?: string; status?: LiveDisneyResultStatus }): void;
  setEntertainment(entityId: string, date: string, times: string[]): void;
  setDining(entityId: string, result: Pick<CurrentDiningInfo, "kind" | "mealPeriods" | "menuItems" | "priceSummary" | "currentMenuUrl" | "notes">): void;
  setDiningAvailability(entityId: string, result: { availableTimes?: DiningAvailabilitySlot[]; availabilityState?: DiningReservationAvailability["availabilityState"]; bookingUrl?: string; notes?: string[] }): void;
  setUnavailable(kind: LiveDisneyIntentKind, entityId: string | undefined, date: string | undefined, reason: string, status?: "live_source_unavailable" | "no_result"): void;
  fail(kind: LiveDisneyIntentKind, error: Error): void;
  delay(kind: LiveDisneyIntentKind, delayMs: number): void;
};

export function createFakeLiveDisneyProvider(): FakeLiveDisneyProvider {
  const handlers = new Map<string, FakeHandler>();
  const kindFailures = new Map<LiveDisneyIntentKind, Error>();
  const kindDelays = new Map<LiveDisneyIntentKind, number>();
  const calls: LiveDisneyProviderQuery[] = [];

  async function maybeDelay(kind: LiveDisneyIntentKind) {
    const delayMs = kindDelays.get(kind);
    if (!delayMs) return;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  async function run(query: LiveDisneyProviderQuery) {
    calls.push(query);
    const failure = kindFailures.get(query.intent.kind);
    if (failure) throw failure;
    await maybeDelay(query.intent.kind);
    const handler = handlers.get(key(query.intent.kind, query.intent.entity?.id, query.intent.date)) ?? handlers.get(key(query.intent.kind, query.intent.entity?.id, undefined));
    if (!handler) return unavailable(query);
    return handler(query);
  }

  return {
    name: "Fake Live Disney Provider",
    sourceType: "fake",
    calls,
    async getParkHours(query) {
      return (await run(query)) as ParkOperatingHours | LiveDisneyUnavailable;
    },
    async getEntertainmentSchedule(query) {
      return (await run(query)) as EntertainmentSchedule | LiveDisneyUnavailable;
    },
    async getAttractionStatus(query) {
      return (await run(query)) as AttractionOperatingStatus | LiveDisneyUnavailable;
    },
    async getCurrentDiningInfo(query) {
      return (await run(query)) as CurrentDiningInfo | LiveDisneyUnavailable;
    },
    async getDiningAvailability(query) {
      calls.push(query);
      const failure = kindFailures.get(query.intent.kind);
      if (failure) throw failure;
      await maybeDelay(query.intent.kind);
      const restaurants = query.intent.diningAvailabilityQuery?.restaurants ?? (query.intent.entity ? [query.intent.entity] : []);
      return restaurants.map((restaurant) => {
        const handler = handlers.get(key(query.intent.kind, restaurant.id, query.intent.date)) ?? handlers.get(key(query.intent.kind, restaurant.id, undefined));
        if (!handler) {
          return {
            kind: "dining_reservation_availability",
            diningLocation: restaurant,
            date: query.intent.diningAvailabilityQuery?.date,
            partySize: query.intent.diningAvailabilityQuery?.partySize,
            targetTime: query.intent.diningAvailabilityQuery?.targetTime,
            windowStart: query.intent.diningAvailabilityQuery?.windowStart,
            windowEnd: query.intent.diningAvailabilityQuery?.windowEnd,
            availabilityState: "unknown",
            availableTimes: [],
            status: "no_result",
            notes: ["Fake provider has no configured availability for this restaurant."],
            provenance: provenance(query, "no_result"),
          } satisfies DiningReservationAvailability;
        }
        return handler({ ...query, intent: { ...query.intent, entity: restaurant } }) as DiningReservationAvailability;
      });
    },
    setParkHours(entityId, date, hours) {
      handlers.set(key("park_hours", entityId, date), (query) => ({
        kind: "park_hours",
        park: query.intent.entity!,
        date,
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        timeZone: DISNEY_WORLD_TIME_ZONE,
        status: hours.status ?? "supported_live_result",
        provenance: provenance(query, hours.status ?? "supported_live_result"),
      }));
    },
    setEntertainment(entityId, date, times) {
      handlers.set(key("entertainment_times", entityId, date), (query) => ({
        kind: "entertainment_times",
        experience: query.intent.entity!,
        date,
        times,
        timeZone: DISNEY_WORLD_TIME_ZONE,
        status: "supported_live_result",
        provenance: provenance(query),
      }));
    },
    setDining(entityId, result) {
      handlers.set(key(result.kind, entityId, undefined), (query) => ({
        kind: result.kind,
        diningLocation: query.intent.entity!,
        date: query.intent.date,
        status: "supported_live_result",
        mealPeriods: result.mealPeriods,
        menuItems: result.menuItems,
        priceSummary: result.priceSummary,
        currentMenuUrl: result.currentMenuUrl,
        notes: result.notes,
        provenance: provenance(query),
      }));
    },
    setDiningAvailability(entityId, result) {
      handlers.set(key("dining_reservation_availability", entityId, undefined), (query) => ({
        kind: "dining_reservation_availability",
        diningLocation: query.intent.entity!,
        date: query.intent.diningAvailabilityQuery?.date,
        partySize: query.intent.diningAvailabilityQuery?.partySize,
        targetTime: query.intent.diningAvailabilityQuery?.targetTime,
        windowStart: query.intent.diningAvailabilityQuery?.windowStart,
        windowEnd: query.intent.diningAvailabilityQuery?.windowEnd,
        availabilityState: result.availabilityState ?? ((result.availableTimes?.length ?? 0) > 0 ? "available" : "no_availability_found"),
        availableTimes: result.availableTimes ?? [],
        bookingUrl: result.bookingUrl,
        notes: result.notes,
        status: "supported_live_result",
        provenance: provenance(query),
      }));
    },
    setUnavailable(kindValue, entityId, date, reason, status = "live_source_unavailable") {
      handlers.set(key(kindValue, entityId, date), (query) => ({
        kind: query.intent.kind,
        entity: query.intent.entity,
        date: query.intent.date,
        status,
        reason,
        provenance: provenance(query, status),
      }));
    },
    fail(kindValue, error) {
      kindFailures.set(kindValue, error);
    },
    delay(kindValue, delayMs) {
      kindDelays.set(kindValue, delayMs);
    },
  };
}
