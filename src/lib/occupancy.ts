export type OccupancyTier = "studio" | "oneBedroom" | "twoBedroom" | "grandVilla";

export const OCCUPANCY_OVERRIDES: Record<string, number> = {};

const OCCUPANCY_BY_TIER: Record<OccupancyTier, number> = {
  studio: 4,
  oneBedroom: 5,
  twoBedroom: 9,
  grandVilla: 12,
};

const VILLA_LABEL_BY_TIER: Record<OccupancyTier, string> = {
  studio: "Studio",
  oneBedroom: "1 Bedroom Villa",
  twoBedroom: "2 Bedroom Villa",
  grandVilla: "3 Bedroom Grand Villa",
};

const STUDIO_SLEEP_5_RESORT_CODES = new Set([
  "BCV",
  "BWV",
  "BRV",
  "PVB",
  "VGF",
  "RVA",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const resolveTier = (value: string): OccupancyTier | null => {
  const normalized = normalize(value);
  if (!normalized) return null;
  if (normalized.includes("grand")) return "grandVilla";
  if (normalized.includes("3 bedroom")) return "grandVilla";
  if (normalized.includes("3br")) return "grandVilla";
  if (normalized.includes("two bedroom") || normalized.includes("2 bedroom") || normalized.includes("2br")) {
    return "twoBedroom";
  }
  if (normalized.includes("one bedroom") || normalized.includes("1 bedroom") || normalized.includes("1br")) {
    return "oneBedroom";
  }
  if (normalized.includes("studio")) return "studio";
  return null;
};

const isStudioExceptionResort = (resortCode?: string | null) => {
  if (!resortCode) return false;
  return STUDIO_SLEEP_5_RESORT_CODES.has(resortCode.toUpperCase());
};

export function getOccupancyTier(roomLabel: string): OccupancyTier {
  const tier = resolveTier(roomLabel);
  return tier ?? "studio";
}

export function getMaxOccupancy({
  resortCode,
  roomLabel,
}: {
  resortCode?: string | null;
  roomLabel: string;
}): number {
  const tier = getOccupancyTier(roomLabel);
  if (tier === "studio" && isStudioExceptionResort(resortCode)) {
    return 5;
  }
  return OCCUPANCY_BY_TIER[tier];
}

export function getMaxOccupancyForSelection({
  resortSlug,
  resortCode,
  roomCode,
  roomLabel,
}: {
  resortSlug?: string | null;
  resortCode?: string | null;
  roomCode?: string | null;
  roomLabel?: string | null;
}): number {
  const overrideKey = [resortSlug, roomCode].filter(Boolean).join(":");
  if (overrideKey && OCCUPANCY_OVERRIDES[overrideKey]) {
    return OCCUPANCY_OVERRIDES[overrideKey];
  }

  const baseLabel = roomLabel || roomCode || "";
  return getMaxOccupancy({ resortCode, roomLabel: baseLabel || "Studio" });
}

export function suggestNextVillaType(roomLabel: string): string {
  const tier = resolveTier(roomLabel);
  if (!tier) return VILLA_LABEL_BY_TIER.twoBedroom;
  if (tier === "studio") return VILLA_LABEL_BY_TIER.oneBedroom;
  if (tier === "oneBedroom") return VILLA_LABEL_BY_TIER.twoBedroom;
  if (tier === "twoBedroom") return VILLA_LABEL_BY_TIER.grandVilla;
  return VILLA_LABEL_BY_TIER.grandVilla;
}

export function getOccupancyLabel(roomLabel: string): string {
  const tier = getOccupancyTier(roomLabel);
  return VILLA_LABEL_BY_TIER[tier];
}

export function getStudioHelperText({
  resortCode,
  roomLabel,
}: {
  resortCode?: string | null;
  roomLabel: string;
}): string | null {
  const tier = getOccupancyTier(roomLabel);
  if (tier !== "studio") return null;
  if (getMaxOccupancy({ resortCode, roomLabel }) !== 5) return null;
  return "This studio includes additional bedding designed for families of five.";
}
