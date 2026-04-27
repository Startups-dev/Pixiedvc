import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ReadyStayShowcaseItem } from "@/lib/ready-stays/showcase-mock";
import { resolveResortImage } from "@/lib/resort-image";
import {
  getReadyStaysShowcaseForHome,
  getReadyStaysShowcaseForResort,
  getReadyStaysShowcaseForSearch,
} from "@/lib/ready-stays/showcase-mock";
import { READY_STAYS_SHOWCASE_FLAGS } from "@/lib/ready-stays/showcase-config";

type ReadyStayShowcaseRow = {
  id: string;
  slug: string | null;
  title: string | null;
  short_description: string | null;
  created_at: string | null;
  check_in: string;
  check_out: string;
  points: number;
  guest_price_per_point_cents: number;
  original_guest_price_per_point_cents: number | null;
  price_reduced_at: string | null;
  image_url: string | null;
  badge: string | null;
  cta_label: string | null;
  href: string | null;
  featured: boolean | null;
  priority: number | null;
  sort_override: number | null;
  sleeps: number | null;
  expires_at: string | null;
  locked_until: string | null;
  resorts:
    | {
        name?: string | null;
        slug?: string | null;
      }
    | null;
};

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function isGenericShowcaseImage(url: string) {
  const normalized = url.trim().toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("/main%20page%20ready-stay/") ||
    normalized.includes("/main page ready-stay/") ||
    normalized.endsWith("/ready-stay.png") ||
    normalized.endsWith("/pixiematching.png")
  );
}

function resolveShowcaseImageUrl(row: ReadyStayShowcaseRow, resortSlug: string) {
  const explicitUrl = row.image_url?.trim() ?? "";
  if (explicitUrl && !isGenericShowcaseImage(explicitUrl)) {
    return explicitUrl;
  }

  const derived = resolveResortImage({ resortSlug, imageIndex: 1 }).url;
  if (derived) return derived;

  return explicitUrl;
}

function mapShowcaseRow(row: ReadyStayShowcaseRow): ReadyStayShowcaseItem | null {
  const resortSlug = row.resorts?.slug?.trim() ?? "";
  const resortName = row.resorts?.name?.trim() ?? "";
  const title = row.title?.trim() ?? "";
  const imageUrl = resolveShowcaseImageUrl(row, resortSlug);
  const slug = row.slug?.trim() ?? "";
  const nights = daysBetween(row.check_in, row.check_out);
  const totalPriceUsd = Math.round((Number(row.guest_price_per_point_cents ?? 0) * Number(row.points ?? 0)) / 100);
  const originalTotalPriceUsd =
    row.original_guest_price_per_point_cents != null &&
    Number(row.original_guest_price_per_point_cents) > Number(row.guest_price_per_point_cents)
      ? Math.round((Number(row.original_guest_price_per_point_cents) * Number(row.points ?? 0)) / 100)
      : undefined;

  if (!resortSlug || !resortName || !title || !imageUrl || !slug || nights <= 0 || totalPriceUsd <= 0) {
    return null;
  }

  return {
    id: row.id,
    resortSlug,
    resortName,
    title,
    startDate: row.check_in,
    endDate: row.check_out,
    nights,
    sleeps: Number(row.sleeps ?? 4),
    totalPriceUsd,
    originalTotalPriceUsd,
    imageUrl,
    badge: row.badge?.trim() || "Ready to Book",
    ctaLabel: row.cta_label?.trim() || "View Stay",
    href: row.href?.trim() || `/ready-stays/${row.id}`,
    featured: Boolean(row.featured),
    priority: Number(row.priority ?? 0),
    priceReducedAt: row.price_reduced_at ?? undefined,
  };
}

