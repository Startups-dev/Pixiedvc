import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getOwnerMatchDetail } from "@/lib/owner-data";
import { formatCurrency } from "@/lib/owner-portal";
import OwnerMatchActions from "@/components/owner/OwnerMatchActions";
import styles from "./match-header.module.css";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRatePerPoint(rateCents: number | null) {
  if (rateCents === null || !Number.isFinite(rateCents)) return "—";
  return `$${(rateCents / 100).toFixed(2)}/pt`;
}

function getFamilyLabel(name: string | null) {
  if (!name) return "Guest Family";
  const tokens = name.split(" ").filter(Boolean);
  const last = tokens.length ? tokens[tokens.length - 1] : "Guest";
  return `${last} Family`;
}

type OwnerMatchBooking = {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
};

function formatAddress(matchBooking: OwnerMatchBooking | null | undefined) {
  if (!matchBooking) return "—";
  const parts = [
    matchBooking.address_line1,
    matchBooking.address_line2,
    matchBooking.city,
    matchBooking.state,
    matchBooking.postal_code,
    matchBooking.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

export default async function OwnerMatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/owner/matches/${matchId}`);
  }

  const matchDetail = await getOwnerMatchDetail(user.id, matchId, cookieStore);
  if (!matchDetail) {
    notFound();
  }

  const { match, guests } = matchDetail;
  const booking = match.booking;
  const resortName = booking?.primary_resort?.name ?? "Resort TBD";
  const points = booking?.total_points ?? match.points_reserved ?? 0;
  const familyLabel = getFamilyLabel(booking?.lead_guest_name ?? null);
  const checkInLabel = formatShortDate(booking?.check_in ?? null);
  const checkOutLabel = formatShortDate(booking?.check_out ?? null);
  const partySize =
    typeof booking?.adults === "number" && typeof booking?.youths === "number"
      ? booking.adults + booking.youths
      : null;
  const ownerRatePerPointCents =
    typeof match.owner_rate_per_point_cents === "number" ? match.owner_rate_per_point_cents : null;
  const ownerPremiumCents =
    typeof match.owner_premium_per_point_cents === "number" ? match.owner_premium_per_point_cents : null;
  const ownerTotalCents =
    typeof match.owner_total_cents === "number" ? match.owner_total_cents : null;
  const premiumApplied = Boolean(match.owner_home_resort_premium_applied);
  const guestTotalCents =
    typeof booking?.guest_total_cents === "number" ? booking.guest_total_cents : null;
  const guestRatePerPointCents =
    typeof booking?.guest_rate_per_point_cents === "number" ? booking.guest_rate_per_point_cents : null;

  const serverNow = new Date().toISOString();
  const matchCreatedAt = match.created_at ? new Date(match.created_at).getTime() : null;
  const fallbackExpiresAt =
    matchCreatedAt ? new Date(matchCreatedAt + 60 * 60 * 1000).toISOString() : null;
  const expiresAt = match.expires_at ?? fallbackExpiresAt ?? serverNow;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className={`space-y-4 ${styles.header}`}>
        <Link href="/owner/matches" className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">
          ← Back to matches
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-ink">{resortName}</h1>
          <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
            {points.toLocaleString("en-US")} pts
          </span>
        </div>
        <p className="text-lg font-medium text-slate-700">{familyLabel}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
            {checkInLabel}
          </span>
          <span className="text-slate-400">→</span>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
            {checkOutLabel}
          </span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="order-2 space-y-6 lg:order-1">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Booking package</p>
            <h2 className="text-xl font-semibold text-ink">Guest request details</h2>
            <p className="text-sm text-slate-600">
              This request is reserved for you for 60 minutes since matching.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 text-sm text-slate-700">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resort</p>
              <p className="font-semibold text-ink">{resortName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Room type</p>
              <p className="font-semibold text-ink">{booking?.primary_room ?? "TBD"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dates</p>
              <p className="font-semibold text-ink">
                {formatDate(booking?.check_in ?? null)} → {formatDate(booking?.check_out ?? null)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Points</p>
              <p className="font-semibold text-ink">{points.toLocaleString("en-US")}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Owner payout</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {ownerTotalCents !== null ? formatCurrency(ownerTotalCents) : "—"}
            </p>
            <p className="text-xs text-slate-500">
              Rate: {formatRatePerPoint(ownerRatePerPointCents)}
              {premiumApplied && ownerPremiumCents ? ` (+$${(ownerPremiumCents / 100).toFixed(2)} home resort premium)` : ""}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lead guest</p>
            <p className="mt-2 font-semibold text-ink">{booking?.lead_guest_name ?? "Guest TBD"}</p>
            <p>{booking?.lead_guest_email ?? "Email TBD"}</p>
            <p>{booking?.lead_guest_phone ?? "Phone TBD"}</p>
            <p className="mt-2 text-slate-600">{formatAddress(booking)}</p>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest roster</p>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              {guests.length === 0 ? (
                <p className="text-sm text-slate-500">No additional guests listed.</p>
              ) : (
                <table className="min-w-full text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-2 py-2">Guest</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Age</th>
                      <th className="px-2 py-2">Email</th>
                      <th className="px-2 py-2">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guests.map((guest) => (
                      <tr key={guest.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-ink">
                          {[guest.title, guest.first_name, guest.last_name].filter(Boolean).join(" ") || "Guest"}
                        </td>
                        <td className="px-2 py-2">{guest.age_category ?? "—"}</td>
                        <td className="px-2 py-2">{guest.age ?? "—"}</td>
                        <td className="px-2 py-2">{guest.email ?? "—"}</td>
                        <td className="px-2 py-2">{guest.phone ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Party size: {partySize ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Deposit status</p>
            <p className="mt-2 font-semibold text-ink">
              {booking?.deposit_paid && booking.deposit_paid >= 99 ? "Deposit collected ($99)" : "Deposit pending"}
            </p>
            <p className="text-xs text-slate-500">
              Paid: {booking?.deposit_paid ?? 0} {booking?.deposit_currency ?? "USD"} · Due: {booking?.deposit_due ?? 99} {booking?.deposit_currency ?? "USD"}
            </p>
          </div>

          {(booking?.comments || booking?.requires_accessibility) ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Special needs / notes</p>
              <p className="mt-2">
                {booking?.requires_accessibility ? "Accessibility requested. " : null}
                {booking?.comments ?? "No additional notes."}
              </p>
            </div>
          ) : null}
        </Card>

        <Card className="order-1 lg:order-2">
          <OwnerMatchActions
            matchId={match.id}
            initialStatus={match.status}
            expiresAt={expiresAt}
            serverNow={serverNow}
            familyLabel={familyLabel}
            initialRentalId={match.rental_id ?? null}
          />
        </Card>
      </section>
    </div>
  );
}
