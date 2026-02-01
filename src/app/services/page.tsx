import Link from "next/link";

import { ServiceFeatureCard } from "@/components/ui/ServiceFeatureCard";

const FEATURED_TILES = [
  {
    title: "Concierge",
    description: "Priority help for dining, tickets, and special arrangements.",
    ctaLabel: "Explore",
    href: "/services/concierge",
    comingSoon: true,
  },
  {
    title: "Dining",
    description: "Guides and planning support for an easier trip.",
    ctaLabel: "View guide",
    href: "/services/dining",
    comingSoon: true,
  },
  {
    title: "Grocery delivery",
    description: "Arrive to a stocked villa — simple and stress-free.",
    ctaLabel: "Arrange delivery",
    href: "/services/grocery",
  },
  {
    title: "Resort guide",
    description: "Your stay essentials, tips, and what to do next.",
    ctaLabel: "Explore guide",
    href: "/guides",
  },
  {
    title: "Special requests",
    description: "Celebrations, room notes, accessibility needs, and more.",
    ctaLabel: "Make a request",
    href: "/guest",
  },
  {
    title: "Tickets",
    description: "Theme park tickets and planning support.",
    ctaLabel: "Explore",
    href: "/services/tickets",
    comingSoon: true,
  },
];

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.26em] text-[#0B1B3A]/55">
          Services
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0B1B3A]">Services</h1>
        <p className="max-w-2xl text-sm text-[#0B1B3A]/70">
          Enhance your stay with concierge-level support.
        </p>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURED_TILES.map((tile) => (
          <ServiceFeatureCard
            key={tile.title}
            title={tile.title}
            description={tile.description}
            href={tile.href}
            ctaLabel={tile.ctaLabel}
            comingSoon={tile.comingSoon}
          />
        ))}
      </section>

      <div className="mt-8">
        <Link
          href="/services/catalog"
          className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-sm font-semibold text-[#0B1B3A]/75 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
        >
          View full service catalog
        </Link>
      </div>
    </main>
  );
}
