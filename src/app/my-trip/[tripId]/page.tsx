// src/app/my-trip/[tripId]/page.tsx
// Assumptions:
// 1) tripId maps to booking_requests.id.
// 2) resorts have { slug, calculator_code, name }.
// 3) Resort images are in Supabase Storage bucket "resorts" and follow folder + prefix naming:
//    Example: "Aulani/Aul1.png" ... "Aulani/Aul5.png".
// 4) We build public URLs via NEXT_PUBLIC_SUPABASE_URL (no SDK required).
// 5) This page is server-rendered (no React client hooks). Carousel/rotation is CSS-only.
//
// Notes:
// - “Rotating images” here is implemented as a horizontally scrollable, snap-based strip with a subtle CSS
//   auto-pan animation that pauses on hover. No JS required.
// - If you later want true timed rotation (changing the primary image), we can add a tiny client helper.

import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ConfirmationCopy } from "./TripDetailsClient";

type ResortRecord = {
  name: string | null;
  slug: string | null;
  calculator_code: string | null;
};

type BookingRequest = {
  id: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  created_at: string | null;
  adults: number | null;
  youths: number | null;
  primary_resort: ResortRecord | null;
  confirmed_resort: ResortRecord | null;
};

type MatchRow = {
  id: string;
  rental?: { dvc_confirmation_number: string | null; disney_confirmation_number: string | null } | null;
};

type RentalRow = {
  dvc_confirmation_number: string | null;
  disney_confirmation_number: string | null;
};

