import { isPublicReadyStayRow } from "@/lib/ready-stays/visibility";
import { normalizeReadyStayListing } from "@/lib/pixie/ready-stays/listing-adapter";
import type { PixieReadyStayListing, PixieReadyStayListingSourceRow, PixieReadyStayAdapterResult } from "@/lib/pixie/ready-stays/types";

export const PIXIE_READY_STAY_VISIBILITY_SOURCE = "ready_stays public query + isPublicReadyStayRow";

export type PixieReadyStayVisibilityAdapterResult = {
  listings: PixieReadyStayListing[];
  excluded: Extract<PixieReadyStayAdapterResult, { ok: false }>[];
  warnings: string[];
  source: typeof PIXIE_READY_STAY_VISIBILITY_SOURCE;
};

export async function getPublicReadyStaysForPixie(options: {
  rows?: PixieReadyStayListingSourceRow[];
  nowMs?: number;
  today?: string;
} = {}): Promise<PixieReadyStayVisibilityAdapterResult> {
  const warnings: string[] = [];
  let rows = options.rows;

  if (!rows) {
    const { createSupabaseServerClient } = await import("@/lib/supabase-server");
    const supabase = await createSupabaseServerClient();
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("ready_stays")
      .select(
        "id, resort_id, check_in, check_out, points, room_type, season_type, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, sleeps, status, is_test_listing, is_visible_publicly, test_guest_total_cents, slug, title, image_url, href, expires_at, locked_until, verification_status, updated_at, owner:profiles!ready_stays_owner_id_fkey(owners!owners_user_id_fkey(lifecycle_status)), resorts(name, slug, calculator_code)",
      )
      .in("status", ["active", "test"])
      .gte("check_out", today)
      .order("check_in", { ascending: true });

    if (error) {
      return {
        listings: [],
        excluded: [],
        warnings: [`Ready Stay public query failed: ${error.message}`],
        source: PIXIE_READY_STAY_VISIBILITY_SOURCE,
      };
    }
    rows = (data ?? []) as PixieReadyStayListingSourceRow[];
  }

  const listings: PixieReadyStayListing[] = [];
  const excluded: Extract<PixieReadyStayAdapterResult, { ok: false }>[] = [];
  for (const row of rows) {
    if (!isPublicReadyStayRow(row, options.nowMs, options.today)) {
      excluded.push({ ok: false, code: "private_listing", listingId: row.id, message: "Ready Stay is not public-visible." });
      continue;
    }
    const normalized = normalizeReadyStayListing(row, options);
    if (normalized.ok) listings.push(normalized.listing);
    else excluded.push(normalized);
  }

  return { listings, excluded, warnings, source: PIXIE_READY_STAY_VISIBILITY_SOURCE };
}
