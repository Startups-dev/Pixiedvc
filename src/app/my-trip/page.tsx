import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { resolveResortImage } from "@/lib/resort-image";

type TripRow = {
  id: string;
  status?: string | null;
  created_at?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  primary_resort?: ResortRecord | null;
  confirmed_resort?: ResortRecord | null;
  // If relationships exist, Supabase may return these nested:
  contracts?: Array<{
    guest_accepted_at?: string | null;
    guest_paid_at?: string | null;
    status?: string | null;
  }> | null;
};

type ResortRecord = {
  name: string | null;
  slug: string | null;
  calculator_code: string | null;
};

type ContractRow = {
  booking_request_id: string;
  guest_accepted_at?: string | null;
  guest_paid_at?: string | null;
  status?: string | null;
};

const confirmedStatusSet = new Set(["confirmed", "booked", "complete", "completed", "contract_signed"]);
const nonConfirmedStatusSet = new Set([
  "cancelled",
  "canceled",
  "draft",
  "submitted",
  "pending",
  "pending_match",
  "pending_owner",
  "matched",
  "contract_sent",
  "expired",
  "declined",
]);

function isConfirmedLike(t: TripRow) {
  const s = (t.status ?? "").toLowerCase();
  const c = t.contracts?.[0];
  if (c?.guest_accepted_at || c?.guest_paid_at) return true;
  if (c?.status) {
    const cs = c.status.toLowerCase();
    if (cs === "accepted" || cs === "paid" || cs === "signed") return true;
  }
  if (confirmedStatusSet.has(s)) return true;
  if (nonConfirmedStatusSet.has(s)) return false;

  return false;
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDateRange(checkIn?: string | null, checkOut?: string | null) {
  if (!checkIn || !checkOut) return "Dates pending";
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${checkIn} → ${checkOut}`;
  }
  return `${dateFormatter.format(start)} → ${dateFormatter.format(end)}`;
}

export default async function MyTripIndexPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      `
      id,
      status,
      created_at,
      check_in,
      check_out,
      primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
      confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
    `
    )
    .eq("renter_id", user.id)
    .order("created_at", { ascending: false });

  const trips: TripRow[] = (data as TripRow[]) ?? [];
  const tripIds = trips.map((trip) => trip.id).filter(Boolean);

  if (tripIds.length > 0) {
    const { data: contractsData } = await supabase
      .from("contracts")
      .select("booking_request_id,guest_accepted_at,guest_paid_at,status")
      .in("booking_request_id", tripIds);

    const contractsByTrip = new Map<string, ContractRow[]>();
    for (const contract of (contractsData as ContractRow[]) ?? []) {
      const list = contractsByTrip.get(contract.booking_request_id) ?? [];
      list.push(contract);
      contractsByTrip.set(contract.booking_request_id, list);
    }

    for (const trip of trips) {
      trip.contracts = contractsByTrip.get(trip.id) ?? null;
    }
  }

  const confirmedTrips = trips.filter(isConfirmedLike);

  if (process.env.NODE_ENV !== "production") {
    for (const trip of trips) {
      console.info("[my-trip] confirmed-like", {
        booking_request_id: trip.id,
        confirmed_like: isConfirmedLike(trip),
      });
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">My Trip</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your confirmed stays and in-progress bookings.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border p-4 text-sm">
          <div className="font-medium">Couldn’t load trips</div>
          <div className="mt-1 text-muted-foreground">
            {error.message ?? "Unknown error"}
          </div>
        </div>
      ) : confirmedTrips.length === 0 ? (
        <div className="rounded-xl border p-6">
          <div className="text-base font-medium">No trips yet</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Once you request a rental or complete a booking, it will appear here.
          </p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border px-4 py-2 text-sm hover:bg-muted"
            >
              Browse
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {confirmedTrips.map((trip) => {
            const resortRecord = trip.confirmed_resort ?? trip.primary_resort ?? null;
            const resortName = resortRecord?.name ?? "Your Resort";
            const resortSlug = resortRecord?.slug ?? null;
            const resortCode = resortRecord?.calculator_code ?? null;
            const hero = resolveResortImage({ resortCode, resortSlug });
            const dateRange = formatDateRange(trip.check_in, trip.check_out);

            return (
              <div
                key={trip.id}
                className="relative overflow-hidden rounded-2xl border border-[#0B1B3A]/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-36 w-full bg-slate-100 bg-cover bg-center"
                  style={{ backgroundImage: `url(${hero.url})` }}
                />

                <div className="relative z-10 space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0B1B3A]">{resortName}</h2>
                      <p className="mt-1 text-sm text-[#0B1B3A]/65">{dateRange}</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-900">
                      Confirmed
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/my-trip/${trip.id}`}
                      className="inline-flex items-center rounded-full bg-[#0B1B3A] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[#0B1B3A]/90"
                    >
                      View trip
                    </Link>
                    <Link
                      href="/contact"
                      className="relative z-10 inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70 hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
                    >
                      Contact concierge
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
