import LiquidationOpportunitiesClient from "@/components/liquidation-opportunities/LiquidationOpportunitiesClient";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type Opportunity = {
  id: string;
  pointsAvailable: number;
  expirationDate: string;
  travelWindowStart: string | null;
  travelWindowEnd: string | null;
  roomType: string | null;
  targetPricePerPointCents: number | null;
  newsletterFeatured: boolean;
  resortName: string;
};

export default async function LiquidationOpportunitiesPage() {
  const supabase = getSupabaseAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  if (!supabase) {
    return (
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Concierge-assisted opportunities</p>
          <h1 className="text-3xl font-semibold text-ink">Last-Minute Liquidation Opportunities</h1>
        </header>
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-ink">No liquidation opportunities right now</h2>
          <p className="mt-3 text-sm text-muted">New curated opportunities are reviewed daily.</p>
        </div>
      </main>
    );
  }

  const { data } = await supabase
    .from("point_liquidation_requests")
    .select(
      "id, points_available, expiration_date, travel_window_start, travel_window_end, room_type, target_price_per_point_cents, featured_in_newsletter, status, admin_approved, public_visibility, home_resort:resorts(name)",
    )
    .eq("admin_approved", true)
    .eq("public_visibility", true)
    .in("status", ["approved", "featured"])
    .gte("expiration_date", today)
    .order("featured_in_newsletter", { ascending: false })
    .order("expiration_date", { ascending: true })
    .limit(90);

  const opportunities: Opportunity[] = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    pointsAvailable: Number(row.points_available ?? 0),
    expirationDate: String(row.expiration_date ?? ""),
    travelWindowStart:
      typeof row.travel_window_start === "string" ? row.travel_window_start : null,
    travelWindowEnd: typeof row.travel_window_end === "string" ? row.travel_window_end : null,
    roomType: typeof row.room_type === "string" ? row.room_type : null,
    targetPricePerPointCents: Number.isFinite(Number(row.target_price_per_point_cents))
      ? Number(row.target_price_per_point_cents)
      : null,
    newsletterFeatured: Boolean(row.featured_in_newsletter),
    resortName:
      typeof (row.home_resort as { name?: string } | null)?.name === "string"
        ? ((row.home_resort as { name: string }).name || "Disney Resort")
        : "Disney Resort",
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Concierge-assisted opportunities</p>
        <h1 className="text-3xl font-semibold text-ink">Last-Minute Liquidation Opportunities</h1>
        <p className="max-w-3xl text-sm text-muted">
          Separate from Ready Stays instant booking. These are curated short-notice opportunities sourced from owner expiring points and concierge-supported matching.
        </p>
      </header>

      {opportunities.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="text-2xl font-semibold text-ink">No liquidation opportunities right now</h2>
          <p className="mt-3 text-sm text-muted">New curated opportunities are reviewed daily.</p>
        </div>
      ) : (
        <LiquidationOpportunitiesClient opportunities={opportunities} />
      )}
    </main>
  );
}
