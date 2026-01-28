import { ServiceFeatureCard } from "@/components/ui/ServiceFeatureCard";

const SERVICE_TILE_GROUPS = [
  {
    title: "Before you arrive",
    subtitle: "Planning & confidence",
    tiles: [
      {
        title: "Magical Arrival",
        description: "Airport transfers, car seats, grocery timing, arrival notes.",
        ctaLabel: "Plan arrival",
        href: "/guest",
      },
      {
        title: "Packing & Prep",
        description: "What to bring, what to skip, and smart resort tips.",
        ctaLabel: "View checklist",
        comingSoon: true,
      },
      {
        title: "MagicBands & Setup",
        description: "Help linking tickets, MagicBands, and Disney apps.",
        ctaLabel: "Get set up",
        href: "/guides/link-to-disney-experience",
      },
    ],
  },
  {
    title: "During your stay",
    subtitle: "White-glove help",
    tiles: [
      {
        title: "Concierge",
        description: "Priority help for dining, tickets, and arrangements.",
        ctaLabel: "Explore",
        href: "/services/concierge",
      },
      {
        title: "Room Preferences",
        description: "Views, floor level, cribs, and quiet-room requests.",
        ctaLabel: "Set preferences",
        href: "/guest",
      },
      {
        title: "Mid-Stay Help",
        description: "Last-minute changes, extra groceries, quick support.",
        ctaLabel: "Get help",
        href: "/contact",
      },
    ],
  },
  {
    title: "Magic moments",
    subtitle: "Celebrations & surprises",
    tiles: [
      {
        title: "Celebrations",
        description: "Birthdays, anniversaries, surprises, room touches.",
        ctaLabel: "Plan a surprise",
        href: "/guest",
      },
      {
        title: "Special requests",
        description: "Celebrations, room notes, accessibility needs, and more.",
        ctaLabel: "Make a request",
        href: "/guest",
      },
    ],
  },
  {
    title: "Experiences & parks",
    subtitle: "Ways to elevate your days",
    tiles: [
      {
        title: "Tickets",
        description: "Theme park tickets and planning support.",
        ctaLabel: "Explore",
        href: "/services/tickets",
      },
      {
        title: "Lightning Lane Strategy",
        description: "Smart tips to maximize your park days.",
        ctaLabel: "View tips",
        comingSoon: true,
      },
      {
        title: "After-Hours & Events",
        description: "Parties, seasonal events, and special access.",
        ctaLabel: "Explore events",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Food & essentials",
    subtitle: "Meals, groceries, and dining ease",
    tiles: [
      {
        title: "Dining",
        description: "Guides and planning support for an easier trip.",
        ctaLabel: "View guide",
        href: "/services/dining",
      },
      {
        title: "Dining Alerts",
        description: "We watch for hard-to-get reservations.",
        ctaLabel: "Get alerts",
        comingSoon: true,
      },
      {
        title: "Grocery Delivery",
        description: "Arrive to a stocked villa — simple and stress-free.",
        ctaLabel: "Arrange delivery",
        href: "/services/grocery",
      },
    ],
  },
  {
    title: "Guides & resort info",
    subtitle: "Know before you go",
    tiles: [
      {
        title: "Resort Guide",
        description: "Your stay essentials, tips, and what to do next.",
        ctaLabel: "Explore guide",
        href: "/guides",
      },
      {
        title: "Resort Activities",
        description: "Pools, recreation, and on-property activities.",
        ctaLabel: "See activities",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Clarity & trust",
    subtitle: "Documents and timeline",
    tiles: [
      {
        title: "Your Trip Documents",
        description: "Contracts, confirmations, receipts, and policies.",
        ctaLabel: "View documents",
        href: "/my-trip",
      },
      {
        title: "Payment & Timeline",
        description: "What’s paid, what’s next, and key dates.",
        ctaLabel: "View timeline",
        comingSoon: true,
      },
    ],
  },
  {
    title: "Family & accessibility",
    subtitle: "Support for every traveler",
    tiles: [
      {
        title: "Kids & Family Tips",
        description: "Strollers, naps, rider switch, and family planning.",
        ctaLabel: "View family guide",
        comingSoon: true,
      },
      {
        title: "Accessibility Support",
        description: "Mobility, sensory needs, and special accommodations.",
        ctaLabel: "Learn more",
        href: "/guest",
      },
      {
        title: "Weather & What to Expect",
        description: "Seasonal tips, weather patterns, and planning advice.",
        ctaLabel: "Check forecast",
        comingSoon: true,
      },
    ],
  },
];

export default function ServiceCatalogPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.26em] text-[#0B1B3A]/55">
          Service catalog
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0B1B3A]">
          Concierge-style support, end to end
        </h1>
        <p className="max-w-2xl text-sm text-[#0B1B3A]/70">
          Browse every PixieDVC service and guide in one place. Tap any tile to
          explore or request help.
        </p>
      </header>

      <section className="mt-10 space-y-10">
        {SERVICE_TILE_GROUPS.map((group) => (
          <div key={group.title} className="space-y-4">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-[#0B1B3A]/55">
                {group.title}
              </div>
              <p className="mt-1 text-sm text-[#0B1B3A]/70">{group.subtitle}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.tiles.map((tile) => (
                <ServiceFeatureCard
                  key={tile.title}
                  title={tile.title}
                  description={tile.description}
                  href={tile.href}
                  ctaLabel={tile.ctaLabel}
                  comingSoon={tile.comingSoon}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
