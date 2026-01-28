import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase-server";

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
          <Detail label="Guest total (cents)" value={request.guest_total_cents ? `${request.guest_total_cents}` : "—"} />
          <Detail label="Guest rate/pt (cents)" value={request.guest_rate_per_point_cents ? `${request.guest_rate_per_point_cents}` : "—"} />
          <Detail label="Deposit due" value={formatCurrency(request.deposit_due, request.deposit_currency)} />
          <Detail label="Deposit paid" value={formatCurrency(request.deposit_paid, request.deposit_currency)} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Guest info</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Detail label="Name" value={request.lead_guest_name ?? "—"} />
          <Detail label="Email" value={request.lead_guest_email ?? "—"} />
          <Detail label="Phone" value={request.lead_guest_phone ?? "—"} />
          <Detail label="Accessibility needs" value={request.requires_accessibility ? "Yes" : "No"} />
          <Detail label="Address" value={formatAddress(request)} />
          <Detail label="Notes" value={request.comments ?? "—"} />
        </div>
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
