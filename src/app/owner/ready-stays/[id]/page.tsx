import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ReadyStayMarkdownForm from "@/components/owner/ReadyStayMarkdownForm";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import { buildOwnerReadyStayListItems, type OwnerReadyStayListItem } from "@/lib/owner/secondary-subpages";

function formatDate(value: string | null) {
  if (!value) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrencyFromCents(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function statusClassName(tone: OwnerReadyStayListItem["displayStatusTone"]) {
  if (tone === "live") return "border-transparent text-white shadow-[0_8px_18px_rgba(4,120,87,0.25)]";
  if (tone === "booked") return "border-[#D9C27A] bg-[#FFF8E1] text-[#6B5315]";
  if (tone === "removed") return "border-slate-200 bg-slate-100 text-slate-600";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

function statusStyle(tone: OwnerReadyStayListItem["displayStatusTone"]) {
  if (tone !== "live") return undefined;
  return {
    backgroundColor: "#047857",
    borderColor: "#047857",
    color: "#ffffff",
  };
}

function StatusMarker({ tone }: { tone: OwnerReadyStayListItem["displayStatusTone"] }) {
  if (tone !== "live") return null;
  return <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: "#A7F3D0" }} />;
}

export default async function OwnerReadyStayDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Promise<{ notice?: string }> | { notice?: string };
}) {
  const resolvedSearchParams = searchParams instanceof Promise ? await searchParams : searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/owner/ready-stays/${params.id}`);
  }

  const { data: readyStay } = await supabase
    .from("ready_stays")
    .select(
      "id, rental_id, status, verification_status, verification_review_notes, check_in, check_out, room_type, points, owner_price_per_point_cents, created_at, updated_at, reservation_proof_uploaded_at, is_visible_publicly, slug, title, image_url, expires_at, locked_until, resorts(name, slug, calculator_code)",
    )
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!readyStay) {
    return (
      <div className="space-y-6">
        <OwnerPageHeader
          eyebrow="Ready Stays"
          title="Listing not found"
          description="This Ready Stay is missing or you do not have access."
        />
        <Button asChild>
          <Link href="/owner/ready-stays">Back to Ready Stays</Link>
        </Button>
      </div>
    );
  }

  const points = Number(readyStay.points ?? 0);
  const ownerPrice = Number(readyStay.owner_price_per_point_cents ?? 0);
  const estimatedOwnerPayout = points * ownerPrice;
  const [displayItem] = buildOwnerReadyStayListItems([readyStay]);
  const noticeCopy =
    resolvedSearchParams?.notice === "submitted"
      ? "Your Ready Stay has been submitted. Listings may take up to 10 minutes to appear."
      : readyStay.verification_status === "rejected"
        ? readyStay.verification_review_notes?.trim() || null
        : null;

  return (
    <div className="max-w-6xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/owner/ready-stays" className="text-sm font-semibold text-[#10224A] underline underline-offset-4">
          Ready Stays overview
        </Link>
      </div>

      {noticeCopy ? (
        <Card className="rounded-[18px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          {noticeCopy}
        </Card>
      ) : null}

      <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(16,34,74,0.12)] ring-1 ring-[#E9E2D5]">
        <div className="relative h-[260px] bg-[#EEE8DA] sm:h-[340px]">
          <img
            src={displayItem.imageUrl}
            alt={displayItem.imageAlt}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#081A3A]/55 via-[#081A3A]/8 to-transparent" />
        </div>
        <div className="space-y-7 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8A7243]">Ready Stay</p>
              <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[#10224A] sm:text-5xl">
                {displayItem.resortLabel}
              </h1>
              <p className="mt-3 text-base font-medium text-[#5E6878]">{displayItem.roomLabel}</p>
              <p className="mt-2 text-sm text-[#667085]">
                {formatDate(readyStay.check_in)} - {formatDate(readyStay.check_out)}
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold tracking-[0.16em] ${statusClassName(displayItem.displayStatusTone)}`}
              style={statusStyle(displayItem.displayStatusTone)}
            >
              <StatusMarker tone={displayItem.displayStatusTone} />
              {displayItem.displayStatusLabel}
            </div>
          </div>

          <p className="text-sm text-[#667085]">{displayItem.displayStatusDescription}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FBF8F1] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8992A3]">Points</p>
              <p className="mt-1 text-xl font-semibold text-[#10224A]">{displayItem.pointsLabel}</p>
            </div>
            <div className="rounded-2xl bg-[#FBF8F1] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8992A3]">Payout / point</p>
              <p className="mt-1 text-xl font-semibold text-[#10224A]">{formatCurrencyFromCents(ownerPrice)}</p>
            </div>
            <div className="rounded-2xl bg-[#F7F2E8] px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A6B43]">Estimated payout</p>
              <p className="mt-1 text-xl font-semibold text-[#10224A]">{formatCurrencyFromCents(estimatedOwnerPayout)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[22px] border border-[#E9E2D5] bg-white p-6 shadow-[0_8px_30px_rgba(16,34,74,0.06)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10224A]">Reservation Summary</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resort</p>
              <p className="mt-1 text-sm font-medium text-ink">{displayItem.resortLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Exact room / view</p>
              <p className="mt-1 text-sm font-medium text-ink">{displayItem.roomLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Check-in</p>
              <p className="mt-1 text-sm font-medium text-ink">{formatDate(readyStay.check_in)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Check-out</p>
              <p className="mt-1 text-sm font-medium text-ink">{formatDate(readyStay.check_out)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Points</p>
              <p className="mt-1 text-sm font-medium text-ink">{points.toLocaleString("en-US")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Proof status</p>
              <p className="mt-1 text-sm font-medium text-ink">{displayItem.proofLabel}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-[22px] border border-[#E9E2D5] bg-white p-6 shadow-[0_8px_30px_rgba(16,34,74,0.06)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10224A]">Payout Summary</h2>
              <p className="mt-2 text-sm text-[#667085]">Adjust owner payout per point if this listing supports editing.</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl bg-[#FBF8F1] p-5">
            <ReadyStayMarkdownForm
              readyStayId={readyStay.id}
              initialOwnerPricePerPointCents={ownerPrice}
              points={points}
            />
          </div>
          <div className="mt-4 rounded-2xl bg-[#F7F2E8] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7A6B43]">Estimated owner payout</p>
            <p className="mt-1 text-2xl font-semibold text-[#10224A]">{formatCurrencyFromCents(estimatedOwnerPayout)}</p>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        {displayItem.publicHref ? (
          <Button asChild>
            <Link href={displayItem.publicHref} className="!text-white hover:!text-white">
              View public listing
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost">
          <Link href="/owner/ready-stays">Back to Ready Stays</Link>
        </Button>
      </div>
    </div>
  );
}
