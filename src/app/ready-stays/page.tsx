import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCurrentUserAdminState } from "@/lib/admin";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { isAdminOrPublicReadyStayRow } from "@/lib/ready-stays/visibility";
import ReadyStaysMarketplaceClient from "@/components/ready-stays/ReadyStaysMarketplaceClient";
import ReadyStaysSection from "@/components/ready-stays-showcase/ReadyStaysSection";
import {
  READY_STAYS_SHOWCASE_FLAGS,
} from "@/lib/ready-stays/showcase-mock";
import { getSearchReadyStaysShowcase } from "@/lib/ready-stays/showcase-live";
import { getReadyStayGuestTotalCents } from "@/lib/ready-stays/test-pricing";

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
  searchParams?:
    | Promise<{
        resort?: string;
        month?: string;
        holiday?: string;
        price_min?: string;
        price_max?: string;
        points_min?: string;
        points_max?: string;
        sort?: string;
      }>
    | {
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
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const searchReadyStays = await getSearchReadyStaysShowcase(3);
  const supabase = await createSupabaseServerClient();
  const { isAdmin } = await getCurrentUserAdminState(supabase);
  const readyStaysClient = getSupabaseAdminClient() ?? supabase;
  const today = new Date().toISOString().slice(0, 10);
  const nowMs = Date.now();

  const { data: resorts } = await supabase
    .from("resorts")
    .select("id, name")
    .order("name", { ascending: true });

  let query = readyStaysClient
    .from("ready_stays")
    .select(
      "id, resort_id, check_in, check_out, points, room_type, season_type, guest_price_per_point_cents, original_guest_price_per_point_cents, price_reduced_at, expires_at, locked_until, verification_status, status, is_test_listing, is_visible_publicly, test_guest_total_cents, slug, title, image_url, resorts(name, slug, calculator_code)",
    )
    .in("status", ["active", "test"])
    .gte("check_out", today)
    .order("price_reduced_at", { ascending: false, nullsFirst: false })
    .order("check_in", { ascending: true });

  if (resolvedSearchParams?.resort) {
    query = query.eq("resort_id", resolvedSearchParams.resort);
  }

  if (resolvedSearchParams?.holiday) {
    query = query.eq("season_type", resolvedSearchParams.holiday);
  }

  if (resolvedSearchParams?.month) {
    const [year, month] = resolvedSearchParams.month.split("-").map((part) => Number(part));
    if (year && month) {
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
      const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
      // Include any stay that overlaps the selected month, not only stays that begin in it.
      query = query.lte("check_in", end).gte("check_out", start);
    }
  }

  const priceMin = Number(resolvedSearchParams?.price_min);
  const priceMax = Number(resolvedSearchParams?.price_max);
  if (Number.isFinite(priceMin)) {
    query = query.gte("guest_price_per_point_cents", priceMin);
  }
  if (Number.isFinite(priceMax)) {
    query = query.lte("guest_price_per_point_cents", priceMax);
  }

  const pointsMin = Number(resolvedSearchParams?.points_min);
  const pointsMax = Number(resolvedSearchParams?.points_max);
  if (Number.isFinite(pointsMin)) {
    query = query.gte("points", pointsMin);
  }
  if (Number.isFinite(pointsMax)) {
    query = query.lte("points", pointsMax);
  }

  const { data: readyStays, error: readyStaysError } = await query;
  if (readyStaysError) {
    console.error("[ready-stays/page] query failed", {
      message: readyStaysError.message,
      code: readyStaysError.code,
      details: readyStaysError.details,
      hint: readyStaysError.hint,
      isAdmin,
    });
  }
  const visibleReadyStays = (readyStays ?? []).filter((stay) => {
    return isAdminOrPublicReadyStayRow(stay, isAdmin, nowMs, today);
  }).filter((stay) => {
    if (resolvedSearchParams?.resort && stay.resort_id !== resolvedSearchParams.resort) return false;
    if (resolvedSearchParams?.holiday && stay.season_type !== resolvedSearchParams.holiday) return false;

    if (resolvedSearchParams?.month) {
      const [year, month] = resolvedSearchParams.month.split("-").map((part) => Number(part));
      if (year && month) {
        const monthStart = new Date(Date.UTC(year, month - 1, 1));
        const monthEnd = new Date(Date.UTC(year, month, 0));
        const checkIn = new Date(`${stay.check_in}T00:00:00Z`);
        const checkOut = new Date(`${stay.check_out}T00:00:00Z`);
        if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) return false;
        if (checkIn > monthEnd || checkOut < monthStart) return false;
      }
    }

    const effectiveGuestTotalCents = getReadyStayGuestTotalCents(stay);
    const effectivePricePerPointCents =
      stay.points > 0 ? Math.round(effectiveGuestTotalCents / stay.points) : stay.guest_price_per_point_cents;
    if (Number.isFinite(priceMin) && effectivePricePerPointCents < priceMin) return false;
    if (Number.isFinite(priceMax) && effectivePricePerPointCents > priceMax) return false;
    if (Number.isFinite(pointsMin) && stay.points < pointsMin) return false;
    if (Number.isFinite(pointsMax) && stay.points > pointsMax) return false;

    return true;
  });

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <section className="max-w-4xl space-y-3">
        <div className="space-y-2.5">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">PIXIE READY STAYS</p>
          <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.45rem]">
            Instant-Book Disney Villa Stays
          </h1>
          <p className="max-w-[560px] text-sm leading-7 text-muted sm:text-[15px]">
            Browse Disney villa reservations already secured through verified DVC owners.
          </p>
        </div>

        <p className="text-sm leading-7 text-slate-500">
          Pre-confirmed stays • Fixed travel dates • Faster than custom matching
        </p>
      </section>

      <ReadyStaysMarketplaceClient
        readyStays={visibleReadyStays}
        resorts={(resorts ?? []) as { id: string; name: string }[]}
        searchParams={resolvedSearchParams ?? {}}
      />
      {READY_STAYS_SHOWCASE_FLAGS.enableSearchReadyStays ? (
        <ReadyStaysSection
          title="Skip the wait - Book instantly"
          subtitle="Featured opportunities selected for guests who want confirmed inventory now."
          items={searchReadyStays}
          layout="row"
          className="pt-2"
        />
      ) : null}

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
