import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL env var");
  process.exit(1);
}

if (!serviceKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY env var");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prefixesPath = path.join(__dirname, "..", "src", "lib", "resort-photo-prefixes.json");
const prefixes = JSON.parse(await readFile(prefixesPath, "utf8"));

const RESORT_PHOTO_BUCKET = "resort-images";

function derivePhotoPrefix(slug) {
  return slug.replace(/[^a-z0-9]/g, "").slice(0, 4);
}

function getPhotoPrefix(slug) {
  return prefixes[slug] || derivePhotoPrefix(slug);
}

function buildPhotoUrl(slug, prefix, order) {
  return `${supabaseUrl}/storage/v1/object/public/${RESORT_PHOTO_BUCKET}/resorts/${slug}/${prefix}${order}.jpg`;
}

async function seed() {
  const { data: resorts, error } = await supabase.from("resorts").select("id, slug, name");
  if (error) {
    console.error("Failed to load resorts", error);
    process.exit(1);
  }

  const rows = [];
  for (const resort of resorts ?? []) {
    const prefix = getPhotoPrefix(resort.slug);
    if (!prefix) {
      console.warn(`Missing prefix for resort ${resort.slug}`);
      continue;
    }
    for (let order = 1; order <= 5; order += 1) {
      rows.push({
        resort_id: resort.id,
        url: buildPhotoUrl(resort.slug, prefix, order),
        caption: `${resort.name} photo ${order}`,
        sort_order: order,
      });
    }
  }

  if (!rows.length) {
    console.log("No resort photos to seed.");
    return;
  }

  const { error: upsertError } = await supabase
    .from("resort_photos")
    .upsert(rows, { onConflict: "resort_id,sort_order" });

  if (upsertError) {
    console.error("Failed to upsert resort_photos", upsertError);
    process.exit(1);
  }

  console.log(`Upserted ${rows.length} resort photos.`);
}

seed().catch((seedError) => {
  console.error(seedError);
  process.exit(1);
});
