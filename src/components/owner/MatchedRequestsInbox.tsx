"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, Button } from "@pixiedvc/design-system";
import MilestoneStepper from "@/components/owner/MilestoneStepper";

type BookingGuest = {
  id: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_category: string | null;
  age: number | null;
};

type BookingData = {
  id: string;
  check_in: string | null;
  check_out: string | null;
  total_points: number | null;
  primary_room: string | null;
  primary_view: string | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  lead_guest_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  adults: number | null;
  youths: number | null;
  requires_accessibility: boolean | null;
  comments: string | null;
  deposit_due: number | null;
  deposit_paid: number | null;
  deposit_currency: string | null;
  primary_resort: { id: string; name: string | null; slug: string | null; calculator_code: string | null } | null;
};

type MatchRow = {
  id: string;
  status: string;
  points_reserved: number | null;
  created_at: string;
  expires_at: string | null;
  booking: BookingData | null;
};

type RentalRow = {
  id: string;
  status: string;
  match_id?: string | null;
  rental_milestones?: { code: string; status: string; occurred_at: string | null }[];
  booking_package?: Record<string, unknown> | null;
  dvc_confirmation_number?: string | null;
};

type MatchItem = {
  match: MatchRow;
  rental: RentalRow | null;
  guests: BookingGuest[];
};

type Props = {
  matches: MatchItem[];
};

