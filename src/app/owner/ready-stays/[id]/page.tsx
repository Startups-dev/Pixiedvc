import Link from "next/link";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ReadyStayMarkdownForm from "@/components/owner/ReadyStayMarkdownForm";
import OwnerPageHeader from "@/components/owner/shared/OwnerPageHeader";
import OwnerRecordStatusBadge from "@/components/owner/shared/OwnerRecordStatusBadge";
import { getOwnerReadyStayStatusLabel } from "@/lib/owner/status-labels";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatCurrencyFromCents(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function statusTone(status: string, verificationStatus: string | null) {
  if (status === "sold") return "success";
  if (status === "expired" || status === "removed" || verificationStatus === "rejected") return "issue";
  if (status === "active") return "success";
  return "attention";
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
      "id, rental_id, status, verification_status, verification_review_notes, check_in, check_out, room_type, points, owner_price_per_point_cents, created_at, updated_at, resorts(name)",
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
  const displayStatus = getOwnerReadyStayStatusLabel(readyStay.status, readyStay.verification_status ?? null);
  const confirmationCopy =
    resolvedSearchParams?.notice === "submitted"
      ? {
          title: "Your Ready Stay has been submitted.",
          body: "Listings may take up to 10 minutes to appear.",
        }
      : readyStay.status === "active"
      ? {
          title: "Your Ready Stay is live.",
          body: "Guests can now view this listing and move forward with booking.",
        }
      : readyStay.status === "sold"
        ? {
            title: "This Ready Stay has been booked.",
            body: "You can review the listing details here anytime.",
          }
        : readyStay.verification_status === "rejected"
          ? {
              title: "We need a little more information before this listing can appear.",
              body: readyStay.verification_review_notes?.trim() || "Please update the reservation proof and try again.",
            }
        : {
            title: "Your Ready Stay has been submitted.",
            body: "Listings may take up to 10 minutes to appear.",
          };

  return (
    <div className="max-w-4xl space-y-6">
      <OwnerPageHeader
        eyebrow="Ready Stays"
        title={readyStay.resorts?.name ?? "Ready Stay listing"}
        description={`${formatDate(readyStay.check_in)} - ${formatDate(readyStay.check_out)}`}
        summary={displayStatus}
      />

      <Card className="space-y-4 rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
        <div className="space-y-1">
          <OwnerRecordStatusBadge label={displayStatus} tone={statusTone(readyStay.status, readyStay.verification_status ?? null)} />
          <h2 className="pt-3 text-xl font-semibold text-[#10224A]">{confirmationCopy.title}</h2>
          <p className="text-sm leading-6 text-[#667085]">{confirmationCopy.body}</p>
        </div>
      </Card>

      <Card className="space-y-4 rounded-[18px] border border-[#E7E7E4] bg-white p-6 shadow-[0_1px_2px_rgba(16,34,74,0.04)]">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10224A]">Listing Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Resort</p>
            <p className="mt-1 text-sm text-ink">{readyStay.resorts?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Dates</p>
            <p className="mt-1 text-sm text-ink">
              {formatDate(readyStay.check_in)} - {formatDate(readyStay.check_out)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Room Type</p>
            <p className="mt-1 text-sm text-ink">{readyStay.room_type ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Points</p>
            <p className="mt-1 text-sm text-ink">{points.toLocaleString("en-US")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner Payout / Point</p>
            <ReadyStayMarkdownForm
              readyStayId={readyStay.id}
              initialOwnerPricePerPointCents={ownerPrice}
              points={points}
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estimated Owner Payout</p>
            <p className="mt-1 text-sm text-ink">{formatCurrencyFromCents(estimatedOwnerPayout)}</p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/owner/ready-stays">View inventory</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/owner/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
