import { getResortSummaries } from "@/lib/resorts";
import ResortChoiceCard from "@/components/plan/ResortChoiceCard";

const RESORT_PROS: Array<{ slug: string; name: string; pros: string[] }> = [
  {
    slug: "aulani",
    name: "Aulani",
    pros: [
      "Perfect for a relaxing Hawaiian getaway",
      "Incredible pools and lazy river experience",
      "Great for families and multigenerational trips",
      "Stunning beachfront location",
      "Ideal for combining Disney magic with resort time",
    ],
  },
  {
    slug: "animal-kingdom-jambo",
    name: "Animal Kingdom Villas",
    pros: [
      "Incredible savanna views with live animals",
      "Perfect for nature lovers and photographers",
      "Unique and immersive African theming",
      "Great for families looking for something different",
      "Peaceful atmosphere away from park crowds",
    ],
  },
  {
    slug: "animal-kingdom-kidani",
    name: "Animal Kingdom Villas",
    pros: [
      "Incredible savanna views with live animals",
      "Perfect for nature lovers and photographers",
      "Unique and immersive African theming",
      "Great for families looking for something different",
      "Peaceful atmosphere away from park crowds",
    ],
  },
  {
    slug: "bay-lake-tower",
    name: "Bay Lake Tower",
    pros: [
      "Walking distance to Magic Kingdom",
      "Perfect for first-time Disney visitors",
      "Amazing fireworks views from select rooms",
      "Ideal for families who want convenience",
      "Modern style with classic Disney proximity",
    ],
  },
  {
    slug: "beach-club-villas",
    name: "Beach Club Villas",
    pros: [
      "Best pool complex on Disney property",
      "Ideal for families who love pool days",
      "Walking distance to EPCOT",
      "Relaxed beach-style atmosphere",
      "Great balance of fun and convenience",
    ],
  },
  {
    slug: "boardwalk-villas",
    name: "BoardWalk Villas",
    pros: [
      "Lively nightlife and entertainment nearby",
      "Perfect for adults and couples",
      "Walking distance to EPCOT and Hollywood Studios",
      "Classic Disney charm and theming",
      "Great dining and evening atmosphere",
    ],
  },
  {
    slug: "boulder-ridge-villas",
    name: "Boulder Ridge Villas",
    pros: [
      "Cozy lodge-style retreat",
      "Perfect for a quiet and relaxed stay",
      "Beautiful rustic theming",
      "Easy access to Magic Kingdom area",
      "Great for guests who prefer calm over crowds",
    ],
  },
  {
    slug: "copper-creek-villas",
    name: "Copper Creek Villas",
    pros: [
      "Luxurious modern lodge experience",
      "Ideal for couples and upscale stays",
      "Beautiful rooms with premium finishes",
      "Peaceful atmosphere with great dining",
      "Perfect for special occasions and celebrations",
    ],
  },
  {
    slug: "disneyland-hotel-villas",
    name: "Disneyland Hotel Villas",
    pros: [
      "Steps away from Disneyland Park",
      "Perfect for Disneyland-first trips",
      "Modern Disney design and comfort",
      "Ideal for short stays and convenience",
      "Great option for West Coast Disney fans",
    ],
  },
  {
    slug: "grand-californian-villas",
    name: "Grand Californian Villas",
    pros: [
      "Direct entrance into Disney California Adventure",
      "Luxurious and elegant atmosphere",
      "Perfect for couples and premium trips",
      "Craftsman-style architecture and theming",
      "Ultimate convenience for park access",
    ],
  },
  {
    slug: "grand-floridian-villas",
    name: "Grand Floridian Villas",
    pros: [
      "Flagship Disney luxury resort",
      "Ideal for romantic and celebratory trips",
      "Monorail access to Magic Kingdom",
      "Elegant Victorian theming",
      "Perfect for upscale Disney experiences",
    ],
  },
  {
    slug: "hilton-head-island",
    name: "Hilton Head Island",
    pros: [
      "Quiet coastal retreat away from parks",
      "Perfect for relaxation and nature lovers",
      "Great for biking and outdoor activities",
      "Ideal for non-theme-park vacations",
      "Laid-back, family-friendly atmosphere",
    ],
  },
  {
    slug: "old-key-west",
    name: "Old Key West",
    pros: [
      "Spacious villas with a relaxed vibe",
      "Great for longer stays",
      "Perfect for families needing space",
      "Casual and friendly atmosphere",
      "Excellent value for larger groups",
    ],
  },
  {
    slug: "polynesian-villas",
    name: "Polynesian Villas",
    pros: [
      "Iconic tropical Disney theming",
      "Amazing views and fireworks atmosphere",
      "Monorail access to Magic Kingdom",
      "Perfect for families and couples alike",
      "One of Disney’s most beloved resorts",
    ],
  },
  {
    slug: "riviera-resort",
    name: "Riviera Resort",
    pros: [
      "Modern European-inspired design",
      "Skyliner access to EPCOT and Hollywood Studios",
      "Ideal for couples and refined tastes",
      "Excellent dining options",
      "Calm and stylish atmosphere",
    ],
  },
  {
    slug: "saratoga-springs",
    name: "Saratoga Springs",
    pros: [
      "Great value with large resort layout",
      "Perfect for families and longer stays",
      "Close to Disney Springs",
      "Relaxed, residential feel",
      "Lots of recreation and open space",
    ],
  },
  {
    slug: "vero-beach",
    name: "Vero Beach",
    pros: [
      "Beachfront Disney resort experience",
      "Perfect for relaxing coastal vacations",
      "Great for families wanting beach + Disney",
      "Calm and uncrowded atmosphere",
      "Ideal for a slower-paced trip",
    ],
  },
];

export default async function PlanResortsPage() {
  const resorts = await getResortSummaries();
  const resortsBySlug = new Map(resorts.map((resort) => [resort.slug, resort]));

  return (
    <div className="min-h-screen bg-white text-ink">
      <main className="mx-auto max-w-6xl px-6 py-16 font-sans">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Choose your resort
          </h1>
          <p className="text-sm font-medium text-muted">
            Pick the resort that fits your style, then price it instantly.
          </p>
        </section>

        <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {RESORT_PROS.map((entry) => {
            const resort = resortsBySlug.get(entry.slug);
            const displayName = resort?.name ?? entry.name;
            const image = resort?.cardImage ?? resort?.heroImage ?? "/images/castle-hero.png";
            const isRelative = image.startsWith("/");

            return (
              <ResortChoiceCard
                key={entry.slug}
                name={displayName}
                slug={entry.slug}
                image={image}
                pros={entry.pros}
                pickHref={`/calculator?resort=${encodeURIComponent(entry.slug)}`}
                detailsHref={`/resorts/${entry.slug}?from=plan-resorts&selected=${encodeURIComponent(entry.slug)}`}
              />
            );
          })}
        </section>
      </main>
    </div>
  );
}
