import { normalizeKnowledgeText } from "@/lib/pixie/knowledge/entity-resolver";
import type { HannaKnowledgeDomain, HannaKnowledgeIntent, HannaKnowledgeLiveGap, HannaMealPeriod } from "@/lib/pixie/knowledge/types";

function includesAny(message: string, terms: string[]) {
  return terms.some((term) => message.includes(term));
}

function addDomain(domains: Set<HannaKnowledgeDomain>, domain: HannaKnowledgeDomain) {
  domains.add(domain);
}

export function detectHannaKnowledgeIntent(message: string): HannaKnowledgeIntent {
  const normalized = normalizeKnowledgeText(message);
  const domains = new Set<HannaKnowledgeDomain>();
  const liveRequests: HannaKnowledgeLiveGap["kind"][] = [];

  if (includesAny(normalized, ["eat", "eating", "restaurant", "restaurants", "dining", "dinner", "lunch", "breakfast", "brunch", "reservation", "adr", "food", "meal", "menu", "dish"])) {
    addDomain(domains, "dining");
  }
  if (includesAny(normalized, ["ride", "rides", "attraction", "attractions", "do first", "what should we do", "prioritize", "skip", "safari", "things to do", "can she ride", "can he ride"])) {
    addDomain(domains, "attraction");
  }
  if (includesAny(normalized, ["show", "shows", "entertainment", "fireworks", "parade", "spectacular", "sing along", "singalong"])) {
    addDomain(domains, "entertainment");
  }
  if (includesAny(normalized, ["resort", "villa", "villas", "staying", "stay", "hotel"])) addDomain(domains, "resort");
  if (includesAny(normalized, ["park", "epcot", "magic kingdom", "mk", "hollywood studios", "animal kingdom"])) addDomain(domains, "park");
  if (includesAny(normalized, ["walk", "walking", "boat", "bus", "monorail", "skyliner", "transportation", "getting to", "get to"])) addDomain(domains, "transportation");
  if (includesAny(normalized, ["where", "near", "nearby", "location", "located", "area", "pavilion"])) addDomain(domains, "geography");

  const toddlerContext = includesAny(normalized, ["toddler", "2 year old", "2-year-old", "two year old", "two-year-old", "stroller", "nap", "little kid", "young child"]);
  if (toddlerContext || includesAny(normalized, ["family", "kid", "kids", "child", "children"])) addDomain(domains, "family");
  if (includesAny(normalized, [" inches", " inch ", " tall", "height", "under "])) addDomain(domains, "height");
  if (includesAny(normalized, ["rain", "raining", "storm", "storming", "hot", "heat", "cool down", "cool off", "air conditioned", "air-conditioned"])) addDomain(domains, "weather");
  if (includesAny(normalized, ["take a break", "rest area", "nap", "tired", "exhausted", "missed her nap", "missed his nap", "cool down", "cool off"])) addDomain(domains, "rest");
  if (includesAny(normalized, ["first thing", "morning", "only have", "three hours", "90 minutes", "before dinner", "pacing", "fix the afternoon"])) addDomain(domains, "pacing");
  if (includesAny(normalized, ["neat", "overlooked", "hidden", "worth noticing", "nearby things"])) addDomain(domains, "discovery");
  if (domains.has("park") && domains.has("resort")) addDomain(domains, "geography");
  const comparisonMode = includesAny(normalized, [" versus ", " vs ", "compare", "which two", "would you keep", "worth"]);

  let mealPeriod: HannaMealPeriod | undefined;
  if (normalized.includes("breakfast")) mealPeriod = "breakfast";
  else if (normalized.includes("brunch")) mealPeriod = "brunch";
  else if (normalized.includes("lunch")) mealPeriod = "lunch";
  else if (normalized.includes("dinner")) mealPeriod = "dinner";
  else if (normalized.includes("snack")) mealPeriod = "snack";

  if (
    includesAny(normalized, ["available", "availability", "get me", "get us", "can i get", "book", "reservation at", "adr"]) &&
    includesAny(normalized, ["am", "pm", "tonight", "tomorrow", "september", "october", "november", "december", "january", "february", "march", "april", "may", "june", "july", "august"])
  ) {
    liveRequests.push("dining_reservation_availability");
  }
  if (includesAny(normalized, ["exact price", "exactly how much", "current price", "menu price", "how much is"])) liveRequests.push("current_menu_prices");
  if (includesAny(normalized, ["right now", "currently", "current menu"]) && includesAny(normalized, ["menu", "have", "has", "serve", "serves", "dish"])) {
    liveRequests.push("current_menu");
  }
  if (
    includesAny(normalized, ["park hours", "open until", "opening time", "closing time", "hours"]) &&
    includesAny(normalized, ["today", "tomorrow", "september", "october", "november", "december", "january", "february", "march", "april", "may", "june", "july", "august"])
  ) {
    liveRequests.push("park_hours");
  }
  if (includesAny(normalized, ["showtime", "show time", "parade time", "fireworks time", "what time is", "what time does"])) liveRequests.push("showtimes");
  if (includesAny(normalized, ["closed", "closure", "refurbishment", "refurbishments", "down today"])) liveRequests.push("temporary_closures");
  if (includesAny(normalized, ["wait time", "is it running", "down right now", "currently running", "current attraction status"])) liveRequests.push("current_attraction_status");
  if (includesAny(normalized, ["wait for", "current wait", "wait time", "how long is the wait"])) liveRequests.push("current_wait_time");
  if (includesAny(normalized, ["lightning lane", "genie", "multipass", "single pass"])) liveRequests.push("lightning_lane_availability");
  if (includesAny(normalized, ["event schedule", "party schedule", "halloween party schedule", "christmas party schedule"])) liveRequests.push("event_schedule");

  return {
    domains: [...domains],
    mealPeriod,
    toddlerContext,
    comparisonMode,
    liveRequests,
  };
}
