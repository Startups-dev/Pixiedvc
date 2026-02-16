import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Button, Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

function getLifecycleLabel(status: string) {
  if (status === "sold") return "Sold";
  if (status === "active") return "Live";
  return "Paused";
}

function getStatusPillClasses(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]";
  if (status === "sold") return `${base} bg-emerald-100 text-emerald-700`;
  if (status === "active") return `${base} bg-indigo-100 text-indigo-700`;
  return `${base} bg-amber-100 text-amber-700`;
}

export default async function OwnerReadyStayDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
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
      "id, rental_id, status, check_in, check_out, room_type, points, owner_price_per_point_cents, guest_price_per_point_cents, created_at, updated_at, resorts(name)",
    )
    .eq("id", params.id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!readyStay) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready stays</p>
          <h1 className="text-3xl font-semibold text-ink">Listing not found</h1>
          <p className="text-sm text-muted">This Ready Stay is missing or you do not have access.</p>
        </header>
        <Button asChild>
          <Link href="/owner/ready-stays">Back to Ready Stays</Link>
        </Button>
      </div>
    );
  }

  const points = Number(readyStay.points ?? 0);
  const ownerPrice = Number(readyStay.owner_price_per_point_cents ?? 0);
  const guestPrice = Number(readyStay.guest_price_per_point_cents ?? 0);
  const totalGuest = points * guestPrice;
  const lifecycle = getLifecycleLabel(readyStay.status);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-12">
      <header className="space-y-3">
        <Link href="/owner/ready-stays" className="text-xs uppercase tracking-[0.3em] text-muted">
          ← Back to Ready Stays
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Ready stays</p>
            <h1 className="text-3xl font-semibold text-ink">{readyStay.resorts?.name ?? "Ready Stay listing"}</h1>
            <p className="text-sm text-muted">
              {formatDate(readyStay.check_in)} - {formatDate(readyStay.check_out)}
            </p>
          </div>
          <span className={getStatusPillClasses(readyStay.status)}>{readyStay.status}</span>
        </div>
      </header>

      <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Listing Status</h2>
        <p className="text-sm text-muted">
          Lifecycle: <span className="font-semibold text-ink">{lifecycle}</span>
        </p>
      </Card>

      <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Listing Details</h2>
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner Price / Point</p>
            <p className="mt-1 text-sm text-ink">{formatCurrencyFromCents(ownerPrice)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Guest Price / Point</p>
            <p className="mt-1 text-sm text-ink">{formatCurrencyFromCents(guestPrice)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Price</p>
            <p className="mt-1 text-sm text-ink">{formatCurrencyFromCents(totalGuest)}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-ink">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/owner/rentals/${readyStay.rental_id}`}>Edit Listing</Link>
          </Button>
          <Button disabled variant="ghost">
            Pause Listing
          </Button>
          <Button disabled variant="ghost">
            Remove Listing
          </Button>
        </div>
      </Card>
    </div>
  );
}
