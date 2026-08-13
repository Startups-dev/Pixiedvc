import {
  DISNEY_WORLD_TIME_ZONE,
  type LiveDisneyProvider,
  type LiveDisneyProviderQuery,
  type LiveDisneyUnavailable,
  type ParkOperatingHours,
} from "@/lib/pixie/live/types";

const API_BASE = "https://api.themeparks.wiki/v1";

type ThemeParksWikiScheduleEntry = {
  date?: string;
  type?: string;
  openingTime?: string;
  closingTime?: string;
};

type ThemeParksWikiScheduleResponse = {
  schedule?: ThemeParksWikiScheduleEntry[];
};

function sourceUrl(entityId: string) {
  return `${API_BASE}/entity/${encodeURIComponent(entityId)}/schedule`;
}

function unavailable(query: LiveDisneyProviderQuery, status: "live_source_unavailable" | "no_result", reason: string): LiveDisneyUnavailable {
  return {
    kind: query.intent.kind,
    entity: query.intent.entity,
    date: query.intent.date,
    status,
    reason,
    provenance: {
      sourceType: status === "no_result" ? "third_party_public_api" : "unsupported",
      sourceName: "ThemeParks.wiki",
      sourceRef: query.intent.entity?.providerEntityId,
      sourceUrl: query.intent.entity?.providerEntityId ? sourceUrl(query.intent.entity.providerEntityId) : undefined,
      retrievedAt: query.now,
      effectiveDate: query.intent.date,
      status,
      confidence: status === "no_result" ? "medium" : "high",
    },
  };
}

function timeFromIso(value: string | undefined) {
  if (!value) return undefined;
  const match = /T(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? value;
}

export function createThemeParksWikiProvider(): LiveDisneyProvider {
  return {
    name: "ThemeParks.wiki",
    sourceType: "third_party_public_api",
    async getDiningAvailability(query) {
      return unavailable(query, "live_source_unavailable", "ThemeParks.wiki does not provide Walt Disney World dining reservation inventory.");
    },
    async getParkHours(query): Promise<ParkOperatingHours | LiveDisneyUnavailable> {
      const park = query.intent.entity;
      if (!park?.providerEntityId) return unavailable(query, "live_source_unavailable", "This park is not mapped to the live schedule provider.");
      if (!query.intent.date) return unavailable(query, "no_result", "A date is required for park-hours lookup.");

      const url = sourceUrl(park.providerEntityId);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`ThemeParks.wiki schedule request failed with HTTP ${response.status}.`);
      const body = (await response.json()) as ThemeParksWikiScheduleResponse;
      const schedule = body.schedule ?? [];
      const operating = schedule.find((entry) => entry.date === query.intent.date && (!entry.type || entry.type === "OPERATING")) ?? schedule.find((entry) => entry.date === query.intent.date);
      if (!operating) return unavailable(query, "no_result", "The requested date is unpublished or not present in the live schedule source.");

      return {
        kind: "park_hours",
        park,
        date: query.intent.date,
        openTime: timeFromIso(operating.openingTime),
        closeTime: timeFromIso(operating.closingTime),
        timeZone: DISNEY_WORLD_TIME_ZONE,
        status: "supported_live_result",
        provenance: {
          sourceType: "third_party_public_api",
          sourceName: "ThemeParks.wiki",
          sourceRef: park.providerEntityId,
          sourceUrl: url,
          retrievedAt: query.now,
          effectiveDate: query.intent.date,
          status: "supported_live_result",
          confidence: "medium",
        },
      };
    },
  };
}
