import { supabase } from "@pixiedvc/data";
import resortPhotoPrefixes from "@/lib/resort-photo-prefixes.json";

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

const DEFAULT_IMAGE = "/images/castle-hero.png";
const BAY_LAKE_TOWER_NIGHT_IMAGE = "/images/Bay Lake tower night.png";
const RESORT_PHOTO_BUCKET = "resorts";
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PHOTO_FOLDER_OVERRIDES: Record<string, { folder: string; prefix: string }> = {
  "animal-kingdom-jambo": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "animal-kingdom-kidani": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "animal-kingdom-villas": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "animal-kingdom-lodge": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "bay-lake-tower": { folder: "bay-lake-tower", prefix: "BTC" },
  "beach-club-villas": { folder: "beach-club-villa", prefix: "BCV" },
};

type JsonRecord = Record<string, unknown>;

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

function normalizeResortPhotos(raw: unknown, slug: string) {
  const items = toObjectArray<ResortPhotoRow>(raw);
  const sorted = items.some((item) => typeof item.sort_order === "number")
    ? [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : items;

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

  if (mapped.length > 0) {
    return mapped;
  }

  return buildResortPhotoUrls(slug);
}

function mapResortRow(row: ResortRow | null): Resort | null {
  if (!row) {
    return null;
  }

  const facts = toObjectArray<{ title?: string | null; value?: string | null }>(row.facts).flatMap((fact) => {
    if (!fact.title || !fact.value) {
      return [];
    }
    return [{ title: fact.title, value: fact.value }];
  });

  const photos = normalizeResortPhotos(row.photos, row.slug);

  const layout = row.layout ?? {};
  const layoutBullets = toStringArray(layout.bullets);

  const amenities = toStringArray(row.essentials?.amenities);
  const dining = toStringArray(row.essentials?.dining);
  const noticesArray = toStringArray(row.essentials?.notices);

  const heroImage =
    row.hero_image ??
    photos[0]?.src ??
    (row.slug === "bay-lake-tower" ? BAY_LAKE_TOWER_NIGHT_IMAGE : DEFAULT_IMAGE);

  const nearby = toObjectArray<{ name?: string | null; slug?: string | null; tagline?: string | null }>(row.nearby).filter(
    (item): item is { name: string; slug: string; tagline?: string | null } => Boolean(item.name && item.slug),
  );

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
      image: layout.image ?? null,
    },
    photos,
    essentials: {
      transportation: typeof row.essentials?.transportation === "string" ? row.essentials?.transportation : "",
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

  return {
    slug: row.slug,
    name: row.name,
    location: row.location,
    tags: toTextArray(row.chips),
    pointsRange: row.points_range ?? null,
    cardImage: row.card_image ?? row.hero_image ?? photoFallback,
    heroImage: row.hero_image ?? photoFallback,
  };
}

export async function getResortBySlug(slug: string): Promise<Resort | null> {
  const { data, error } = await supabase
    .from("resort_full")
    .select(
      "slug, name, location, tagline, hero_image, card_image, chips, points_range, facts, layout, layouts, photos, essentials, essentials_sections, map, nearby",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error(`[resort_full] Failed to fetch resort ${slug}`, error);
    return null;
  }

  return mapResortRow(data as ResortRow);
}

export async function getAllResortSlugs(): Promise<string[]> {
  const { data, error } = await supabase.from("resorts").select("slug");

  if (error) {
    console.error("[resorts] Failed to fetch resort slugs", error);
    return [];
  }

  return (data ?? []).map((row) => row.slug).filter(Boolean);
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

  return (data ?? []).map((row) => mapResortSummary(row as ResortSummaryRow));
}

export async function getResortPhotos(
  slug: string,
): Promise<Array<{ src: string; alt?: string; caption?: string }>> {
  const { data, error } = await supabase
    .from("resort_photos")
    .select("url, alt, caption, sort_order")
    .eq("resort_slug", slug)
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

  if (mapped.length > 0) {
    return mapped;
  }

  return buildResortPhotoUrls(slug).map((photo) => ({
    src: photo.src,
    alt: photo.alt ?? photo.caption ?? "Resort image",
    caption: photo.caption ?? undefined,
  }));
}
