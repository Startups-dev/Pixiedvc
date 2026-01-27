import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp"];

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1];
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function parseCanonicalSlugs() {
  const filePath = path.join(process.cwd(), "src/lib/resorts.ts");
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/const CANONICAL_RESORT_SLUGS = new Set\(\[([\s\S]*?)\]\);/);
  if (!match) return [];
  const block = match[1];
  const slugs = [];
  for (const slugMatch of block.matchAll(/"([^"]+)"/g)) {
    slugs.push(slugMatch[1]);
  }
  return slugs;
}

function parseAliases() {
  const filePath = path.join(process.cwd(), "src/lib/resorts.ts");
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/const RESORT_SLUG_ALIASES = new Map\(\[([\s\S]*?)\]\);/);
  if (!match) return new Map();
  const block = match[1];
  const pairs = new Map();
  for (const pair of block.matchAll(/\[\s*"([^"]+)",\s*"([^"]+)"\s*\]/g)) {
    pairs.set(pair[1], pair[2]);
  }
  return pairs;
}

function parseOverrides() {
  const filePath = path.join(process.cwd(), "src/lib/resorts.ts");
  const text = fs.readFileSync(filePath, "utf8");
  const overrides = {};
  const regex = /"([^"]+)":\s*\{\s*folder:\s*"([^"]+)",\s*prefix:\s*"([^"]+)"\s*\}/g;
  let match;
  while ((match = regex.exec(text))) {
    overrides[match[1]] = { folder: match[2], prefix: match[3] };
  }
  return overrides;
}

function isImage(url) {
  return IMAGE_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

async function head(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch {
    return 0;
  }
}

async function getStatuses(urls) {
  const statuses = await Promise.all(urls.map((url) => head(url)));
  return statuses;
}

function filterImageUrls(urls) {
  return urls.filter((url) => typeof url === "string" && isImage(url));
}

function normalizeResortPhotos(photos) {
  if (!Array.isArray(photos)) return [];
  return photos
    .map((photo) => {
      if (!photo || typeof photo !== "object") return null;
      const src = photo.src || photo.url;
      if (!src) return null;
      return src;
    })
    .filter(Boolean);
}

function buildOverrideUrls(baseUrl, slug, overrides, prefixMap) {
  const override = overrides[slug];
  const folder = override?.folder || slug;
  const prefix = override?.prefix || prefixMap[slug] || slug.replace(/[^a-z0-9]/gi, "").slice(0, 4);
  return Array.from({ length: 5 }, (_, i) => {
    const order = i + 1;
    return `${baseUrl}/storage/v1/object/public/resorts/${folder}/${prefix}${order}.png`;
  });
}

function canonicalizeSlug(slug, aliases) {
  for (const [canonical, alias] of aliases.entries()) {
    if (alias === slug) {
      return canonical;
    }
  }
  return slug;
}

function getSlugVariants(slug, aliases) {
  const alias = aliases.get(slug);
  return alias ? [slug, alias] : [slug];
}

async function pickFirstReachable(urls) {
  const statuses = await getStatuses(urls);
  for (let i = 0; i < urls.length; i += 1) {
    const status = statuses[i];
    if (status >= 200 && status < 300) {
      return { url: urls[i], status };
    }
  }
  return null;
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data: resorts, error } = await supabase
    .from("resort_full")
    .select("slug, name, hero_image, card_image, photos");

  if (error) {
    console.error("Failed to load resort_full:", error.message);
    process.exit(1);
  }

  const { data: resortPhotos, error: photosError } = await supabase
    .from("resort_photos")
    .select("resort_slug, url, sort_order");

  if (photosError) {
    console.error("Failed to load resort_photos:", photosError.message);
    process.exit(1);
  }

  const overrides = parseOverrides();
  const aliases = parseAliases();
  const canonicalSlugs = parseCanonicalSlugs();
  const prefixMap = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "src/lib/resort-photo-prefixes.json"), "utf8"),
  );

  const resortMap = new Map();
  for (const row of resorts ?? []) {
    resortMap.set(row.slug, row);
  }

  const photosBySlug = new Map();
  for (const row of resortPhotos ?? []) {
    const canonical = canonicalizeSlug(row.resort_slug, aliases);
    const list = photosBySlug.get(canonical) ?? [];
    list.push(row);
    photosBySlug.set(canonical, list);
  }

  const missing = [];

  for (const slug of canonicalSlugs) {
    const variants = getSlugVariants(slug, aliases);
    const resortRow = resortMap.get(slug) || resortMap.get(variants[1]);
    if (!resortRow) {
      missing.push({
        slug,
        type: "data",
        source: "resort_full",
        urls: [],
        statuses: [],
        note: "Missing resort_full row",
      });
      continue;
    }

    const overrideUrls = buildOverrideUrls(url, slug, overrides, prefixMap);
    const resortPhotosRows = photosBySlug.get(slug) ?? [];
    const sortedPhotos = [...resortPhotosRows].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
    );
    const resortPhotoUrls = filterImageUrls(sortedPhotos.map((row) => row.url));

    const resortFullPhotoUrls = filterImageUrls(normalizeResortPhotos(resortRow.photos));

    const listSources = [
      { name: "override", urls: overrideUrls },
      { name: "resort_photos", urls: resortPhotoUrls },
      {
        name: "resort_full.hero_card",
        urls: filterImageUrls([resortRow.card_image, resortRow.hero_image].filter(Boolean)),
      },
    ];

    let listFound = false;
    for (const source of listSources) {
      if (!source.urls.length) {
        continue;
      }
      const hit = await pickFirstReachable(source.urls);
      if (hit) {
        listFound = true;
        break;
      }
    }

    if (!listFound) {
      const urls = listSources.flatMap((source) => source.urls);
      const statuses = await getStatuses(urls);
      missing.push({
        slug,
        type: "list",
        source: "override -> resort_photos -> resort_full.hero_card",
        urls,
        statuses,
      });
    }

    const carouselSources = [
      { name: "override", urls: overrideUrls },
      { name: "resort_photos", urls: resortPhotoUrls },
      { name: "resort_full.photos", urls: resortFullPhotoUrls },
    ];

    let carouselFound = false;
    for (const source of carouselSources) {
      if (!source.urls.length) {
        continue;
      }
      const statuses = await getStatuses(source.urls);
      if (statuses.some((status) => status >= 200 && status < 300)) {
        carouselFound = true;
        break;
      }
    }

    if (!carouselFound) {
      const urls = carouselSources.flatMap((source) => source.urls);
      const statuses = await getStatuses(urls);
      missing.push({
        slug,
        type: "carousel",
        source: "override -> resort_photos -> resort_full.photos",
        urls,
        statuses,
      });
    }
  }

  console.log("\nResort image audit:");
  if (!missing.length) {
    console.log("✔ All resort list + carousel images are reachable.");
    return;
  }

  for (const entry of missing) {
    console.log(`\n- ${entry.slug}`);
    console.log(`  missing: ${entry.type}`);
    console.log(`  sources: ${entry.source}`);
    if (entry.note) {
      console.log(`  note: ${entry.note}`);
    }
    entry.urls.forEach((url, index) => {
      const status = entry.statuses[index] ?? "n/a";
      console.log(`  ${index + 1}. ${url} (${status})`);
    });
  }

  process.exit(1);
}

main();
