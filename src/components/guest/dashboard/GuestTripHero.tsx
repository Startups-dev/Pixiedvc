import Image from "next/image";
import Link from "next/link";

import GuestCountdown from "@/components/guest/dashboard/GuestCountdown";
import GuestTripStatus from "@/components/guest/dashboard/GuestTripStatus";
import type { GuestTripHeroViewModel } from "@/lib/guest/hero-view-model";

export default function GuestTripHero({ trip }: { trip: GuestTripHeroViewModel }) {
  const details = [
    trip.nights ? `${trip.nights} ${trip.nights === 1 ? "night" : "nights"}` : null,
    trip.roomType,
    trip.partySummary,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="guest-trip-title"
      className="relative overflow-hidden border-b border-[#10224A]/10 bg-[#F8F5EC]"
    >
      <div className="mx-auto grid max-w-[1500px] lg:min-h-[650px] lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-14 lg:px-14 lg:py-16 xl:px-20">
          <div className="max-w-[650px]">
            <p className="text-base leading-7 text-[#10224A]/62">
              {trip.guestName ? `Welcome back, ${trip.guestName}.` : "Your vacation is getting closer."}
            </p>
            <div className="mt-8">
              <GuestTripStatus label={trip.statusLabel} />
            </div>
            <p className="mt-5 text-sm text-[#10224A]/50">
              Your upcoming stay
            </p>
            <h1
              id="guest-trip-title"
              className="mt-3 max-w-[10ch] text-5xl font-semibold leading-[0.96] tracking-normal text-[#10224A] sm:text-6xl lg:text-7xl"
            >
              {trip.resortName}
            </h1>
            {trip.dateRangeLabel ? (
              <p className="mt-8 text-xl font-medium leading-relaxed text-[#10224A]/78 sm:text-2xl">
                {trip.dateRangeLabel}
              </p>
            ) : null}
            {details.length ? (
              <p className="mt-3 max-w-xl text-base leading-8 text-[#10224A]/62 sm:text-lg">
                {details.join(" · ")}
              </p>
            ) : null}
          </div>

          <div className="mt-12 flex flex-col gap-7 border-t border-[#10224A]/12 pt-7 sm:flex-row sm:items-end sm:justify-between">
            <GuestCountdown countdown={trip.countdown} />
            {trip.primaryAction ? (
              <Link
                href={trip.primaryAction.href}
                className="inline-flex min-h-11 w-fit items-center border-b border-[#C49A3A] pb-1 text-sm font-semibold text-[#10224A] transition hover:border-[#10224A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C49A3A]"
              >
                {trip.primaryAction.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative min-h-[340px] sm:min-h-[430px] lg:min-h-0">
          {trip.resortImageUrl ? (
            <Image
              src={trip.resortImageUrl}
              alt={trip.resortImageAlt}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-center motion-safe:animate-[guest-image-settle_900ms_ease-out_both]"
            />
          ) : (
            <div className="absolute inset-0 bg-[#10224A]" aria-hidden="true" />
          )}
          <div
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,245,236,0.74)_0%,rgba(248,245,236,0.18)_26%,rgba(248,245,236,0)_54%)] max-lg:bg-[linear-gradient(180deg,rgba(248,245,236,0)_58%,rgba(248,245,236,0.82)_100%)]"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