type EnhanceItem = {
  title: string;
  body: string;
  cta: string;
  href: string;
  bgImageUrl: string;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatParty(adults: number | null, youths: number | null) {
  if (adults === null && youths === null) return "Party details pending";
  const adultCount = adults ?? 0;
  const youthCount = youths ?? 0;
  const adultLabel = adultCount === 1 ? "adult" : "adults";
  const youthLabel = youthCount === 1 ? "child" : "children";
  return `${adultCount} ${adultLabel} • ${youthCount} ${youthLabel}`;
}

function supabasePublicUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return ""; // fails closed; UI will show fallback colors
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

const DEFAULT_IMAGE_PATH = "saratoga-springs-resort/SSR1.png";

/**
 * First images you confirmed (these are the "1" images).
 * We expand to 5 images by swapping the trailing digit 1→2..5.
 */
const RESORT_IMAGE_BASE_BY_CODE: Record<string, { folder: string; prefix: string }> = {
  // Provided list:
  AUL: { folder: "Aulani", prefix: "Aul" },
  BWV: { folder: "Boardwalk", prefix: "BDW" },
  CCV: { folder: "Copper-creek-villas-and-cabins", prefix: "CCV" },
  HHI: { folder: "Hilton-head", prefix: "HH" },
  AKV: { folder: "Kidani", prefix: "AKV" }, // Kidani uses AKV prefix in your URL (AKV1.png)
  PVB: { folder: "Polynesian-villas-and-bungalows", prefix: "PVB" },
  RIV: { folder: "Riviera", prefix: "RR" },
  AKL: { folder: "animal-kingdom-lodge", prefix: "AKL" },
  BLT: { folder: "bay-lake-tower", prefix: "BTC" },
  BCV: { folder: "beach-club-villa", prefix: "BCV" },
  BRV: { folder: "boulder-ridge-villas", prefix: "BRV" },
  VGC: { folder: "grand-californian", prefix: "VGC" },
  VGF: { folder: "grand-floridian-villas", prefix: "GFV" },
  OKW: { folder: "old-key-west", prefix: "OKW" },
  SSR: { folder: "saratoga-springs-resort", prefix: "SSR" },
  VB: { folder: "vero-beach", prefix: "VBR" },
  VDH: { folder: "villas-at-disneyland-hotel", prefix: "VDH" },
};

const RESORT_IMAGE_BASE_BY_SLUG: Record<string, { folder: string; prefix: string }> = {
  // Slugs can vary; keep this conservative, only the common ones.
  "aulani-disney-vacation-club-villas": { folder: "Aulani", prefix: "Aul" },
  "disney-s-boardwalk-villas": { folder: "Boardwalk", prefix: "BDW" },
  "copper-creek-villas-cabins": { folder: "Copper-creek-villas-and-cabins", prefix: "CCV" },
  "disney-s-copper-creek-villas-cabins": { folder: "Copper-creek-villas-and-cabins", prefix: "CCV" },
  "disney-s-hilton-head-island-resort": { folder: "Hilton-head", prefix: "HH" },
  "disney-s-animal-kingdom-villas-kidani-village": { folder: "Kidani", prefix: "AKV" },
  "disney-s-animal-kingdom-villas-jambo-house": { folder: "animal-kingdom-lodge", prefix: "AKL" },
  "disney-s-polynesian-villas-bungalows": { folder: "Polynesian-villas-and-bungalows", prefix: "PVB" },
  "disney-s-riviera-resort": { folder: "Riviera", prefix: "RR" },
  "bay-lake-tower": { folder: "bay-lake-tower", prefix: "BTC" },
  "disney-s-beach-club-villas": { folder: "beach-club-villa", prefix: "BCV" },
  "boulder-ridge-villas": { folder: "boulder-ridge-villas", prefix: "BRV" },
  "the-villas-at-disney-s-grand-californian-hotel-spa": { folder: "grand-californian", prefix: "VGC" },
  "disney-s-grand-floridian-resort-spa": { folder: "grand-floridian-villas", prefix: "GFV" },
  "disney-s-old-key-west-resort": { folder: "old-key-west", prefix: "OKW" },
  "disney-s-saratoga-springs-resort-spa": { folder: "saratoga-springs-resort", prefix: "SSR" },
  "disney-s-vero-beach-resort": { folder: "vero-beach", prefix: "VBR" },
  "the-villas-at-disneyland-hotel": { folder: "villas-at-disneyland-hotel", prefix: "VDH" },
};

function resolveResortImageBase(params: { resortCode?: string | null; resortSlug?: string | null }) {
  const code = (params.resortCode ?? "").trim().toUpperCase();
  if (code && RESORT_IMAGE_BASE_BY_CODE[code]) {
    return { matchedBy: "code" as const, ...RESORT_IMAGE_BASE_BY_CODE[code] };
  }
  const slug = (params.resortSlug ?? "").trim().toLowerCase();
  if (slug && RESORT_IMAGE_BASE_BY_SLUG[slug]) {
    return { matchedBy: "slug" as const, ...RESORT_IMAGE_BASE_BY_SLUG[slug] };
  }
  return { matchedBy: "default" as const, folder: "saratoga-springs-resort", prefix: "SSR" };
}

function getResortHeroImages(params: { resortCode?: string | null; resortSlug?: string | null }) {
  const base = resolveResortImageBase(params);

  // Produce 5 images: prefix1..prefix5.png
  const paths = Array.from({ length: 5 }, (_, idx) => {
    const n = idx + 1;
    return `${base.folder}/${base.prefix}${n}.png`;
  });

  const urls = paths.map((p) => supabasePublicUrl("resorts", p)).filter(Boolean);

  // If env is missing, or something is empty, fall back to default single image.
  if (!urls.length) {
    return {
      matchedBy: base.matchedBy,
      imagePaths: [DEFAULT_IMAGE_PATH],
      imageUrls: [supabasePublicUrl("resorts", DEFAULT_IMAGE_PATH)],
    };
  }

  return { matchedBy: base.matchedBy, imagePaths: paths, imageUrls: urls };
}

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (!s) return "Trip";
  if (s === "confirmed") return "Confirmed";
  if (s === "submitted") return "Submitted";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  if (s === "completed") return "Completed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildEnhanceItems(): EnhanceItem[] {
  return [
    {
      title: "Concierge",
      body: "Priority help for dining, tickets, and special arrangements.",
      cta: "Explore",
      href: "/services/concierge",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/concierge.png",
    },
    {
      title: "Dining",
      body: "Guides and planning support for an easier trip.",
      cta: "View guide",
      href: "/services/dining",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/dining-plan.png",
    },
    {
      title: "Grocery delivery",
      body: "Arrive to a stocked villa—simple, organized, stress-free.",
      cta: "Arrange delivery",
      href: "/services/grocery",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/grocery%20delivery.png",
    },
    {
      title: "Resort guide",
      body: "Your stay essentials, tips, and what to do next.",
      cta: "Explore guide",
      href: "/guides",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/resort-guide.png",
    },
    {
      title: "Special requests",
      body: "Celebrations, room notes, accessibility needs, and more.",
      cta: "Make a request",
      href: "/guest",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/concierge.png",
    },
    {
      title: "Tickets",
      body: "Theme park tickets and planning support.",
      cta: "Explore",
      href: "/services/tickets",
      bgImageUrl:
        "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Enhance%20your%20stay/Disney%20tickets.png",
    },
  ];
}

