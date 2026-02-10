import {
  CANONICAL_RESORT_SLUG_SET,
  canonicalizeResortSlug,
} from "@/lib/resorts/canonical";

export type ResortOption = {
  id: string;
  name: string;
  slug?: string | null;
  location?: string | null;
  card_image?: string | null;
  calculator_code?: string | null;
};

type ResortClient = {
  from: (table: string) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: ResortOption[] | null; error?: { message: string } | null }>;
    };
  };
};

function normalizeResortName(value: string) {
  return value
    .toLowerCase()
    .replace(/disney[’']?s?\s+/g, "")
    .replace(/\(([^)]*)\)/g, " $1 ")
    .replace(/\bat\s+disney[’']?s?\s+wilderness lodge\b/g, "")
    .replace(/\bat\s+wilderness lodge\b/g, "")
    .replace(/&/g, "and")
    .replace(/[–—-]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreLabel(label: string) {
  const lower = label.toLowerCase();
  let score = label.length;
  if (lower.includes("disney")) score += 12;
  if (lower.includes(" at ")) score += 12;
  if (lower.includes("(")) score += 6;
  return score;
}

function pickBetterLabel(a: ResortOption, b: ResortOption) {
  const scoreA = scoreLabel(a.name);
  const scoreB = scoreLabel(b.name);
  return scoreA <= scoreB ? a : b;
}

export async function getResorts(
  client: ResortClient,
  options?: { select?: string },
) {
  const select = options?.select ?? "id,name";
  const { data, error } = await client.from("resorts").select(select).order("name");
  if (error) {
    throw new Error(error.message);
  }
  const unique = new Map<string, ResortOption>();
  for (const resort of data ?? []) {
    const label = (resort.name ?? "").trim();
    if (!label) continue;
    const normalized = normalizeResortName(label);
    const existing = unique.get(normalized);
    if (!existing) {
      unique.set(normalized, { ...resort, name: label });
      continue;
    }
    unique.set(normalized, pickBetterLabel({ ...resort, name: label }, existing));
  }

  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCanonicalResorts(
  client: ResortClient,
  options?: { select?: string },
) {
  const select = options?.select ?? "id,name,slug";
  const { data, error } = await client.from("resorts").select(select).order("name");
  if (error) {
    throw new Error(error.message);
  }

  const filtered = new Map<string, ResortOption>();
  for (const resort of data ?? []) {
    const slug = resort.slug ?? "";
    const canonical = canonicalizeResortSlug(slug);
    if (!CANONICAL_RESORT_SLUG_SET.has(canonical)) {
      continue;
    }
    const existing = filtered.get(canonical);
    if (!existing || resort.slug === canonical) {
      filtered.set(canonical, { ...resort, slug: canonical });
    }
  }

  return [...filtered.values()].sort((a, b) => a.name.localeCompare(b.name));
}
