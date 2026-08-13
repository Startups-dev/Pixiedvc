import type { HannaKnowledgeContext, HannaResolvedEntity } from "@/lib/pixie/knowledge";
import type { PixieTripState } from "@/lib/pixie/schema";
import { DISNEY_WORLD_TIME_ZONE, type DiningAvailabilityQuery, type LiveDisneyEntity, type LiveDisneyIntent } from "@/lib/pixie/live/types";

const THEMEPARKS_WIKI_PARK_IDS: Record<string, string> = {
  park_magic_kingdom: "75ea578a-adc8-4116-a54d-dccb60765ef9",
  park_epcot: "47f90d2c-e191-4239-a466-5892ef59a88b",
  park_hollywood_studios: "e957da41-3552-4cf6-b636-5babc5cbc4e5",
  park_animal_kingdom: "1c84a229-8862-4648-9c71-378ddd2c7693",
};

const PARK_ALIASES: Array<{ id: string; name: string; aliases: RegExp[] }> = [
  { id: "park_magic_kingdom", name: "Magic Kingdom", aliases: [/\bmagic kingdom\b/i, /\bmk\b/i] },
  { id: "park_epcot", name: "EPCOT", aliases: [/\bepcot\b/i] },
  { id: "park_hollywood_studios", name: "Hollywood Studios", aliases: [/\bhollywood studios\b/i, /\bdisney'?s hollywood studios\b/i, /\bdhs\b/i] },
  { id: "park_animal_kingdom", name: "Animal Kingdom", aliases: [/\banimal kingdom\b/i, /\bdisney'?s animal kingdom\b/i, /\bak\b/i] },
];

const ATTRACTION_ALIASES: Array<{ id: string; name: string; aliases: RegExp[] }> = [
  { id: "attr_hs_slinky_dog", name: "Slinky Dog Dash", aliases: [/\bslinky dog'?s?\b/i, /\bslinky dog dash\b/i] },
];

const MONTHS: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  março: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function todayInDisneyWorld(now: string) {
  const date = new Date(now);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DISNEY_WORLD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "2026";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function currentYearInDisneyWorld(now: string) {
  return Number(todayInDisneyWorld(now).slice(0, 4));
}

function isoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseLiveDisneyDate(message: string, now: string): { date?: string; timeContext?: "date_specific" | "right_now" } {
  const normalized = normalizeText(message);
  if (/\b(right now|currently|today|agora|hoje)\b/.test(normalized)) return { date: todayInDisneyWorld(now), timeContext: "right_now" };

  const iso = /\b(20\d{2})-(0?[1-9]|1[0-2])-(0?[1-9]|[12]\d|3[01])\b/.exec(message);
  if (iso) return { date: isoDate(Number(iso[1]), Number(iso[2]), Number(iso[3])), timeContext: "date_specific" };

  const monthNames = Object.keys(MONTHS).join("|");
  const monthFirst = new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(20\\d{2}))?\\b`, "i").exec(normalized);
  if (monthFirst) {
    return { date: isoDate(Number(monthFirst[3] ?? currentYearInDisneyWorld(now)), MONTHS[monthFirst[1] ?? ""] ?? 1, Number(monthFirst[2])), timeContext: "date_specific" };
  }

  const dayFirst = new RegExp(`\\b(\\d{1,2})\\s+(?:de\\s+)?(${monthNames})(?:\\s+(?:de\\s+)?(20\\d{2}))?\\b`, "i").exec(normalized);
  if (dayFirst) {
    return { date: isoDate(Number(dayFirst[3] ?? currentYearInDisneyWorld(now)), MONTHS[dayFirst[2] ?? ""] ?? 1, Number(dayFirst[1])), timeContext: "date_specific" };
  }

  return {};
}

function toLiveEntity(entity: HannaResolvedEntity): LiveDisneyEntity {
  return {
    id: entity.id,
    name: entity.name,
    entityType: entity.entityType,
    providerEntityId: THEMEPARKS_WIKI_PARK_IDS[entity.id],
  };
}

function resolveFromKnowledge(knowledgeContext: HannaKnowledgeContext | undefined, entityType: HannaResolvedEntity["entityType"]): LiveDisneyEntity | undefined {
  const entity = knowledgeContext?.resolvedEntities.find((candidate) => candidate.entityType === entityType);
  return entity ? toLiveEntity(entity) : undefined;
}

function resolveAllFromKnowledge(knowledgeContext: HannaKnowledgeContext | undefined, entityType: HannaResolvedEntity["entityType"]): LiveDisneyEntity[] {
  const entities = knowledgeContext?.resolvedEntities.filter((candidate) => candidate.entityType === entityType).map(toLiveEntity) ?? [];
  const candidates = knowledgeContext?.candidates.filter((candidate) => candidate.entityType === entityType).map((candidate) => ({
    id: candidate.id,
    name: candidate.name,
    entityType,
  })) ?? [];
  const byId = new Map<string, LiveDisneyEntity>();
  for (const entity of [...entities, ...candidates]) byId.set(entity.id, entity);
  return [...byId.values()];
}

function resolveAttractionFromMessage(message: string, knowledgeContext: HannaKnowledgeContext | undefined): LiveDisneyEntity | undefined {
  const resolved = resolveFromKnowledge(knowledgeContext, "attraction");
  if (resolved) return resolved;
  const attraction = ATTRACTION_ALIASES.find((candidate) => candidate.aliases.some((alias) => alias.test(message)));
  if (!attraction) return undefined;
  return { id: attraction.id, name: attraction.name, entityType: "attraction" };
}

function resolveParkFromMessage(message: string, knowledgeContext: HannaKnowledgeContext | undefined): LiveDisneyEntity | undefined {
  const resolved = resolveFromKnowledge(knowledgeContext, "park");
  if (resolved) return resolved;
  const park = PARK_ALIASES.find((candidate) => candidate.aliases.some((alias) => alias.test(message)));
  if (!park) return undefined;
  return { id: park.id, name: park.name, entityType: "park", providerEntityId: THEMEPARKS_WIKI_PARK_IDS[park.id] };
}

function minutesToTime(minutes: number) {
  const bounded = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${Math.floor(bounded / 60).toString().padStart(2, "0")}:${(bounded % 60).toString().padStart(2, "0")}`;
}

function timeToMinutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return (hour ?? 0) * 60 + (minute ?? 0);
}

export function parseDiningAvailabilityTimeWindow(message: string): Pick<DiningAvailabilityQuery, "targetTime" | "windowStart" | "windowEnd" | "toleranceMinutes" | "mealPeriod"> {
  const normalized = normalizeText(message);
  const between = /\bbetween\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(?:and|to|-)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i.exec(normalized);
  if (between) {
    const start = normalizeClock(Number(between[1]), Number(between[2] ?? 0), between[3] ?? between[6]);
    const end = normalizeClock(Number(between[4]), Number(between[5] ?? 0), between[6] ?? between[3]);
    return { windowStart: start, windowEnd: end, targetTime: minutesToTime(Math.floor((timeToMinutes(start) + timeToMinutes(end)) / 2)), toleranceMinutes: Math.abs(timeToMinutes(end) - timeToMinutes(start)) / 2 };
  }

  const around = /\b(?:around|about|por volta das?|perto das?)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|h)?\b/i.exec(normalized);
  const at = /\b(?:at|as|às)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|h)?\b/i.exec(normalized);
  const clock = around ?? at;
  if (clock) {
    const targetTime = normalizeClock(Number(clock[1]), Number(clock[2] ?? 0), clock[3]);
    const toleranceMinutes = around ? 90 : 45;
    return {
      targetTime,
      windowStart: minutesToTime(timeToMinutes(targetTime) - toleranceMinutes),
      windowEnd: minutesToTime(timeToMinutes(targetTime) + toleranceMinutes),
      toleranceMinutes,
      mealPeriod: timeToMinutes(targetTime) >= 16 * 60 ? "dinner" : undefined,
    };
  }

  if (/\b(early dinner|jantar cedo)\b/.test(normalized)) return { targetTime: "17:00", windowStart: "16:00", windowEnd: "18:00", toleranceMinutes: 60, mealPeriod: "dinner" };
  if (/\b(after 7|after 7pm|depois das 19|depois das 7)\b/.test(normalized)) return { targetTime: "19:30", windowStart: "19:00", windowEnd: "21:00", toleranceMinutes: 90, mealPeriod: "dinner" };
  if (/\b(dinner|jantar)\b/.test(normalized)) return { targetTime: "18:00", windowStart: "17:00", windowEnd: "20:00", toleranceMinutes: 120, mealPeriod: "dinner" };
  if (/\b(lunch|almoco|almoço)\b/.test(normalized)) return { targetTime: "12:30", windowStart: "11:30", windowEnd: "14:00", toleranceMinutes: 90, mealPeriod: "lunch" };
  if (/\b(breakfast|cafe da manha|café da manhã)\b/.test(normalized)) return { targetTime: "08:30", windowStart: "07:30", windowEnd: "10:30", toleranceMinutes: 90, mealPeriod: "breakfast" };
  return {};
}

function normalizeClock(hour: number, minute: number, meridiem: string | undefined) {
  let normalizedHour = hour;
  const normalizedMeridiem = meridiem?.toLowerCase();
  if (normalizedMeridiem === "pm" && hour < 12) normalizedHour += 12;
  if (normalizedMeridiem === "am" && hour === 12) normalizedHour = 0;
  if (!normalizedMeridiem && hour > 0 && hour <= 7) normalizedHour += 12;
  return `${normalizedHour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function explicitPartySize(message: string) {
  const normalized = normalizeText(message);
  const table = /\b(?:table|reservation|party)\s+for\s+(\d{1,2})\b/.exec(normalized);
  if (table) return Number(table[1]);
  const portuguese = /\bmesa\s+para\s+(\d{1,2})\b/.exec(normalized);
  if (portuguese) return Number(portuguese[1]);
  return undefined;
}

function partySizeFromState(state?: PixieTripState) {
  return state?.party.totalPartySize;
}

function locationScopeFromMessage(message: string, knowledgeContext: HannaKnowledgeContext | undefined) {
  const park = resolveParkFromMessage(message, knowledgeContext);
  if (park) return park.name;
  const resort = resolveFromKnowledge(knowledgeContext, "resort");
  return resort?.name;
}

export function buildDiningAvailabilityQuery(input: { latestUserMessage: string; currentState?: PixieTripState; knowledgeContext?: HannaKnowledgeContext; now: string }): DiningAvailabilityQuery {
  const date = parseLiveDisneyDate(input.latestUserMessage, input.now).date;
  const timeWindow = parseDiningAvailabilityTimeWindow(input.latestUserMessage);
  const partySize = explicitPartySize(input.latestUserMessage) ?? partySizeFromState(input.currentState);
  const restaurants = resolveAllFromKnowledge(input.knowledgeContext, "dining_location").slice(0, 8);
  const missingRequiredFields: DiningAvailabilityQuery["missingRequiredFields"] = [];
  if (!date) missingRequiredFields.push("date");
  if (!partySize) missingRequiredFields.push("partySize");
  if (!restaurants.length) missingRequiredFields.push("restaurant");
  return {
    date,
    partySize,
    locationScope: locationScopeFromMessage(input.latestUserMessage, input.knowledgeContext),
    restaurants,
    missingRequiredFields,
    ...timeWindow,
  };
}

function addUnique(intents: LiveDisneyIntent[], intent: LiveDisneyIntent) {
  const key = `${intent.kind}:${intent.entity?.id ?? "none"}:${intent.date ?? "none"}:${intent.timeContext ?? "none"}`;
  if (!intents.some((existing) => `${existing.kind}:${existing.entity?.id ?? "none"}:${existing.date ?? "none"}:${existing.timeContext ?? "none"}` === key)) {
    intents.push(intent);
  }
}

export function detectLiveDisneyIntents(input: { latestUserMessage: string; currentState?: PixieTripState; knowledgeContext?: HannaKnowledgeContext; now: string }): LiveDisneyIntent[] {
  const phrase = input.latestUserMessage;
  const normalized = normalizeText(phrase);
  const dateContext = parseLiveDisneyDate(phrase, input.now);
  const intents: LiveDisneyIntent[] = [];

  const diningAvailabilityRequested =
    /\b(reservation|availability|available|book|can i get|find (?:me|us)|table for|adr|reserva|disponibilidade|tem\b|tem .*horario|tem .*horário|consegue.*reserva)\b/.test(normalized) &&
    /\b(dinner|lunch|breakfast|restaurant|dining|via napoli|biergarten|garden grill|jantar|almoco|almoço|cafe|café|restaurante|por volta|around)\b/.test(normalized);
  if (diningAvailabilityRequested) {
    const query = buildDiningAvailabilityQuery({
      latestUserMessage: phrase,
      currentState: input.currentState,
      knowledgeContext: input.knowledgeContext,
      now: input.now,
    });
    const primaryRestaurant = query.restaurants[0];
    addUnique(intents, {
      kind: "dining_reservation_availability",
      entity: primaryRestaurant,
      date: query.date,
      timeContext: "date_specific",
      diningAvailabilityQuery: query,
      phrase,
    });
  }

  const parkHoursRequested =
    /\b(park hours?|hours?|open(?:ing)? time|close(?:s|d|ing)? time|closing time|open until|what time.*(?:open|close)|que horas.*(?:abre|fecha)|horario)\b/.test(normalized) &&
    !/\b(wait|fila|reservation|available|availability|disponivel)\b/.test(normalized);
  if (parkHoursRequested) {
    const park = resolveParkFromMessage(phrase, input.knowledgeContext);
    if (park) addUnique(intents, { kind: "park_hours", entity: park, date: dateContext.date, timeContext: dateContext.timeContext ?? "date_specific", phrase });
  }

  const showtimeRequested = /\b(showtimes?|show times?|fireworks time|parade time|what time is|what time does|que horas.*(?:show|fogos|parada)|horario.*(?:show|fogos|parada))\b/.test(normalized);
  if (showtimeRequested) {
    const entertainment = resolveFromKnowledge(input.knowledgeContext, "entertainment");
    if (entertainment) addUnique(intents, { kind: "entertainment_times", entity: entertainment, date: dateContext.date, timeContext: dateContext.timeContext ?? "date_specific", phrase });
  }

  const waitRequested = /\b(wait time|current wait|how long is the wait|wait for|wait right now|wait now|fila agora|tempo de fila)\b/.test(normalized);
  if (waitRequested) {
    const attraction = resolveAttractionFromMessage(phrase, input.knowledgeContext);
    if (attraction) addUnique(intents, { kind: "current_wait_time", entity: attraction, date: dateContext.date, timeContext: dateContext.timeContext ?? "right_now", phrase });
  }

  const statusRequested = /\b(open right now|is .* open|currently open|currently running|is it running|down right now|closed|closure|refurbishment|refurbishments|aberto agora|fechado|reforma)\b/.test(normalized);
  if (statusRequested && !waitRequested) {
    const attraction = resolveAttractionFromMessage(phrase, input.knowledgeContext);
    if (attraction) addUnique(intents, { kind: normalized.match(/\b(refurbishment|refurbishments|reforma)\b/) ? "refurbishment_status" : "attraction_status", entity: attraction, date: dateContext.date, timeContext: dateContext.timeContext ?? "right_now", phrase });
  }

  const currentMenuRequested = /\b(current menu|menu right now|serve right now|serves dinner|serve dinner|have .* right now|has .* right now|menu atual|serve jantar|tem .* agora)\b/.test(normalized);
  const currentPriceRequested = /\b(exact price|current price|menu price|how much is .* right now|cost right now|costs right now|quanto custa.*agora|preco atual|preço atual)\b/.test(normalized);
  if (currentMenuRequested || currentPriceRequested || /\bhow much is\b/.test(normalized)) {
    const dining = resolveFromKnowledge(input.knowledgeContext, "dining_location");
    if (dining) {
      addUnique(intents, {
        kind: currentPriceRequested || /\bhow much is\b/.test(normalized) ? "current_price" : "current_menu",
        entity: dining,
        date: dateContext.date,
        timeContext: dateContext.timeContext,
        phrase,
      });
    }
  }

  if (/\b(current meal period|serving (breakfast|lunch|dinner)|serve (breakfast|lunch|dinner)|serve (cafe|café|almoco|almoço|jantar))\b/.test(normalized)) {
    const dining = resolveFromKnowledge(input.knowledgeContext, "dining_location");
    if (dining) addUnique(intents, { kind: "current_meal_period", entity: dining, date: dateContext.date, timeContext: dateContext.timeContext, phrase });
  }

  return intents.slice(0, 4);
}
