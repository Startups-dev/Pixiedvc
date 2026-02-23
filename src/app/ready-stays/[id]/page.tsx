import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Check } from "lucide-react";
import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { resolveResortImage } from "@/lib/resort-image";

type ReadyStayDetail = {
  id: string;
  resort_id: string;
  check_in: string;
  check_out: string;
  points: number;
  room_type: string;
  season_type: string;
  guest_price_per_point_cents: number;
  owner_price_per_point_cents: number;
  resorts?: {
    name?: string | null;
    slug?: string | null;
    calculator_code?: string | null;
  } | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrencyFromCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function imageIndexFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 5;
  }
  return (hash % 5) + 1;
}

function holidayLabel(seasonType: string | null) {
  switch (seasonType) {
    case "christmas":
      return "Christmas";
    case "halloween":
      return "Halloween";
    case "marathon":
      return "Marathon";
    case "spring_break":
      return "Spring Break";
    default:
      return null;
  }
}

export default async function ReadyStayDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const { data: stay } = await supabase
    .from("ready_stays")
    .select(
      "id, resort_id, check_in, check_out, points, room_type, season_type, guest_price_per_point_cents, owner_price_per_point_cents, resorts(name, slug, calculator_code)",
    )
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (!stay) {
    redirect("/ready-stays");
  }

  const resortName = stay.resorts?.name ?? "Resort";
  const resortSlug = stay.resorts?.slug ?? null;
  const resortCode = stay.resorts?.calculator_code ?? null;
  const imageIndex = imageIndexFromId(stay.id);
  const image = resolveResortImage({ resortSlug, resortCode, imageIndex });
  const badge = holidayLabel(stay.season_type);
  const totalPriceCents = stay.guest_price_per_point_cents * stay.points;
  const { data: auth } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(auth?.user);
  const ctaHref = isLoggedIn ? `/ready-stays/${stay.id}/book` : `/login?redirect=/ready-stays/${stay.id}/book`;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-[360px] w-full overflow-hidden">
              <img src={image.url} alt={resortName} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />
              {badge ? (
                <span className="absolute left-6 top-6 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700">
                  {badge}
                </span>
              ) : null}
            </div>
          </div>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Stay details</p>
                <div>
                  <p className="text-sm font-semibold text-ink">Resort</p>
                  <p className="text-sm text-muted">{resortName}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Room type</p>
                  <p className="text-sm text-muted">{stay.room_type}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Points</p>
                  <p className="text-sm text-muted">{stay.points}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">Season</p>
                  <p className="text-sm text-muted">{badge ?? "Standard"}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Policies</p>
                <div className="space-y-2 text-sm text-muted">
                  <p>
                    Ready Stays follow PixieDVC&apos;s rental policies. Because these reservations are already confirmed through Disney Vacation Club, cancellation and change terms are defined in your rental agreement prior to payment.
                  </p>
                  <p>
                    Ready Stays are best suited for guests with firm travel plans. We encourage you to review your agreement carefully before securing your reservation.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink">
                How transfer works
                <span className="text-xs font-semibold text-muted">Expand</span>
              </summary>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>Guest books and signs the transfer agreement.</li>
                <li>Owner transfers the reservation in Disney.</li>
                <li>Confirmation is delivered and you link it to Disney Experience App.</li>
              </ul>
            </details>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready Stay</p>
            <h1 className="mt-3 text-2xl font-semibold text-ink">{resortName}</h1>
            <p className="mt-2 text-sm text-muted">
              {formatDate(stay.check_in)} – {formatDate(stay.check_out)}
            </p>
            <p className="text-sm text-muted">{stay.room_type}</p>
            {badge ? (
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {badge}
              </span>
            ) : null}

            <div className="mt-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Total price</p>
              <p className="text-3xl font-semibold text-ink">{formatCurrencyFromCents(totalPriceCents)}</p>
              <p className="text-sm text-muted">
                {stay.points} points • {formatCurrencyFromCents(stay.guest_price_per_point_cents)}/pt
              </p>
            </div>

            <div className="my-5 h-px w-full bg-slate-200" />

            <Button asChild className="mt-6 w-full !text-white hover:!text-white visited:!text-white">
              <Link href={ctaHref} prefetch={false} className="!text-white hover:!text-white visited:!text-white">
                {isLoggedIn ? "Book this stay" : "Log in to book"}
              </Link>
            </Button>
            <div className="mt-4 space-y-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Confirmed Disney reservation</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Secure contract transfer</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span>Payout released after proof</span>
              </div>
            </div>
            <Link href="/ready-stays" className="mt-3 block text-xs font-semibold text-muted hover:text-ink">
              Back to Ready Stays
            </Link>
          </Card>
        </aside>
      </div>
    </main>
  );
}