function formatShortDate(value: string | null, includeYear = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

function formatDateRange(checkIn: string | null, checkOut: string | null) {
  return {
    checkInLabel: formatShortDate(checkIn, false),
    checkOutLabel: formatShortDate(checkOut, true),
  };
}

function getLastName(fullName: string | null) {
  if (!fullName) return "Guest";
  const tokens = fullName
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const filtered = tokens.filter((token) => {
    const lower = token.toLowerCase().replace(/\./g, "");
    return !["mr", "mrs", "ms", "miss", "dr"].includes(lower);
  });
  const last = filtered.length ? filtered[filtered.length - 1] : tokens[tokens.length - 1];
  return last || "Guest";
}

function formatAddress(booking: BookingData | null) {
  if (!booking) return "—";
  const parts = [
    booking.address_line1,
    booking.address_line2,
    booking.city,
    booking.state,
    booking.postal_code,
    booking.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function statusBadge(status: string) {
  const base = "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]";
  switch (status) {
    case "awaiting_owner_approval":
      return `${base} bg-amber-100 text-amber-700`;
    case "needs_dvc_booking":
      return `${base} bg-amber-100 text-amber-700`;
    case "pending_confirmation":
      return `${base} bg-indigo-100 text-indigo-700`;
    case "deposit_paid":
      return `${base} bg-emerald-100 text-emerald-700`;
    case "completed":
      return `${base} bg-emerald-200 text-emerald-800`;
    case "cancelled":
      return `${base} bg-rose-100 text-rose-700`;
    case "expired":
      return `${base} bg-slate-200 text-slate-600`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "awaiting_owner_approval":
      return "Awaiting owner approval";
    case "needs_dvc_booking":
      return "Needs DVC booking";
    case "pending_confirmation":
      return "Pending Disney confirmation";
    case "deposit_paid":
      return "Deposit paid (70%)";
    case "completed":
      return "Complete";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired / rematched";
    default:
      return "Awaiting owner approval";
  }
}

function primaryCta(status: string, matchId: string, rentalId: string | null) {
  if (status === "awaiting_owner_approval") {
    return { label: "Review & Accept", href: `/owner/matches/${matchId}` };
  }
  if (status === "needs_dvc_booking") {
    return { label: "Book with DVC", href: rentalId ? `/owner/rentals/${rentalId}` : `/owner/matches/${matchId}` };
  }
  if (status === "pending_confirmation") {
    return { label: "Upload Confirmation", href: rentalId ? `/owner/rentals/${rentalId}` : `/owner/matches/${matchId}` };
  }
  if (status === "completed") {
    return { label: "View Details", href: rentalId ? `/owner/rentals/${rentalId}` : `/owner/matches/${matchId}` };
  }
  return null;
}

function buildMatchMilestones(match: MatchRow, rental: RentalRow | null) {
  if (rental?.rental_milestones?.length) return rental.rental_milestones;
  const booking = match.booking;
  const nowIso = new Date().toISOString();
  const leadComplete = Boolean(booking?.lead_guest_name && booking?.lead_guest_email && booking?.lead_guest_phone);
  const depositPaid = typeof booking?.deposit_paid === "number" && booking.deposit_paid >= 99;
  return [
    { code: "matched", status: "completed", occurred_at: nowIso },
    { code: "guest_verified", status: leadComplete ? "completed" : "pending", occurred_at: leadComplete ? nowIso : null },
    { code: "payment_verified", status: depositPaid ? "completed" : "pending", occurred_at: depositPaid ? nowIso : null },
    { code: "booking_package_sent", status: "completed", occurred_at: nowIso },
    { code: "agreement_sent", status: "pending", occurred_at: null },
    { code: "owner_approved", status: "pending", occurred_at: null },
    { code: "owner_booked", status: "pending", occurred_at: null },
    { code: "disney_confirmation_uploaded", status: "pending", occurred_at: null },
    { code: "check_in", status: "pending", occurred_at: null },
    { code: "check_out", status: "pending", occurred_at: null },
  ];
}

export function deriveMatchStatus(match: MatchRow, rental: RentalRow | null) {
  if (match.status === "expired" || match.status === "rematched") return "expired";
  if (match.status === "declined") return "declined";
  if (rental?.status === "cancelled") return "cancelled";
  if (rental?.status === "completed") return "completed";
  if (rental?.status === "needs_dvc_booking") return "needs_dvc_booking";
  if (rental?.status === "booked_pending_agreement" || rental?.status === "booked") return "pending_confirmation";
  if (match.status === "accepted") return "needs_dvc_booking";
  return "awaiting_owner_approval";
}

type InboxProps = Props & {
  embedded?: boolean;
  showHeader?: boolean;
  emptyMessage?: string;
};

export default function MatchedRequestsInbox({
  matches,
  embedded = false,
  showHeader = true,
  emptyMessage,
}: InboxProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...matches].sort((a, b) => new Date(b.match.created_at).getTime() - new Date(a.match.created_at).getTime()),
    [matches],
  );

  const header = showHeader ? (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Matched requests</p>
        <h2 className="text-xl font-semibold text-ink">Guests waiting for your action</h2>
      </div>
      <Link href="/owner/dashboard?tab=matches" className="text-xs font-semibold text-brand hover:underline">
        View all
      </Link>
    </div>
  ) : null;

  const body = sorted.length === 0 ? (
    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
      {emptyMessage ?? "No matched requests yet."}
    </p>
  ) : (
    <div className="space-y-3">
      {sorted.map(({ match, rental, guests }) => {
        const booking = match.booking;
        const resortCode =
          booking?.primary_resort?.calculator_code ?? booking?.primary_resort?.slug ?? "RES";
        const points = booking?.total_points ?? match.points_reserved ?? 0;
        const lastName = getLastName(booking?.lead_guest_name ?? null);
        const { checkInLabel, checkOutLabel } = formatDateRange(booking?.check_in ?? null, booking?.check_out ?? null);
        const displayStatus = deriveMatchStatus(match, rental);
        const cta = primaryCta(displayStatus, match.id, rental?.id ?? null);
        const isOpen = openId === match.id;

            return (
              <div key={match.id} className="rounded-2xl border border-slate-200 bg-white">
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : match.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 text-left"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {resortCode}
                    </span>
                    <p className="text-sm font-semibold text-ink">{lastName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        {checkInLabel}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700">
                        {checkOutLabel}
                      </span>
                    </div>
                    <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                      {points.toLocaleString("en-US")} pts
                    </span>
                    {rental?.dvc_confirmation_number ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        Confirmation #{rental.dvc_confirmation_number}
                      </span>
                    ) : null}
                    <span className={statusBadge(displayStatus)}>{statusLabel(displayStatus)}</span>
                    {cta ? (
                      <Link
                    href={cta.href}
                    className="inline-flex items-center justify-center rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(14,116,255,0.25)]"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {cta.label}
                  </Link>
                ) : null}
              </div>
            </button>

            <div
              className={`grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="min-h-0">
                <div
                  className={`space-y-6 px-4 pb-5 transition-all duration-200 ease-out ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                >
                  <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Booking package</p>
                      <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resort</p>
                          <p className="font-semibold text-ink">{booking?.primary_resort?.name ?? "Resort TBD"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Room type</p>
                          <p className="font-semibold text-ink">{booking?.primary_room ?? "TBD"}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Dates</p>
                          <p className="font-semibold text-ink">
                            {formatShortDate(booking?.check_in ?? null, true)} → {formatShortDate(booking?.check_out ?? null, true)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Points</p>
                          <p className="font-semibold text-ink">{points.toLocaleString("en-US")}</p>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lead guest</p>
                        <p className="mt-2 font-semibold text-ink">{booking?.lead_guest_name ?? "Guest TBD"}</p>
                        <p>{booking?.lead_guest_email ?? "Email TBD"}</p>
                        <p>{booking?.lead_guest_phone ?? "Phone TBD"}</p>
                        <p className="mt-2 text-slate-600">{formatAddress(booking ?? null)}</p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest roster</p>
                        {guests.length === 0 ? (
                          <p className="mt-2 text-sm text-slate-500">No additional guests listed.</p>
                        ) : (
                          <table className="mt-3 min-w-full text-left text-sm text-slate-600">
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

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Deposit status</p>
                        <p className="mt-2 font-semibold text-ink">
                          {booking?.deposit_paid && booking.deposit_paid >= 99 ? "Deposit collected ($99)" : "Deposit pending"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Paid: {booking?.deposit_paid ?? 0} {booking?.deposit_currency ?? "USD"} · Due: {booking?.deposit_due ?? 99} {booking?.deposit_currency ?? "USD"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Milestones</p>
                      <MilestoneStepper milestones={buildMatchMilestones(match, rental)} compact />
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Action</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {statusLabel(displayStatus)}
                        </p>
                        <div className="mt-3">
                          {cta ? (
                            <Button asChild>
                              <Link href={cta.href}> {cta.label} </Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">No action needed.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const content = (
    <div className={embedded ? "space-y-4" : "space-y-4"}>
      {header}
      {body}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card className="space-y-4">
      {header}
      {body}
    </Card>
  );
}
