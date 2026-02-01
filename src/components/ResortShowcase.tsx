"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const resortImages = [
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Aulani/Aul1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Boardwalk/BDW1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Copper-creek-villas-and-cabins/CCV1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Hilton-head/HH1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Kidani/AKV1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Polynesian-villas-and-bungalows/PVB1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/animal-kingdom-lodge/AKL1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/bay-lake-tower/BTC1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/beach-club-villa/BCV1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/boulder-ridge-villas/BRV1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-californian/VGC1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/grand-floridian-villas/GFV1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/old-key-west/OKW1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/saratoga-springs-resort/SSR1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/vero-beach/VBR1.png",
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/villas-at-disneyland-hotel/VDH1.png",
];

const SWAP_INTERVAL_MS = 6000;

export default function ResortShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedSources, setFailedSources] = useState<Set<string>>(new Set());
  const [cardFade, setCardFade] = useState(false);

  const cycleImages = useMemo(() => {
    const available = resortImages.filter((src) => !failedSources.has(src));
    return available.length ? available : resortImages;
  }, [failedSources]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener?.("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener?.("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || isPaused || cycleImages.length < 2) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % cycleImages.length);
    }, SWAP_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [reduceMotion, isPaused, cycleImages.length]);

  useEffect(() => {
    if (activeIndex >= cycleImages.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, cycleImages.length]);

  const imagesToRender = reduceMotion ? [cycleImages[0]] : cycleImages;

  useEffect(() => {
    if (reduceMotion) return;
    setCardFade(true);
    const timeoutId = window.setTimeout(() => setCardFade(false), 300);
    return () => window.clearTimeout(timeoutId);
  }, [activeIndex, reduceMotion]);

  return (
    <section
      className="relative isolate flex min-h-[340px] items-center overflow-hidden bg-slate-950 lg:min-h-[480px]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-40 bg-gradient-to-b from-white via-white/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-56 bg-gradient-to-b from-[#0B1B3A]/45 via-[#0B1B3A]/18 to-transparent"
      />
      <div className="absolute inset-0">
        {imagesToRender.map((src, index) => {
          const isActive = reduceMotion ? index === 0 : index === activeIndex;
          return (
            <Image
              key={src}
              src={src}
              alt="Disney Vacation Club resort"
              fill
              priority={index === 0}
              unoptimized
              sizes="100vw"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1400ms] ease-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              onError={() =>
                setFailedSources((prev) => {
                  const next = new Set(prev);
                  next.add(src);
                  return next;
                })
              }
            />
          );
        })}
        <div className="absolute inset-y-0 left-0 w-[70%] bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center px-6 py-12">
        <div
          className={`max-w-[520px] rounded-3xl bg-gradient-to-b from-black/55 to-black/45 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md ring-1 ring-white/15 transition-opacity duration-300 ease-out ${
            cardFade ? "opacity-95" : "opacity-100"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/70">
            Resort Collection
          </p>
          <h2
            className="mt-3 text-lg font-semibold leading-snug !text-[#F2D39C] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] sm:text-xl"
            style={{ color: "#F2D39C" }}
          >
            Explore iconic Disney Vacation Club resorts.
          </h2>
          <p className="mt-3 text-sm text-white/70 sm:text-base">
            See what’s possible, then check your dates.
          </p>
          <Link
            href="/resorts"
            className="mt-6 inline-flex items-center rounded-full border border-white/55 bg-white/18 px-8 py-3 text-[15px] font-semibold !text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition hover:bg-white/28 hover:border-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            Browse resorts
          </Link>
        </div>
      </div>
    </section>
  );
}