function sortShowcaseRows(rows: ReadyStayShowcaseRow[]) {
  return [...rows].sort((a, b) => {
    const featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    if (featuredDelta !== 0) return featuredDelta;

    const aSort = a.sort_override == null ? Number.POSITIVE_INFINITY : Number(a.sort_override);
    const bSort = b.sort_override == null ? Number.POSITIVE_INFINITY : Number(b.sort_override);
    if (aSort !== bSort) return aSort - bSort;

    const priorityDelta = Number(b.priority ?? 0) - Number(a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;

    const markdownDelta = Number(Boolean(b.price_reduced_at)) - Number(Boolean(a.price_reduced_at));
    if (markdownDelta !== 0) return markdownDelta;

    return a.check_in.localeCompare(b.check_in);
  });
}

function isRowPubliclyAvailable(row: Pick<ReadyStayShowcaseRow, "check_out" | "expires_at" | "locked_until">) {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  if (row.check_out < today) return false;

  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= now) {
      return false;
    }
  }

  if (row.locked_until) {
    const lockedUntil = new Date(row.locked_until);
    if (!Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() >= now) {
      return false;
    }
  }

  return true;
}

function sortHomepageFallbackRows(rows: ReadyStayShowcaseRow[]) {
  return [...rows].sort((a, b) => {
    const checkInDelta = a.check_in.localeCompare(b.check_in);
    if (checkInDelta !== 0) return checkInDelta;

    const aCreatedAt = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bCreatedAt = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bCreatedAt - aCreatedAt;
  });
}

async function fetchPublicShowcaseRows(placementColumn?: "placement_home" | "placement_resort" | "placement_search", resortSlug?: string) {
  const supabase = await createSupabaseServerClient();

  const selectClause = resortSlug
    ? "id, slug, title, short_description, created_at, check_in, check_out, points, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, image_url, badge, cta_label, href, featured, priority, sort_override, sleeps, expires_at, locked_until, resorts!inner(name, slug)"
    : "id, slug, title, short_description, created_at, check_in, check_out, points, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, image_url, badge, cta_label, href, featured, priority, sort_override, sleeps, expires_at, locked_until, resorts(name, slug)";

  let query = supabase
    .from("ready_stays")
    .select(selectClause)
    .eq("status", "active");

  if (placementColumn) {
    query = query.eq(placementColumn, true);
  }

  if (resortSlug) query = query.eq("resorts.slug", resortSlug);

  const { data, error } = await query;
  if (error) {
    console.error("[ready-stays/showcase-live] public query failed", {
      placement: placementColumn,
      resortSlug: resortSlug ?? null,
      error: error.message,
    });
    return null;
  }

  return ((data ?? []) as ReadyStayShowcaseRow[]).filter((row) => isRowPubliclyAvailable(row));
}

function mapAndLimit(rows: ReadyStayShowcaseRow[], limit: number) {
  return sortShowcaseRows(rows).map(mapShowcaseRow).filter(Boolean).slice(0, limit) as ReadyStayShowcaseItem[];
}

function buildHomeFallbackShowcase(limit: number) {
  return getReadyStaysShowcaseForHome(limit).map((item) => ({
    ...item,
    href: "/ready-stays",
  }));
}

export async function getHomeReadyStaysShowcase(limit = 3) {
  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysLiveData) {
    return buildHomeFallbackShowcase(limit);
  }
  const homepageRows = await fetchPublicShowcaseRows("placement_home");
  if (!homepageRows) return [];
  if (homepageRows.length > 0) {
    return mapAndLimit(homepageRows, limit);
  }

  const fallbackRows = await fetchPublicShowcaseRows();
  if (!fallbackRows) return [];
  return sortHomepageFallbackRows(fallbackRows).map(mapShowcaseRow).filter(Boolean).slice(0, limit) as ReadyStayShowcaseItem[];
}

export async function getResortReadyStaysShowcase(resortSlug: string, limit = 6) {
  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysLiveData) {
    return getReadyStaysShowcaseForResort(resortSlug, limit);
  }
  const rows = await fetchPublicShowcaseRows("placement_resort", resortSlug);
  if (!rows) return [];
  return mapAndLimit(rows, limit);
}

export async function getSearchReadyStaysShowcase(limit = 3) {
  if (!READY_STAYS_SHOWCASE_FLAGS.enableReadyStaysLiveData) {
    return getReadyStaysShowcaseForSearch(limit);
  }
  const rows = await fetchPublicShowcaseRows("placement_search");
  if (!rows) return [];
  return mapAndLimit(rows, limit);
}
