import { supabase } from "@pixiedvc/data";
import {
  CANONICAL_RESORT_SLUG_SET,
  canonicalizeResortSlug,
  getResortSlugVariants,
} from "@/lib/resorts/canonical";

export type Resort = {
  slug: string;
  name: string;
  location?: string | null;
  tagline: string;
  heroImage: string;
  chips: string[];
  facts: { title: string; value: string }[];
  layout: {
    title: string;
    bullets: string[];
    notes?: string | null;
    image: string | null;
  };
  photos: { src: string; caption: string; alt?: string | null }[];
  essentials: {
    transportation: string;
    amenities: string[];
    dining: string[];
    notices?: string[];
  };
  map?: {
    headline?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
  nearby?: { name: string; slug: string; tagline?: string | null }[];
  pointsRange?: string | null;
};

export type ResortSummary = {
  slug: string;
  name: string;
  location: string | null;
  tags: string[];
  pointsRange: string | null;
  cardImage: string | null;
  heroImage?: string | null;
};

type ResortRow = {
  slug: string;
  name: string;
  location: string | null;
  tagline: string | null;
  hero_image: string | null;
  card_image?: string | null;
  chips: string[] | null;
  points_range?: string | null;
  facts: unknown;
  layout: {
    title?: string | null;
    bullets?: unknown;
    notes?: string | null;
    image?: string | null;
  } | null;
  layouts?: unknown;
  photos: unknown;
  essentials: {
    transportation?: unknown;
    amenities?: unknown;
    dining?: unknown;
    notices?: unknown;
  } | null;
  essentials_sections?: unknown;
  map?: {
    headline?: string | null;
    description?: string | null;
    image?: string | null;
  } | null;
  nearby: unknown;
};

type ResortSummaryRow = {
  slug: string;
  name: string;
  location: string | null;
  chips: string[] | null;
  points_range?: string | null;
  hero_image?: string | null;
  card_image?: string | null;
  photos?: unknown;
};

const PLACEHOLDER_IMAGE = "/images/castle-hero.png";
const PHOTOS_COMING_SOON = "Photos coming soon";
const RESORT_PHOTO_BUCKET = "resorts";
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const REACHABILITY_CACHE = new Map<string, boolean>();
const PHOTO_FOLDER_OVERRIDES: Record<string, { folder: string; prefix: string }> = {
  "animal-kingdom-villas": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "animal-kingdom-kidani": { folder: "Kidani", prefix: "AKV" },
  "animal-kingdom-lodge": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "bay-lake-tower": { folder: "bay-lake-tower", prefix: "BTC" },
  "beach-club-villas": { folder: "beach-club-villa", prefix: "BCV" },
  "grand-floridian-villas": { folder: "grand-floridian-villas", prefix: "GFV" },
  "aulani": { folder: "Aulani", prefix: "Aul" },
  "vero-beach": { folder: "vero-beach", prefix: "VBR" },
  "boardwalk-villas": { folder: "Boardwalk", prefix: "BDW" },
  "hilton-head-island": { folder: "Hilton-head", prefix: "HH" },
  "riviera-resort": { folder: "Riviera", prefix: "RR" },
  "grand-californian-villas": { folder: "grand-californian", prefix: "VGC" },
  "copper-creek-villas": { folder: "Copper-creek-villas-and-cabins", prefix: "CCV" },
  "boulder-ridge-villas": { folder: "boulder-ridge-villas", prefix: "BRV" },
  "saratoga-springs": { folder: "saratoga-springs-resort", prefix: "SSR" },
  "old-key-west": { folder: "old-key-west", prefix: "OKW" },
  "polynesian-villas": { folder: "Polynesian-villas-and-bungalows", prefix: "PVB" },
  "disneyland-hotel-villas": { folder: "villas-at-disneyland-hotel", prefix: "VDH" },
  "fort-wilderness-cabins": { folder: "Fort-Wilderness-Cabins", prefix: "CFW" },
};
const GETTING_AROUND_OVERRIDES: Record<string, string> = {
  "animal-kingdom-villas": [
    "Animal Kingdom: Bus service",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Resort Shuttle: Complimentary shuttle between Jambo House and Kidani Village (approximately every 15 minutes)",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "animal-kingdom-lodge": [
    "Animal Kingdom: Bus service",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Resort Shuttle: Complimentary shuttle between Jambo House and Kidani Village (approximately every 15 minutes)",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "animal-kingdom-jambo": [
    "Animal Kingdom: Bus service",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Resort Shuttle: Complimentary shuttle between Jambo House and Kidani Village (approximately every 15 minutes)",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "animal-kingdom-kidani": [
    "Animal Kingdom: Bus service",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Resort Shuttle: Complimentary shuttle between Kidani Village and Jambo House (approximately every 15 minutes)",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  kidani: [
    "Animal Kingdom: Bus service",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Resort Shuttle: Complimentary shuttle between Kidani Village and Jambo House (approximately every 15 minutes)",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "bay-lake-tower": [
    "Magic Kingdom: Walk or monorail access",
    "Epcot: Monorail access (transfer required)",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "boardwalk-villas": [
    "Epcot: Walk or boat access",
    "Hollywood Studios: Walk or boat access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  boardwalk: [
    "Epcot: Walk or boat access",
    "Hollywood Studios: Walk or boat access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "beach-club-villas": [
    "Epcot: Walk or boat access",
    "Hollywood Studios: Walk or boat access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "beach-club-villa": [
    "Epcot: Walk or boat access",
    "Hollywood Studios: Walk or boat access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "grand-floridian-villas": [
    "Magic Kingdom: Monorail or boat access",
    "Epcot: Monorail access (transfer required)",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "old-key-west": [
    "Disney Springs: Boat, walk, or bus access",
    "Magic Kingdom: Bus service",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "polynesian-villas": [
    "Magic Kingdom: Monorail access",
    "Epcot: Monorail access (transfer required)",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "polynesian-villas-and-bungalows": [
    "Magic Kingdom: Monorail access",
    "Epcot: Monorail access (transfer required)",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "riviera-resort": [
    "Epcot: Skyliner access",
    "Hollywood Studios: Skyliner access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  riviera: [
    "Epcot: Skyliner access",
    "Hollywood Studios: Skyliner access",
    "Magic Kingdom: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "boulder-ridge-villas": [
    "Magic Kingdom: Boat or bus access",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "copper-creek-villas": [
    "Magic Kingdom: Boat or bus access",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "copper-creek-villas-and-cabins": [
    "Magic Kingdom: Boat or bus access",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "fort-wilderness-cabins": [
    "Magic Kingdom: Boat access",
    "Epcot: Bus service",
    "Hollywood Studios: Bus service",
    "Animal Kingdom: Bus service",
    "Disney Springs: Bus service",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "grand-californian-villas": [
    "Disney California Adventure: Direct park access",
    "Disneyland Park: Walkable access",
    "Downtown Disney: Walkable access",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from nearby airports.",
  ].join("\n"),
  "grand-californian": [
    "Disney California Adventure: Direct park access",
    "Disneyland Park: Walkable access",
    "Downtown Disney: Walkable access",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from nearby airports.",
  ].join("\n"),
  "disneyland-hotel-villas": [
    "Disneyland Park: Walkable access",
    "Disney California Adventure: Walkable access",
    "Downtown Disney: Walkable access",
    "Airport Transportation: No direct Disney shuttle. Rental cars, rideshare, and private transfers are available from nearby airports.",
  ].join("\n"),
  "villas-at-disneyland-hotel": [
    "Disneyland Park: Walkable access",
    "Disney California Adventure: Walkable access",
    "Downtown Disney: Walkable access",
    "Airport Transportation: No direct Disney shuttle. Rental cars, rideshare, and private transfers are available from nearby airports.",
  ].join("\n"),
  "hilton-head-island": [
    "Resort Area: Shuttle service throughout the resort",
    "Beach Access: Complimentary shuttle to Disney's Beach House",
    "Local Area: Biking and walking paths available nearby",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from nearby airports.",
  ].join("\n"),
  "hilton-head": [
    "Resort Area: Shuttle service throughout the resort",
    "Beach Access: Complimentary shuttle to Disney's Beach House",
    "Local Area: Biking and walking paths available nearby",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from nearby airports.",
  ].join("\n"),
  aulani: [
    "Resort Experience: Fully self-contained with beach, pools, dining, and activities on site",
    "Local Area: Easy access to Ko Olina lagoons and nearby attractions",
    "Airport Transportation: No direct shuttle service. Rental cars and private transfers are available from Honolulu International Airport.",
  ].join("\n"),
  "vero-beach": [
    "Resort Experience: Quiet, self-contained beachfront resort",
    "Local Area: Best explored by car for nearby dining and attractions",
    "Walt Disney World: Approximately 90–120 minutes by car",
    "Airport Transportation: No direct Disney shuttle. Most guests rent a car or arrange private transportation from Orlando International Airport.",
  ].join("\n"),
  "saratoga-springs": [
    "Magic Kingdom: Convenient bus service",
    "Epcot: Convenient bus service",
    "Hollywood Studios: Convenient bus service",
    "Animal Kingdom: Convenient bus service",
    "Disney Springs: Walk, boat, or bus access",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
  "saratoga-springs-resort": [
    "Magic Kingdom: Convenient bus service",
    "Epcot: Convenient bus service",
    "Hollywood Studios: Convenient bus service",
    "Animal Kingdom: Convenient bus service",
    "Disney Springs: Walk, boat, or bus access",
    "Water Parks: Bus service",
    "Airport Transportation: No direct Disney shuttle. Rental cars and private transfers are available from Orlando International Airport.",
  ].join("\n"),
};

type JsonRecord = Record<string, unknown>;

function normalizeImageUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

async function isReachable(url: string | null | undefined) {
  if (!url) {
    return false;
  }
  if (url.startsWith("/")) {
    return true;
  }
  if (REACHABILITY_CACHE.has(url)) {
    return REACHABILITY_CACHE.get(url) ?? false;
  }
  try {
    const response = await fetch(url, { method: "HEAD" });
    const ok = response.ok;
    REACHABILITY_CACHE.set(url, ok);
    return ok;
  } catch {
    REACHABILITY_CACHE.set(url, false);
    return false;
  }
}

async function firstReachableUrl(urls: Array<string | null | undefined>) {
  for (const url of urls) {
    if (url && (await isReachable(url))) {
      return url;
    }
  }
  return null;
}

async function filterReachablePhotos(
  photos: { src: string; caption: string; alt?: string | null }[],
) {
  const keep: { src: string; caption: string; alt?: string | null }[] = [];
  for (const photo of photos) {
    if (await isReachable(photo.src)) {
      keep.push(photo);
    }
  }
  return keep;
}

function toObjectArray<T extends JsonRecord>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => item as T);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item): item is string => Boolean(item));
}

function toTextArray(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

type ResortPhotoRow = {
  src?: string | null;
  url?: string | null;
  caption?: string | null;
  alt?: string | null;
  sort_order?: number | null;
};

function buildResortPhotoUrls(slug: string) {
  if (!SUPABASE_PUBLIC_URL) {
    return [];
  }
  const override = PHOTO_FOLDER_OVERRIDES[slug];
  if (!override) {
    return [];
  }
  const { folder, prefix } = override;
  return Array.from({ length: 5 }, (_, index) => {
    const order = index + 1;
    return {
      src: `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/${RESORT_PHOTO_BUCKET}/${folder}/${prefix}${order}.png`,
      caption: `Resort photo ${order}`,
      alt: null,
    };
  });
}

function normalizeResortPhotos(raw: unknown, slug: string, options?: { ignoreOverride?: boolean }) {
  const items = toObjectArray<ResortPhotoRow>(raw);
  const sorted = items.some((item) => typeof item.sort_order === "number")
    ? [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : items;
  const override = options?.ignoreOverride ? null : PHOTO_FOLDER_OVERRIDES[slug];
  if (override && !options?.ignoreOverride) {
    return buildResortPhotoUrls(slug);
  }
  const mapped = sorted
    .map((photo, index) => {
      const src = photo.src ?? photo.url ?? null;
      if (!src) {
        return null;
      }
      return {
        src,
        caption: photo.caption ?? `Resort photo ${index + 1}`,
        alt: photo.alt ?? photo.caption ?? null,
      };
    })
    .filter((photo): photo is { src: string; caption: string; alt?: string | null } => Boolean(photo));

  return mapped;
}

async function mapResortRow(row: ResortRow | null): Promise<Resort | null> {
  if (!row) {
    return null;
  }

  const facts = toObjectArray<{ title?: string | null; value?: string | null }>(row.facts).flatMap((fact) => {
    if (!fact.title || !fact.value) {
      return [];
    }
    return [{ title: fact.title, value: fact.value }];
  });

  const rawPhotos = normalizeResortPhotos(row.photos, row.slug);
  const photos = await filterReachablePhotos(rawPhotos);

  const layout = row.layout ?? {};
  const layoutBullets = toStringArray(layout.bullets);

  const amenities = toStringArray(row.essentials?.amenities);
  const dining = toStringArray(row.essentials?.dining);
  const noticesArray = toStringArray(row.essentials?.notices);

  const heroImage =
    (await firstReachableUrl([photos[0]?.src, normalizeImageUrl(row.hero_image), normalizeImageUrl(row.card_image)])) ??
    PLACEHOLDER_IMAGE;

  const nearby = toObjectArray<{ name?: string | null; slug?: string | null; tagline?: string | null }>(row.nearby).filter(
    (item): item is { name: string; slug: string; tagline?: string | null } => Boolean(item.name && item.slug),
  );

  const finalPhotos =
    photos.length > 0
      ? photos
      : [
          {
            src: PLACEHOLDER_IMAGE,
            caption: PHOTOS_COMING_SOON,
            alt: PHOTOS_COMING_SOON,
          },
        ];

  return {
    slug: row.slug,
    name: row.name,
    location: row.location,
    tagline: row.tagline ?? "",
    heroImage,
    chips: toTextArray(row.chips),
    facts,
    layout: {
      title: layout.title ?? "Villa Layout",
      bullets: layoutBullets,
      notes: layout.notes ?? null,
      image:
        layout.image ??
        (row.slug === "fort-wilderness-cabins"
          ? "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Fort-Wilderness-Cabins/CFW%20floor%20plan.png"
          : null),
    },
    photos: finalPhotos,
    essentials: {
      transportation:
        GETTING_AROUND_OVERRIDES[row.slug] ??
        (typeof row.essentials?.transportation === "string" ? row.essentials?.transportation : ""),
      amenities,
      dining,
      notices: noticesArray.length ? noticesArray : undefined,
    },
    map: row.map ?? null,
    nearby,
    pointsRange: row.points_range ?? null,
  };
}

function mapResortSummary(row: ResortSummaryRow): ResortSummary {
  const photos = normalizeResortPhotos(row.photos, row.slug);
  const photoFallback = photos[0]?.src ?? null;
  const cardImage = normalizeImageUrl(row.card_image);
  const heroImage = normalizeImageUrl(row.hero_image);

  return {
    slug: row.slug,
    name: row.name,
    location: row.location,
    tags: toTextArray(row.chips),
    pointsRange: row.points_range ?? null,
    cardImage: photoFallback ?? cardImage ?? heroImage,
    heroImage: photoFallback ?? heroImage,
  };
}

export async function getResortBySlug(slug: string): Promise<Resort | null> {
  const variants = getResortSlugVariants(slug);
  const { data, error } = await supabase
    .from("resort_full")
    .select(
      "slug, name, location, tagline, hero_image, card_image, chips, points_range, facts, layout, layouts, photos, essentials, essentials_sections, map, nearby",
    )
    .in("slug", variants);

  if (error) {
    console.error(`[resort_full] Failed to fetch resort ${slug}`, error);
    return null;
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const exact = rows.find((row) => row.slug === slug);
  return await mapResortRow((exact ?? rows[0] ?? null) as ResortRow | null);
}

export async function getAllResortSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from("resorts").select("slug");

  if (error) {
    console.error("[resorts] Failed to fetch resort slugs", error);
    return [];
  }

  const normalized = new Set<string>();
  for (const row of data ?? []) {
    const slug = row.slug;
    if (!slug) continue;
    const canonical = canonicalizeResortSlug(slug);
    if (CANONICAL_RESORT_SLUG_SET.has(canonical)) {
      normalized.add(canonical);
    }
  }
  return Array.from(normalized);
}

export async function getResortSummaries(): Promise<ResortSummary[]> {
  const { data, error } = await supabase
    .from("resort_full")
    .select("slug, name, location, chips, points_range, hero_image, card_image, essentials, photos")
    .order("name", { ascending: true });

  if (error) {
    console.error("[resort_full] Failed to fetch resort summaries", error);
    return [];
  }

  const filtered = new Map<string, ResortSummaryRow>();
  for (const row of data ?? []) {
    const canonical = canonicalizeResortSlug(row.slug);
    if (!CANONICAL_RESORT_SLUG_SET.has(canonical)) {
      continue;
    }
    const existing = filtered.get(canonical);
    if (!existing || row.slug === canonical) {
      filtered.set(canonical, { ...(row as ResortSummaryRow), slug: canonical });
    }
  }

  const entries = Array.from(filtered.values());
  const slugs = entries.flatMap((row) => getResortSlugVariants(row.slug));
  const { data: resortPhotos } = await supabase
    .from("resort_photos")
    .select("resort_slug, url, sort_order")
    .in("resort_slug", slugs);

  const photosBySlug = new Map<string, { url: string; sort_order?: number | null }[]>();
  for (const row of resortPhotos ?? []) {
    const canonical = canonicalizeResortSlug(row.resort_slug);
    const list = photosBySlug.get(canonical) ?? [];
    list.push({ url: row.url, sort_order: row.sort_order });
    photosBySlug.set(canonical, list);
  }

  const summaries = await Promise.all(
    entries.map(async (row) => {
      const override = PHOTO_FOLDER_OVERRIDES[row.slug];
      let listImage: string | null = null;

      if (override) {
        const overrideUrls = buildResortPhotoUrls(row.slug).map((photo) => photo.src);
        listImage = await firstReachableUrl(overrideUrls);
      }

      if (!listImage) {
        const resortRows = photosBySlug.get(row.slug) ?? [];
        const sorted = resortRows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        listImage = await firstReachableUrl(sorted.map((item) => item.url));
      }

      if (!listImage) {
        listImage = await firstReachableUrl([normalizeImageUrl(row.card_image), normalizeImageUrl(row.hero_image)]);
      }

      const safeImage = listImage ?? PLACEHOLDER_IMAGE;
      const summary = mapResortSummary(row as ResortSummaryRow);
      return {
        ...summary,
        cardImage: safeImage,
        heroImage: safeImage,
      };
    }),
  );

  return summaries;
}

export async function getResortPhotos(
  slug: string,
): Promise<Array<{ src: string; alt?: string; caption?: string }>> {
  const overridePhotos = buildResortPhotoUrls(slug).map((photo) => ({
    src: photo.src,
    alt: photo.alt ?? photo.caption ?? "Resort image",
    caption: photo.caption ?? undefined,
  }));
  const overrideReachable = await filterReachablePhotos(
    overridePhotos as { src: string; caption: string; alt?: string | null }[],
  );
  if (overrideReachable.length > 0) {
    return overrideReachable;
  }

  const slugVariants = getResortSlugVariants(slug);
  
  const { data, error } = await supabase
    .from("resort_photos")
    .select("url, alt, caption, sort_order")
    .in("resort_slug", slugVariants)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[resort_photos] Failed to fetch resort photos", error);
    return [];
  }

  const mapped = (data ?? []).map((photo) => ({
    src: photo.url,
    alt: photo.alt ?? photo.caption ?? "Resort image",
    caption: photo.caption ?? undefined,
  }));

  const reachable = await filterReachablePhotos(mapped as { src: string; caption: string; alt?: string | null }[]);
  if (reachable.length > 0) {
    return reachable;
  }

  const { data: resortRow } = await supabase
    .from("resort_full")
    .select("photos")
    .in("slug", slugVariants)
    .maybeSingle();

  const fallbackPhotos = normalizeResortPhotos(resortRow?.photos, slug, { ignoreOverride: true });
  const fallbackReachable = await filterReachablePhotos(fallbackPhotos);
  if (fallbackReachable.length > 0) {
    return fallbackReachable;
  }

  return [
    {
      src: PLACEHOLDER_IMAGE,
      alt: PHOTOS_COMING_SOON,
      caption: PHOTOS_COMING_SOON,
    },
  ];
}
