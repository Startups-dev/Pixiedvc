export const CANONICAL_RESORT_SLUGS = [
  "animal-kingdom-villas",
  "animal-kingdom-kidani",
  "aulani",
  "bay-lake-tower",
  "beach-club-villas",
  "boardwalk-villas",
  "boulder-ridge-villas",
  "copper-creek-villas",
  "disneyland-hotel-villas",
  "fort-wilderness-cabins",
  "grand-californian-villas",
  "grand-floridian-villas",
  "hilton-head-island",
  "old-key-west",
  "polynesian-villas",
  "riviera-resort",
  "saratoga-springs",
  "vero-beach",
];

export const CANONICAL_RESORT_SLUG_SET = new Set(CANONICAL_RESORT_SLUGS);

export const RESORT_SLUG_ALIASES = new Map<string, string>([
  ["animal-kingdom-villas", "animal-kingdom-jambo"],
  ["beach-club-villas", "beach-club-villa"],
  ["boardwalk-villas", "boardwalk"],
  ["disneyland-hotel-villas", "villas-at-disneyland-hotel"],
  ["grand-californian-villas", "grand-californian"],
  ["riviera-resort", "riviera"],
  ["saratoga-springs", "saratoga-springs-resort"],
]);

export function canonicalizeResortSlug(slug: string) {
  for (const [canonical, alias] of RESORT_SLUG_ALIASES.entries()) {
    if (alias === slug) {
      return canonical;
    }
  }
  return slug;
}

export function getResortSlugVariants(slug: string) {
  const alias = RESORT_SLUG_ALIASES.get(slug);
  return alias ? [slug, alias] : [slug];
}
