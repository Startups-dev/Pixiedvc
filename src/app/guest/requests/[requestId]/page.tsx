import type { ReactNode } from "react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { resolveResortImage } from "@/lib/resort-image";
import GuestDetailsClient from "./GuestDetailsClient";

export const dynamic = "force-dynamic";

type BookingRequestRow = {
  id: string;
  renter_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  check_in: string | null;
  check_out: string | null;
  primary_room: string | null;
  primary_view: string | null;
  adults: number | null;
  youths: number | null;
  total_points: number | null;
  max_price_per_point: number | null;
  est_cash: number | null;
  guest_total_cents: number | null;
  guest_rate_per_point_cents: number | null;
  requires_accessibility: boolean | null;
  comments: string | null;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  lead_guest_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  deposit_due: number | null;
  deposit_paid: number | null;
  deposit_currency: string | null;
  primary_resort: { name: string | null; slug: string | null } | null;
};

type GuestRow = {
  first_name: string | null;
  last_name: string | null;
  age_category: string | null;
  age: number | null;
};

type ContractRow = {
  id: number;
  status: string | null;
  sent_at: string | null;
  guest_accept_token: string | null;
  booking_request_id: string | null;
  created_at: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function GuestRequestPage({
  params,
}: {
  params: { requestId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=/guest/requests/${params.requestId}`);
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      "id, renter_id, status, created_at, updated_at, check_in, check_out, primary_room, primary_view, adults, youths, total_points, max_price_per_point, est_cash, guest_total_cents, guest_rate_per_point_cents, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name,slug)",
    )
    .eq("id", params.requestId)
    .eq("renter_id", user.id)
    .maybeSingle();

  if (error) {
    notFound();
  }

  if (!data) {
    notFound();
  }

  const request = data as BookingRequestRow;
  const { data: guests } = await supabase
    .from("booking_request_guests")
    .select("first_name, last_name, age_category, age")
    .eq("booking_id", request.id);

  const { data: contractsData } = await supabase
    .from("contracts")
    .select(
      "id, status, sent_at, guest_accept_token, booking_request_id, created_at",
    )
    .eq("booking_request_id", request.id)
    .order("created_at", { ascending: false });

  const contracts = (contractsData ?? []) as ContractRow[];
  const contract = contracts[0] ?? null;
  const resortImage = resolveResortImage({
    resortSlug: request.primary_resort?.slug,
    imageIndex: 1,
  }).url;
  const nightlyAverage =
    typeof request.est_cash === "number" &&
    request.check_in &&
    request.check_out
      ? request.est_cash /
        Math.max(1, nightsBetween(request.check_in, request.check_out))
      : null;
  const estimatedTotal =
    typeof request.est_cash === "number" ? request.est_cash : null;
  const depositPaid =
    typeof request.deposit_paid === "number" ? request.deposit_paid : 0;
  const remainingBalance =
    typeof estimatedTotal === "number"
      ? Math.max(estimatedTotal - depositPaid, 0)
      : null;

  if (process.env.NODE_ENV !== "production") {
    if (contracts.length === 0) {
      console.info("[guest-request-details] no contracts found", {
        requestId: request.id,
      });
    } else {
      console.info("[guest-request-details] contracts found", {
        requestId: request.id,
        count: contracts.length,
      });
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
        <div className="grid lg:grid-cols-[1.1fr_1fr]">
          <div className="relative min-h-[260px] overflow-hidden bg-slate-200">
            <img
              src={resortImage}
              alt={request.primary_resort?.name ?? "Disney villa resort"}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,20,40,0.28)] via-[rgba(10,20,40,0.12)] to-transparent" />
          </div>
          <div className="p-7 sm:p-8">
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <Link
                href="/guest"
                className="text-slate-500 hover:text-slate-700"
              >
                ← Back to reservations
              </Link>
              <Link
                href={`/my-trip/${request.id}`}
                className="text-[#4457c7] hover:text-[#263891]"
              >
                Open My Vacation
              </Link>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex rounded-full bg-[#eef2ff] px-3 py-1.5 text-sm font-medium text-[#4457c7] shadow-[0_8px_18px_rgba(68,87,199,0.12)]">
                  {formatStatus(request.status)}
                </span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-[2.5rem]">
                  {request.primary_resort?.name ?? "Your Disney villa stay"}
                </h1>
                <p className="text-base text-slate-600">
                  {formatStayDateRange(request.check_in, request.check_out)}
                </p>
                <p className="text-base text-slate-600">
                  {request.primary_room ?? "Villa"}
                  {request.primary_view
                    ? ` · ${request.primary_view}`
                    : ""} · {partyLabel(request.adults, request.youths)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Estimated total
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatCurrency(request.est_cash, request.deposit_currency)}{" "}
                    <span className="text-sm font-medium text-slate-500">
                      USD
                    </span>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Average per night
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-slate-900">
                    {nightlyAverage
                      ? formatShortCurrency(
                          nightlyAverage,
                          request.deposit_currency,
                        )
                      : "—"}{" "}
                    <span className="text-sm font-medium text-slate-500">
                      USD
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-500">
                Your concierge team is now reviewing availability.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-semibold text-slate-900">
            Reservation timeline
          </h2>
          <div className="mt-6 space-y-6">
            <TimelineItem
              complete
              icon={<CheckCircleIcon className="h-5 w-5" />}
              title="Request submitted"
              body="Your reservation request has been received."
            />
            <TimelineItem
              active
              icon={<ClockIcon className="h-5 w-5" />}
              title="Concierge review"
              body="We are reviewing availability with eligible DVC owners."
            />
            <TimelineItem
              icon={<CheckCircleIcon className="h-5 w-5" />}
              title="Reservation secured"
              body="Your concierge team confirms a matching reservation."
            />
            <TimelineItem
              icon={<CheckCircleIcon className="h-5 w-5" />}
              title="Final payment & Disney confirmation"
              body="You receive your Disney reservation confirmation details."
              last
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          <h2 className="text-xl font-semibold text-slate-900">
            Reservation overview
          </h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <SummaryRow
              label="Room type"
              value={request.primary_room ?? "TBD"}
            />
            <SummaryRow label="View" value={request.primary_view ?? "TBD"} />
            <SummaryRow
              label="Guests"
              value={partyLabel(request.adults, request.youths)}
            />
            <SummaryRow
              label="DVC points"
              value={request.total_points ? `${request.total_points}` : "TBD"}
            />
            <SummaryRow
              label="Pricing tier"
              value={
                request.max_price_per_point
                  ? `${formatPricePerPoint(request.max_price_per_point)} per point`
                  : "Estimate in progress"
              }
            />
            <SummaryRow
              label="Deposit paid"
              value={formatCurrency(
                request.deposit_paid,
                request.deposit_currency,
              )}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h2 className="text-xl font-semibold text-slate-900">
          Reservation financial overview
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <SoftMetric
            label="Estimated total"
            value={`${formatCurrency(estimatedTotal, request.deposit_currency)} USD`}
            emphasis="primary"
          />
          <SoftMetric
            label="Deposit paid"
            value={`${formatCurrency(request.deposit_paid, request.deposit_currency)} USD`}
            emphasis="secondary"
          />
          <SoftMetric
            label="Remaining balance"
            value={`${formatCurrency(remainingBalance, request.deposit_currency)} USD`}
            emphasis="primary"
          />
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Final payment is only collected after we review availability and send
          your reservation agreement for approval.
        </p>
      </section>

      <GuestDetailsClient
        requestId={request.id}
        userEmail={user.email ?? null}
        leadGuestEmail={request.lead_guest_email ?? null}
        leadGuestPhone={request.lead_guest_phone ?? null}
        guests={(guests ?? []) as GuestRow[]}
      />

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <h2 className="text-xl font-semibold text-slate-900">
          Reservation agreement
        </h2>
        {contract?.guest_accept_token ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                  Agreement ready
                </p>
                <p className="mt-1 text-sm text-emerald-800">
                  {formatAgreementStatus(contract.status)}
                </p>
              </div>
              <Link
                href={`/contracts/${contract.guest_accept_token}`}
                className="inline-flex rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
              >
                Review agreement
              </Link>
            </div>
          </div>
        ) : contract ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <div className="font-medium text-slate-900">
                  Reservation agreement pending
                </div>
                <div className="mt-1">
                  Your agreement will become available once a matching
                  reservation is secured.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="mt-0.5 h-5 w-5 text-slate-400" />
              <div>
                <div className="font-medium text-slate-900">
                  Reservation agreement pending
                </div>
                <div className="mt-1">
                  Your agreement will become available once a matching
                  reservation is secured.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SoftMetric({
  label,
  value,
  emphasis = "primary",
}: {
  label: string;
  value: string;
  emphasis?: "primary" | "secondary";
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-sm ${emphasis === "secondary" ? "bg-slate-50/70" : "bg-slate-50"}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 ${emphasis === "secondary" ? "text-sm font-medium text-slate-600" : "text-lg font-semibold text-slate-900"}`}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

function TimelineItem({
  title,
  body,
  icon,
  complete = false,
  active = false,
  last = false,
}: {
  title: string;
  body: string;
  icon: ReactNode;
  complete?: boolean;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="relative flex gap-4">
      <div className="relative flex flex-col items-center">
        <span
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border ${
            complete || active
              ? "border-[#5568d5]/20 bg-[#eef2ff] text-[#4457c7]"
              : "border-slate-200 bg-white text-slate-300"
          }`}
        >
          {icon}
        </span>
        {last ? null : (
          <span className="mt-2 h-full w-px bg-slate-200" aria-hidden />
        )}
      </div>
      <div className="pb-2">
        <div
          className={`font-medium ${active ? "text-slate-900" : "text-slate-700"}`}
        >
          {title}
        </div>
        <div className="mt-1 text-sm text-slate-500">{body}</div>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function formatStatus(status: string | null) {
  if (!status) return "—";
  if (status === "pending_match" || status === "pending_owner")
    return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAgreementStatus(status: string | null) {
  if (!status || status === "draft") return "Agreement ready";
  if (status === "sent") return "Agreement sent";
  if (status === "accepted") return "Agreement signed";
  return "Agreement ready";
}

function formatStayDateRange(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "Dates to be confirmed";
  return `${formatDate(checkIn)} – ${formatDate(checkOut)}`;
}

function nightsBetween(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00`);
  const end = new Date(`${checkOut}T00:00:00`);
  const diff = end.getTime() - start.getTime();
  return Number.isNaN(diff)
    ? 0
    : Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

function partyLabel(adults: number | null, youths: number | null) {
  const adultCount = adults ?? 0;
  const youthCount = youths ?? 0;
  if (!adultCount && !youthCount) return "TBD";
  const parts = [];
  if (adultCount) {
    parts.push(`${adultCount} adult${adultCount === 1 ? "" : "s"}`);
  }
  if (youthCount) {
    parts.push(`${youthCount} kid${youthCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function formatPricePerPoint(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatCurrency(value: number | null, currency?: string | null) {
  if (typeof value !== "number") return "—";
  const amount = value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatShortCurrency(value: number, currency?: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "USD").toUpperCase(),
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAddress(request: BookingRequestRow) {
  const parts = [
    request.address_line1,
    request.address_line2,
    request.city,
    request.state,
    request.postal_code,
    request.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
