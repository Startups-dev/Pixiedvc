// src/app/services/grocery/page.tsx
import Link from "next/link";
import { ServiceFeatureCard } from "@/components/ui/ServiceFeatureCard";

const HERO_IMAGE =
  "/images/services/grocery-hero.jpg"; // optional local asset if you have it (safe if missing)
const FALLBACK_BG =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80"; // safe generic fallback

export const metadata = {
  title: "Grocery Delivery | PixieDVC",
  description:
    "Arrive to a stocked villa—organized, stress-free grocery delivery for your Disney-area stay.",
};

export default function GroceryServicePage() {
  const bgImageUrl = HERO_IMAGE || FALLBACK_BG;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-[#0B1B3A]/10 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-7 sm:p-10">
            <div className="text-xs uppercase tracking-[0.28em] text-[#0B1B3A]/55">
              Service
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[#0B1B3A] sm:text-4xl">
              Grocery delivery to your villa
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#0B1B3A]/70">
              Walk in and relax. We coordinate a clean, organized grocery delivery so your
              essentials are ready when you arrive—water, breakfast, snacks, and more.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/guest"
                className="inline-flex items-center rounded-full bg-[#071a33] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0b2450]"
              >
                Request grocery delivery
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-5 py-2 text-sm font-semibold text-[#0B1B3A]/85 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
              >
                View all services
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { k: "Simple", v: "Tell us your list" },
                { k: "Reliable", v: "We coordinate delivery" },
                { k: "Organized", v: "Clean, neat handoff" },
              ].map((it) => (
                <div
                  key={it.k}
                  className="rounded-2xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4"
                >
                  <div className="text-[0.65rem] uppercase tracking-[0.22em] text-[#0B1B3A]/55">
                    {it.k}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#0B1B3A]/85">
                    {it.v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* image */}
          <div className="relative min-h-[260px] bg-[#071a33] lg:min-h-full">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url('${bgImageUrl}')` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(7,26,51,0.92) 0%, rgba(7,26,51,0.62) 40%, rgba(7,26,51,0.20) 72%, rgba(7,26,51,0.00) 100%)",
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(140% 120% at 0% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.00) 65%)",
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {[
          {
            step: "Step 1",
            title: "Submit your request",
            body:
              "Tell us your dates, resort, and grocery list (or pick from common essentials).",
          },
          {
            step: "Step 2",
            title: "We coordinate delivery",
            body:
              "We confirm timing, substitutions, and delivery details—then keep you updated.",
          },
          {
            step: "Step 3",
            title: "Arrive to a stocked villa",
            body:
              "Your essentials are ready—organized and easy to put away so you can start your trip.",
          },
        ].map((c) => (
          <div
            key={c.title}
            className="rounded-3xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm"
          >
            <div className="text-[0.65rem] uppercase tracking-[0.22em] text-[#0B1B3A]/55">
              {c.step}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-[#0B1B3A]/90">
              {c.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#0B1B3A]/70">
              {c.body}
            </p>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#0B1B3A]/85">
              What you get
            </h2>
            <p className="mt-1 text-xs text-[#0B1B3A]/55">
              Concierge-level convenience
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceFeatureCard
            title="Essentials bundle"
            description="Water, breakfast basics, snacks—fast and easy to start."
            href="/guest"
            ctaLabel="Request"
            badge="Popular"
            bgImageUrl={bgImageUrl}
          />
          <ServiceFeatureCard
            title="Custom list"
            description="You choose items and brands—substitutions handled with care."
            href="/guest"
            ctaLabel="Request"
            badge="Flexible"
            bgImageUrl={bgImageUrl}
          />
          <ServiceFeatureCard
            title="Delivery timing"
            description="We coordinate arrival windows and handoff details."
            href="/guest"
            ctaLabel="Request"
            badge="Coordinated"
            bgImageUrl={bgImageUrl}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 overflow-hidden rounded-3xl border border-[#0B1B3A]/10 bg-[#071a33] shadow-sm">
        <div className="relative p-8 sm:p-10">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 35%, rgba(255,255,255,0.00) 65%)",
            }}
          />
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Ready to arrive stocked?
              </h3>
              <p className="mt-1 text-sm text-white/75">
                Submit your request and we’ll take it from there.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/guest"
                className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#071a33] transition hover:bg-white/90"
              >
                Request grocery delivery
              </Link>
              <Link
                href="/my-trip"
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white/45 hover:text-white"
              >
                Go to My Trip
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