export default async function TripDetailsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  // Supabase server client (cookie-based auth)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In server components, Next may disallow setting cookies.
          // We keep this no-op to remain conservative.
          // If you need refresh tokens here, move auth to middleware or a route handler.
          cookiesToSet.forEach(() => {});
        },
      },
    }
  );

  const { data: bookingRequest, error } = await supabase
    .from("booking_requests")
    .select(
      `
      id,
      status,
      check_in,
      check_out,
      created_at,
      adults,
      youths,
      primary_resort:resorts!booking_requests_primary_resort_id_fkey(name, slug, calculator_code),
      confirmed_resort:resorts!booking_requests_confirmed_resort_id_fkey(name, slug, calculator_code)
    `
    )
    .eq("id", tripId)
    .maybeSingle<BookingRequest>();

  if (error) {
    // Avoid leaking details to user; surface 404-ish UX.
    notFound();
  }
  if (!bookingRequest) {
    notFound();
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("snapshot")
    .eq("booking_request_id", tripId)
    .maybeSingle<{ snapshot: Record<string, unknown> | null }>();

  const { data: matchRow } = await supabase
    .from("booking_matches")
    .select("id, rental:rentals!rentals_match_id_fkey(dvc_confirmation_number, disney_confirmation_number)")
    .eq("booking_id", tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<MatchRow>();

  const { data: matchRows } = await supabase
    .from("booking_matches")
    .select("id")
    .eq("booking_id", tripId)
    .order("created_at", { ascending: false });

  const matchIds = (matchRows ?? []).map((row) => row.id).filter(Boolean);
  let rentalConfirmation: string | null = null;
  let rentalsData: RentalRow[] | null = null;

  if (matchIds.length > 0) {
    const { data: rentals } = await supabase
      .from("rentals")
      .select("dvc_confirmation_number, disney_confirmation_number")
      .in("match_id", matchIds);

    rentalsData = rentals as RentalRow[] | null;
    rentalConfirmation =
      rentalsData?.find((row) => row.disney_confirmation_number)?.disney_confirmation_number ??
      rentalsData?.find((row) => row.dvc_confirmation_number)?.dvc_confirmation_number ??
      null;
  }

  let rentalByIdConfirmation: string | null = null;
  const snapshotRentalId =
    (contract?.snapshot as { rentalId?: string } | null)?.rentalId ?? null;
  if (snapshotRentalId) {
    const { data: rentalById } = await supabase
      .from("rentals")
      .select("disney_confirmation_number, dvc_confirmation_number")
      .eq("id", snapshotRentalId)
      .maybeSingle<RentalRow>();
    rentalByIdConfirmation =
      rentalById?.disney_confirmation_number ??
      rentalById?.dvc_confirmation_number ??
      null;
  }

  if (process.env.NODE_ENV !== "production") {
    const matchCount = matchRows?.length ?? 0;
    const rentalsCount = rentalsData?.length ?? 0;
    const snapshotConfirmation = (contract?.snapshot as { confirmationNumber?: string } | null)?.confirmationNumber;
    const hasContractSnapshot = Boolean(snapshotConfirmation);
    const hasMatchRental = Boolean(matchRow?.rental?.dvc_confirmation_number);
    const hasAnyRental = Boolean(rentalsData?.some((row) => Boolean(row.dvc_confirmation_number)));

    console.info("[my-trip] confirmation lookup", {
      tripId,
      booking_request_id: bookingRequest.id,
      booking_matches: matchCount,
      rentals: rentalsCount,
      has_contract_snapshot_confirmation: hasContractSnapshot,
      has_match_rental_confirmation: hasMatchRental,
      has_any_rental_confirmation: hasAnyRental,
    });
  }

  const snapshotConfirmation =
    (contract?.snapshot as { confirmationNumber?: string } | null)?.confirmationNumber ?? null;

  const confirmationNumber =
    snapshotConfirmation ??
    rentalByIdConfirmation ??
    matchRow?.rental?.disney_confirmation_number ??
    matchRow?.rental?.dvc_confirmation_number ??
    rentalConfirmation ??
    null;

  const resortRecord =
    bookingRequest.confirmed_resort ?? bookingRequest.primary_resort ?? null;

  const resortName = resortRecord?.name ?? "Your Resort";
  const resortSlug = resortRecord?.slug ?? null;
  const resortCode = resortRecord?.calculator_code ?? null;

  const hero = getResortHeroImages({ resortCode, resortSlug });
  const heroUrl = hero.imageUrls[0] || supabasePublicUrl("resorts", DEFAULT_IMAGE_PATH);
  const enhanceItems = buildEnhanceItems();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/my-trip"
        className="inline-flex items-center text-xs uppercase tracking-[0.26em] text-[#0B1B3A]/55 hover:text-[#0B1B3A]"
      >
        Back to my trips
      </Link>

      {/* HERO */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-[#0B1B3A]/10 bg-[#071a33] shadow-sm lg:flex">
        <div className="flex flex-col justify-between gap-6 px-6 py-8 text-white lg:w-[52%]">
          <div className="text-xs uppercase tracking-[0.32em] text-white/60">
            Disney Vacation Club • Confirmed
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight !text-white sm:text-4xl">
              {resortName}
            </h1>
            <p className="text-sm text-slate-200">
              {formatDate(bookingRequest.check_in)} → {formatDate(bookingRequest.check_out)}
            </p>
            <p className="text-sm text-slate-200">
              {formatParty(bookingRequest.adults, bookingRequest.youths)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-200">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
              <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                <path
                  d="M3.5 8.5l3 3 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Your stay is confirmed. We’ll take care of the details.
          </div>
        </div>

        <div className="relative h-[260px] w-full overflow-hidden lg:h-auto lg:flex-1">
          <style
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes tripHeroFade {
                0% { opacity: 0; }
                6% { opacity: 1; }
                20% { opacity: 1; }
                26% { opacity: 0; }
                100% { opacity: 0; }
              }
              `,
            }}
          />
          {hero.imageUrls.slice(0, 5).map((url, index) => (
            <div
              key={`${url}-${index}`}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `url('${url}')`,
                opacity: 0,
                animation: "tripHeroFade 25s infinite",
                animationDelay: `-${index * 5}s`,
              }}
              aria-hidden="true"
            />
          ))}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#071a33] via-[#071a33]/70 to-transparent" />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 text-center shadow-sm">
        <div className="text-xs uppercase tracking-[0.32em] text-[#0B1B3A]/55">
          Confirmation number
        </div>
        <div className="mt-4 flex justify-center">
          <ConfirmationCopy confirmationNumber={confirmationNumber} />
        </div>
        <p className="mt-4 text-sm text-[#0B1B3A]/70">
          Add this confirmation number to the My Disney Experience app to manage your plans.
        </p>
        <Link
          href="/guides/link-to-disney-experience"
          className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
        >
          How to link your reservation
        </Link>
      </section>

      <section className="mt-8 rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
        <div className="text-xs uppercase tracking-[0.32em] text-[#0B1B3A]/55">Cancellation &amp; Credits</div>
        <p className="mt-3 text-sm text-[#0B1B3A]/70">
          This reservation may be eligible for a Deferred Cancellation Credit.
        </p>
        <Link
          href="/policies/deferred-cancellation"
          className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70 hover:text-[#0B1B3A]"
        >
          View policy
        </Link>
      </section>

      {/* ENHANCE YOUR STAY */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#0B1B3A]/85">Enhance your stay</h2>
            <p className="mt-1 text-xs text-[#0B1B3A]/55">Concierge recommendations</p>
          </div>
          <Link
            href="/services"
            className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0B1B3A]/60 hover:text-[#0B1B3A]"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
          {enhanceItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative min-w-[260px] snap-start overflow-hidden rounded-xl border border-[#0B1B3A]/10 bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0B1B3A]/15"
              aria-label={item.title}
            >
              <div className="relative flex min-h-[320px] flex-col">
                {/* Top navy block */}
                <div className="relative overflow-hidden rounded-t-2xl bg-[#071a33]">
                  <div
                    className="pointer-events-none absolute inset-0 z-10"
                    style={{
                      background:
                        "radial-gradient(140% 120% at 0% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.00) 65%)",
                    }}
                  />
                  <div className="relative z-20 flex w-full flex-col justify-between px-5 pb-4 pt-5 text-white">
                    <div>
                      <div className="text-base font-semibold text-white">{item.title}</div>
                      <p className="mt-2 text-xs leading-relaxed text-white/75">{item.body}</p>
                    </div>
                    <span className="mt-4 inline-flex items-center rounded-full border border-white/30 px-2.5 py-1 text-[0.7rem] font-semibold text-white/90 transition group-hover:border-white/50 group-hover:text-white">
                      {item.cta}
                    </span>
                  </div>
                </div>

                {/* Image area */}
                <div className="relative h-[180px] w-full">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ backgroundImage: `url('${item.bgImageUrl}')` }}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute -top-[5px] inset-x-0 bottom-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(7,26,51,0.90) 0%, rgba(7,26,51,0.70) 35%, rgba(7,26,51,0.32) 55%, rgba(7,26,51,0.00) 70%)",
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4">
          <Link
            href="/services/catalog"
            className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#0B1B3A]/70 hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
          >
            Service catalog
          </Link>
        </div>
      </section>
    </main>
  );
}
