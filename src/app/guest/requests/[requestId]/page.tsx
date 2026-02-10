import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";
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
  primary_resort: { name: string | null } | null;
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
  const cookieStore = await cookies();
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
      "id, renter_id, status, created_at, updated_at, check_in, check_out, primary_room, primary_view, adults, youths, total_points, max_price_per_point, est_cash, guest_total_cents, guest_rate_per_point_cents, requires_accessibility, comments, lead_guest_name, lead_guest_email, lead_guest_phone, address_line1, address_line2, city, state, postal_code, country, deposit_due, deposit_paid, deposit_currency, primary_resort:resorts!booking_requests_primary_resort_id_fkey(name)",
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
    .select("id, status, sent_at, guest_accept_token, booking_request_id, created_at")
    .eq("booking_request_id", request.id)
    .order("created_at", { ascending: false });

  const contracts = (contractsData ?? []) as ContractRow[];
  const contract = contracts[0] ?? null;

  if (process.env.NODE_ENV !== "production") {
    if (contracts.length === 0) {
      console.info("[guest-request-details] no contracts found", { requestId: request.id });
    } else {
      console.info("[guest-request-details] contracts found", {
        requestId: request.id,
        count: contracts.length,
      });
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <Link href="/guest" className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400 hover:text-slate-600">
          ← Back to requests
        </Link>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Request</p>
          <h1 className="text-3xl font-semibold text-slate-900">{request.primary_resort?.name ?? "Your request"}</h1>
          <p className="text-sm text-slate-600">Status: {formatStatus(request.status)}</p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Stay details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Detail label="Check-in" value={formatDate(request.check_in)} />
          <Detail label="Check-out" value={formatDate(request.check_out)} />
          <Detail label="Room type" value={request.primary_room ?? "TBD"} />
          <Detail label="View" value={request.primary_view ?? "TBD"} />
          <Detail label="Party size" value={partyLabel(request.adults, request.youths)} />
          <Detail label="Points requested" value={request.total_points ? `${request.total_points}` : "TBD"} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Pricing</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Detail label="Max $/pt" value={request.max_price_per_point ? `$${request.max_price_per_point.toFixed(2)}` : "—"} />
          <Detail label="Estimated cash" value={formatCurrency(request.est_cash, request.deposit_currency)} />
          <Detail label="Deposit due" value={formatCurrency(request.deposit_due, request.deposit_currency)} />
          <Detail label="Deposit paid" value={formatCurrency(request.deposit_paid, request.deposit_currency)} />
        </div>
        <p className="mt-4 text-xs text-slate-500">
          This reservation may be eligible for a Deferred Cancellation Credit.{" "}
          <Link href="/policies/deferred-cancellation" className="font-semibold text-slate-700 hover:text-slate-900">
            View policy
          </Link>
          .
        </p>
      </section>

      <GuestDetailsClient
        requestId={request.id}
        userEmail={user.email ?? null}
        leadGuestEmail={request.lead_guest_email ?? null}
        leadGuestPhone={request.lead_guest_phone ?? null}
        guests={(guests ?? []) as GuestRow[]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Agreement</h2>
        {contract?.guest_accept_token ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Agreement ready</p>
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
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            Agreement preparing. We’ll share the agreement as soon as it’s ready.
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Agreement will appear here once it’s ready.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Request timeline</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Detail label="Submitted" value={formatDate(request.created_at)} />
          <Detail label="Last updated" value={formatDate(request.updated_at)} />
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
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
  if (status === "pending_match" || status === "pending_owner") return "Pending";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatAgreementStatus(status: string | null) {
  if (!status || status === "draft") return "Agreement ready";
  if (status === "sent") return "Agreement sent";
  if (status === "accepted") return "Agreement signed";
  return "Agreement ready";
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

function formatCurrency(value: number | null, currency?: string | null) {
  if (typeof value !== "number") return "—";
  const amount = value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency ?? "USD").toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount);
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
