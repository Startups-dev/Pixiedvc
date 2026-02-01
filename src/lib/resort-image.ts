/**
 * src/lib/resort-image.ts
 *
 * Assumptions (based on current project reality):
 * - Resort images live in Supabase Storage public bucket: "resorts"
 * - Public URL format:
 *   <SUPABASE_URL>/storage/v1/object/public/resorts/<folder>/<filename>
 * - Each resort has 5 images named like <PREFIX><N>.png where N is 1..5
 *   Examples:
 *   - bay-lake-tower/BTC1.png .. BTC5.png
 *   - Riviera/RR1.png .. RR5.png
 * - We resolve in this order:
 *   1) resortCode (DVC code) -> mapping
 *   2) resortSlug -> mapping
 *   3) default (SSR)
 *
 * No React imports. No other project imports.
 */

export type ResortImageMatch = {
  matchedBy: "code" | "slug" | "default";
  imagePath: string; // "<folder>/<filename>"
  url: string; // full public URL
};

type ResortImageSpec = {
  folder: string;  // e.g. "bay-lake-tower"
  prefix: string;  // e.g. "BTC"
  ext?: "png" | "jpg" | "webp";
};

const BUCKET = "resorts";

// Default fallback: Saratoga Springs Resort (SSR)
const DEFAULT_SPEC: ResortImageSpec = {
  folder: "saratoga-springs-resort",
  prefix: "SSR",
  ext: "png",
};

const RESORTS_BY_CODE: Record<string, ResortImageSpec> = {
  // Based on your public URLs
  AUL: { folder: "Aulani", prefix: "Aul", ext: "png" },
  BWV: { folder: "Boardwalk", prefix: "BDW", ext: "png" },
  CCV: { folder: "Copper-creek-villas-and-cabins", prefix: "CCV", ext: "png" },
  HHI: { folder: "Hilton-head", prefix: "HH", ext: "png" },
  AKV: { folder: "Kidani", prefix: "AKV", ext: "png" },
  PVB: { folder: "Polynesian-villas-and-bungalows", prefix: "PVB", ext: "png" },
  RIV: { folder: "Riviera", prefix: "RR", ext: "png" },
  AKL: { folder: "animal-kingdom-lodge", prefix: "AKL", ext: "png" },
  BLT: { folder: "bay-lake-tower", prefix: "BTC", ext: "png" },
  BCV: { folder: "beach-club-villa", prefix: "BCV", ext: "png" },
  BRV: { folder: "boulder-ridge-villas", prefix: "BRV", ext: "png" },
  VGC: { folder: "grand-californian", prefix: "VGC", ext: "png" },
  VGF: { folder: "grand-floridian-villas", prefix: "GFV", ext: "png" },
  OKW: { folder: "old-key-west", prefix: "OKW", ext: "png" },
  SSR: { folder: "saratoga-springs-resort", prefix: "SSR", ext: "png" },
  VB:  { folder: "vero-beach", prefix: "VBR", ext: "png" },
  VDH: { folder: "villas-at-disneyland-hotel", prefix: "VDH", ext: "png" },
};

// Slugs can vary; keep mapping conservative and extend as you see real slugs in DB.
// Keys should be normalized to lowercase.
const RESORTS_BY_SLUG: Record<string, ResortImageSpec> = {
  "aulani-disney-vacation-club-villas": RESORTS_BY_CODE.AUL,
  "bay-lake-tower": RESORTS_BY_CODE.BLT,
  "disney-s-animal-kingdom-villas-kidani-village": RESORTS_BY_CODE.AKV,
  "disney-s-animal-kingdom-villas-jambo-house": RESORTS_BY_CODE.AKL,
  "disney-s-beach-club-villas": RESORTS_BY_CODE.BCV,
  "disney-s-boardwalk-villas": RESORTS_BY_CODE.BWV,
  "copper-creek-villas-and-cabins-at-disney-s-wilderness-lodge": RESORTS_BY_CODE.CCV,
  "disney-s-hilton-head-island-resort": RESORTS_BY_CODE.HHI,
  "disney-s-old-key-west-resort": RESORTS_BY_CODE.OKW,
  "disney-s-polynesian-villas-bungalows": RESORTS_BY_CODE.PVB,
  "disney-s-riviera-resort": RESORTS_BY_CODE.RIV,
  "disney-s-saratoga-springs-resort-spa": RESORTS_BY_CODE.SSR,
  "disney-s-vero-beach-resort": RESORTS_BY_CODE.VB,
  "the-villas-at-disneyland-hotel": RESORTS_BY_CODE.VDH,
  "the-villas-at-disney-s-grand-californian-hotel-spa": RESORTS_BY_CODE.VGC,
  "grand-floridian-villas": RESORTS_BY_CODE.VGF,
};

function clampImageIndex(n: unknown): number {
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return 1;
  const rounded = Math.round(num);
  return Math.min(5, Math.max(1, rounded));
}

function getSupabaseBaseUrl(): string {
  // Prefer env in Next. Fallback to your known project URL if not set.
  const envUrl =
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim() ||
    "https://iyfpphzlyufhndpedijv.supabase.co";
  return envUrl.replace(/\/+$/, "");
}

function buildPublicUrl(imagePath: string): string {
  const base = getSupabaseBaseUrl();
  // Encode path segments safely but keep slashes
  const safePath = imagePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base}/storage/v1/object/public/${BUCKET}/${safePath}`;
}

function specToPath(spec: ResortImageSpec, imageIndex: number): string {
  const ext = spec.ext ?? "png";
  const idx = clampImageIndex(imageIndex);
  return `${spec.folder}/${spec.prefix}${idx}.${ext}`;
}

export function resolveResortImage(params: {
  resortCode?: string | null;
  resortSlug?: string | null;
  imageIndex?: number; // 1..5 (clamped)
}): ResortImageMatch {
  const imageIndex = params.imageIndex ?? 1;

  const resortCode = params.resortCode?.trim() || "";
  if (resortCode) {
    const spec = RESORTS_BY_CODE[resortCode.toUpperCase()];
    if (spec) {
      const imagePath = specToPath(spec, imageIndex);
      return { matchedBy: "code", imagePath, url: buildPublicUrl(imagePath) };
    }
  }

  const resortSlug = params.resortSlug?.trim() || "";
  if (resortSlug) {
    const spec = RESORTS_BY_SLUG[resortSlug.toLowerCase()];
    if (spec) {
      const imagePath = specToPath(spec, imageIndex);
      return { matchedBy: "slug", imagePath, url: buildPublicUrl(imagePath) };
    }
  }

  const fallbackPath = specToPath(DEFAULT_SPEC, imageIndex);
  return {
    matchedBy: "default",
    imagePath: fallbackPath,
    url: buildPublicUrl(fallbackPath),
  };
}

