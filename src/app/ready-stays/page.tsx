import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import ReadyStaysMarketplaceClient from "@/components/ready-stays/ReadyStaysMarketplaceClient";

const READY_STAY_GUIDE_LINKS = [
  { href: "/guides/ready-stays-transfer-linking#what-is-ready-stay", label: "1. What Is a Ready Stay?" },
  { href: "/guides/ready-stays-transfer-linking#how-ready-stay-works", label: "2. How the Ready Stay Process Works" },
  { href: "/guides/ready-stays-transfer-linking#when-can-i-link", label: "3. When Can I Link My Reservation?" },
  { href: "/guides/ready-stays-transfer-linking#how-to-link", label: "4. How to Link Your Reservation" },
  { href: "/guides/ready-stays-transfer-linking#transfer-in-progress", label: "5. Transfer in Progress, What That Means" },
];

export default async function ReadyStaysPublicPage({
  searchParams,
}: {
  searchParams?: {
    resort?: string;
    month?: string;
    holiday?: string;
    price_min?: string;
    price_max?: string;
    points_min?: string;
    points_max?: string;
    sort?: string;
  };
}) {
  const supabase = await createSupabaseServerClient();

  const { data: resorts } = await supabase
    .from("resorts")
    .select("id, name")
    .order("name", { ascending: true });

  let query = supabase
    .from("ready_stays")
    .select(
      "id, resort_id, check_in, check_out, points, room_type, season_type, guest_price_per_point_cents, resorts(name, slug, calculator_code)",
    )
    .eq("status", "active")
    .order("check_in", { ascending: true });

  if (searchParams?.resort) {
    query = query.eq("resort_id", searchParams.resort);
  }

  if (searchParams?.holiday) {
    query = query.eq("season_type", searchParams.holiday);
  }

  if (searchParams?.month) {
    const [year, month] = searchParams.month.split("-").map((part) => Number(part));
    if (year && month) {
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      query = query.gte("check_in", start).lte("check_in", end);
    }
  }

  const priceMin = Number(searchParams?.price_min);
  const priceMax = Number(searchParams?.price_max);
  if (Number.isFinite(priceMin)) {
    query = query.gte("guest_price_per_point_cents", priceMin);
  }
  if (Number.isFinite(priceMax)) {
    query = query.lte("guest_price_per_point_cents", priceMax);
  }

  const pointsMin = Number(searchParams?.points_min);
  const pointsMax = Number(searchParams?.points_max);
  if (Number.isFinite(pointsMin)) {
    query = query.gte("points", pointsMin);
  }
  if (Number.isFinite(pointsMax)) {
    query = query.lte("points", pointsMax);
  }

  const { data: readyStays } = await query;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Pixie Ready Stays</p>
        <h1 className="text-3xl font-semibold text-ink">Instant-Book DVC Stays</h1>
        <p className="text-sm text-muted">
          Premium inventory curated from confirmed owner reservations.
        </p>
      </header>

      <ReadyStaysMarketplaceClient
        readyStays={readyStays ?? []}
        resorts={(resorts ?? []) as { id: string; name: string }[]}
        searchParams={searchParams ?? {}}
      />

      <section id="ready-stays-guide" className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Guide</p>
          <h2 className="text-2xl font-semibold text-ink">Ready Stays Guide</h2>
          <p className="text-sm text-muted">
            Read the full Ready Stays guide in the Guides section, including payment, transfer timing, and linking steps.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {READY_STAY_GUIDE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
