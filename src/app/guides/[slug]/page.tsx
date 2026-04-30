import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@pixiedvc/design-system";
import GuideHeader from "@/components/guides/GuideHeader";
import GuideTOC from "@/components/guides/GuideTOC";
import GuideResources from "@/components/guides/GuideResources";
import RelatedGuidesList from "@/components/guides/RelatedGuidesList";
import { formatGuideDate, getGuideBySlug, getRelatedGuides } from "@/lib/guides";
import { getAllResortSlugs } from "@/lib/resorts";
import GuideImagePlaceholder from "@/app/guides/components/GuideImagePlaceholder";

const BAY_LAKE_TOWER_SLUG = "bay-lake-tower";
const HOW_RENTING_DVC_POINTS_WORKS_SLUG = "how-renting-dvc-points-works";
const BAY_LAKE_HERO_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/BayLake_dusk_shot";
const BAY_LAKE_LOCATION_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/magicKingdonproximity.png";
const BAY_LAKE_TRANSIT_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/transitdiagram.png";
const BAY_LAKE_DINING_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/ContemporaryDining.png";
const BAY_LAKE_WALKWAY_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/walkway.png";
const BAY_LAKE_ROOMVIEW_IMAGE =
  "https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Guides/Bay%20Lake/roomview.png";

const BAY_LAKE_INSIDER_GUIDE = {
  intro: [
    "Why Bay Lake Tower Is One of the Most Strategic Resorts at Walt Disney World",
    "There are deluxe resorts at Walt Disney World that are beautiful.",
    "There are resorts that are immersive.",
    "There are resorts that feel like a retreat.",
    "Bay Lake Tower is different.",
    "Bay Lake Tower is strategic.",
    "If your trip revolves around Magic Kingdom, there is no other Disney Vacation Club resort that eliminates more friction from your stay.",
    "You can leave your villa and be at the Magic Kingdom entrance in roughly 5 to 10 minutes on foot. No buses. No security bottlenecks at the Transportation and Ticket Center. No late-night monorail lines.",
    "That single advantage changes the rhythm of your entire trip.",
  ],
  sections: [
    {
      title: "Location: The True Competitive Advantage",
      body: [
        "Bay Lake Tower sits directly beside Disney's Contemporary Resort, connected by a covered walkway. From there, a dedicated pedestrian path leads straight to Magic Kingdom.",
      ],
      bullets: [
        "You can arrive later for rope drop and still beat many guests to the gate.",
        "Midday breaks are effortless.",
        "After fireworks, you avoid the transportation chaos entirely.",
      ],
      closing: [
        "While other monorail resorts are excellent, Bay Lake Tower is the only one where walking is not just possible - it is often faster.",
        "For families with strollers, grandparents, or young children, this is transformative.",
      ],
    },
    {
      title: "Design and Atmosphere",
      body: [
        "Unlike heavily themed resorts such as Wilderness Lodge or Polynesian, Bay Lake Tower leans modern and understated.",
      ],
      bullets: [
        "Clean architectural lines.",
        "Floor-to-ceiling windows.",
        "Neutral interiors.",
        "Open sightlines.",
      ],
      closing: [
        "It feels more like a contemporary urban high-rise than a fantasy resort.",
        "For some guests, this minimalist aesthetic is refreshing - especially after full sensory park days.",
        "For others seeking immersive storytelling decor, it may feel less thematic.",
        "That's important to understand before booking.",
      ],
    },
    {
      title: "The Villa Advantage",
      body: [
        "Bay Lake Tower villas are designed for space and efficiency.",
        "Full kitchens in larger villas allow families to:",
      ],
      bullets: [
        "Prepare breakfast before rope drop.",
        "Store groceries and snacks.",
        "Avoid daily restaurant dependency.",
        "Accommodate multi-generational travel comfortably.",
      ],
      closing: [
        "Laundry in-room for 1-bedroom and above is another meaningful advantage over standard hotel stays.",
        "When paired with its proximity to Magic Kingdom, this becomes one of the most efficient family stays at Disney.",
      ],
    },
    {
      title: "Insider Strategies Most Guests Miss",
      numbered: [
        {
          title: "Walk After Fireworks",
          text: "After the nightly fireworks, monorail queues can stretch dramatically. The walking path back to Bay Lake Tower is typically faster and significantly calmer.",
        },
        {
          title: "Request Higher Floors for Lake Views",
          text: "Higher elevations improve sightlines for Magic Kingdom fireworks, particularly in lake-facing categories.",
        },
        {
          title: "Use Midday Breaks Aggressively",
          text: "Because returning to your villa is so easy, Bay Lake is one of the best resorts for midday resets. A 90-minute rest can dramatically improve evening stamina.",
        },
        {
          title: "Rope Drop Without Rush",
          text: "Guests staying farther away often leave 60-90 minutes before park opening. At Bay Lake Tower, you can leave much later and still arrive comfortably.",
        },
      ],
    },
    {
      title: "Who Bay Lake Tower Is Perfect For",
      bullets: [
        "Families prioritizing Magic Kingdom",
        "Multi-generational groups",
        "Guests traveling with strollers",
        "First-time Disney visitors seeking simplicity",
        "Travelers who value logistics efficiency over heavy theming",
      ],
    },
    {
      title: "When It May Not Be Ideal",
      bullets: [
        "Guests wanting immersive resort storytelling design",
        "Visitors planning most park time at EPCOT or Hollywood Studios",
        "Travelers seeking a secluded or retreat-like atmosphere",
      ],
      closing: ["Bay Lake Tower is about strategic convenience, not escapism."],
    },
    {
      title: "The Real Value Proposition",
      body: [
        "The true luxury of Bay Lake Tower is not decor.",
        "It is control.",
        "Control over your schedule.",
        "Control over your time.",
        "Control over transportation friction.",
        "Over a four- or five-night stay, eliminating small logistical stressors compounds into a significantly more relaxed vacation.",
        "And when that experience is paired with the space of a Disney Vacation Club villa - especially when rented at favorable rates compared to Disney rack pricing - the value proposition becomes even stronger.",
      ],
    },
    {
      title: "Final Perspective",
      body: [
        "If Magic Kingdom is central to your itinerary, Bay Lake Tower is arguably the most efficient DVC location in all of Walt Disney World.",
        "It is modern.",
        "It is practical.",
        "It is exceptionally well positioned.",
        "For guests who want convenience wrapped in upscale comfort - and the ability to walk back from fireworks instead of waiting in line - Bay Lake Tower is one of the smartest choices on property.",
      ],
    },
  ],
};

const BAY_LAKE_DINING_GUIDE = {
  intro: [
    "Dining at Bay Lake Tower and the Contemporary",
    "Staying at Bay Lake Tower means you're fully integrated into the dining ecosystem of Disney's Contemporary Resort - one of the strongest culinary clusters on property.",
    "This eliminates transportation planning for evening meals.",
  ],
  sections: [
    {
      title: "Signature Dining",
      venue: "California Grill",
      body: [
        "Located atop the Contemporary, California Grill is consistently ranked among the best dining experiences at Walt Disney World.",
        "Seasonal menus, sushi selections, and panoramic views of Magic Kingdom fireworks make it ideal for:",
      ],
      bullets: ["Anniversary dinners", "Adult evenings", "Celebration meals"],
      closing: [
        "Guests dining here during fireworks receive access to the private viewing deck - and may return later that night with their receipt for viewing access.",
        "Few resort locations make this experience so effortless.",
      ],
    },
    {
      title: "Refined Casual",
      venue: "Steakhouse 71",
      body: [
        "A polished yet relaxed table-service restaurant offering breakfast, lunch, and dinner.",
        "Excellent for:",
      ],
      bullets: [
        "Non-park-day brunch",
        "A calm dinner without park crowds",
        "Guests wanting quality without formality",
      ],
    },
    {
      title: "Quick Service Convenience",
      venue: "Contempo Cafe",
      body: [
        "Efficient counter service located in the Grand Canyon Concourse.",
        "Perfect for:",
      ],
      bullets: ["Early rope drop mornings", "Grab-and-go breakfasts", "Casual lunch between park breaks"],
      closing: ["Mobile ordering here is particularly useful."],
    },
    {
      title: "Lounge Atmosphere",
      venue: "Outer Rim",
      body: [
        "A relaxed cocktail space with views of Bay Lake.",
        "An ideal place to unwind after returning from Magic Kingdom on foot.",
      ],
    },
  ],
};

async function isKnownResortSlug(slug: string) {
  const resortSlugs = await getAllResortSlugs();
  return resortSlugs.includes(slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === BAY_LAKE_TOWER_SLUG) {
    return {
      title: "Bay Lake Tower Insider Guide | PixieDVC Guides",
      description:
        "Insider perspective on Bay Lake Tower: positioning, who it suits best, and practical dining strategy for a smoother Disney stay.",
      alternates: {
        canonical: `/guides/${slug}`,
      },
    };
  }

  const guide = await getGuideBySlug(slug);
  if (!guide) {
    const isResortSlug = await isKnownResortSlug(slug);
    if (!isResortSlug) return {};

    return {
      title: "Resort Guide Coming Soon | PixieDVC Guides",
      description: "We're building an insider guide for this resort. Check back soon.",
      alternates: {
        canonical: `/guides/${slug}`,
      },
    };
  }

  const { title, excerpt, heroImage, metaTitle, metaDescription, ogImageUrl } = guide.guide;
  return {
    title: metaTitle ?? `${title} | PixieDVC Guides`,
    description: metaDescription ?? excerpt,
    alternates: {
      canonical: `/guides/${slug}`,
    },
    openGraph: {
      title: metaTitle ?? `${title} | PixieDVC Guides`,
      description: metaDescription ?? excerpt,
      images: (ogImageUrl ?? heroImage) ? [{ url: ogImageUrl ?? heroImage! }] : undefined,
    },
  };
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug === BAY_LAKE_TOWER_SLUG) {
    const [insiderLead, ...insiderIntro] = BAY_LAKE_INSIDER_GUIDE.intro;
    const [diningLead, ...diningIntro] = BAY_LAKE_DINING_GUIDE.intro;
    const locationSection = BAY_LAKE_INSIDER_GUIDE.sections[0];
    const designSection = BAY_LAKE_INSIDER_GUIDE.sections[1];
    const villaSection = BAY_LAKE_INSIDER_GUIDE.sections[2];
    const insiderTipsSection = BAY_LAKE_INSIDER_GUIDE.sections[3];
    const whoForSection = BAY_LAKE_INSIDER_GUIDE.sections[4];
    const notIdealSection = BAY_LAKE_INSIDER_GUIDE.sections[5];
    const valueSection = BAY_LAKE_INSIDER_GUIDE.sections[6];
    const finalSection = BAY_LAKE_INSIDER_GUIDE.sections[7];

    return (
      <main className="bg-[#F7F5F2] py-20">
        <section className="mx-auto max-w-6xl px-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">RESORT GUIDE</p>
          <h1 className="mt-3 max-w-5xl font-display text-6xl font-bold leading-[0.98] tracking-tight text-[#0F2148] md:text-8xl">
            Bay Lake Tower Insider Guide
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-medium leading-relaxed text-[#0F2148]/80 md:text-base">
            The complete insider perspective on Bay Lake Tower, with practical strategy for location, villa value, and
            dining flow.
          </p>
          <div className="mt-8">
            <GuideImagePlaceholder
              aspect="16/9"
              label="Hero image"
              note="Replace with Bay Lake Tower exterior dusk shot"
              caption="Bay Lake Tower, Contemporary Resort area"
              src={BAY_LAKE_HERO_IMAGE}
              alt="Bay Lake Tower exterior at dusk"
              priority
            />
          </div>
        </section>

        <section className="sticky top-[72px] z-10 mt-8 border-y border-[#0F2148]/10 bg-[#F7F5F2]/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <nav className="flex flex-wrap gap-4 text-sm font-medium text-[#0F2148]/70">
              <a href="#overview" className="hover:text-[#0F2148]">Overview</a>
              <a href="#location" className="hover:text-[#0F2148]">Location</a>
              <a href="#insider-tips" className="hover:text-[#0F2148]">Insider Tips</a>
              <a href="#dining" className="hover:text-[#0F2148]">Dining</a>
              <a href="#who-its-for" className="hover:text-[#0F2148]">Who It&apos;s For</a>
              <a href="#final-take" className="hover:text-[#0F2148]">Final Take</a>
            </nav>
          </div>
        </section>

        <section id="overview" className="mx-auto mt-14 max-w-6xl px-6">
          <div className="max-w-4xl space-y-5 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
              Insider Guide
            </h2>
            {insiderLead ? (
              <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-[#0F2148] md:text-3xl">
                {insiderLead}
              </h3>
            ) : null}
            {insiderIntro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section id="location" className="mt-16 bg-white/70 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                  {locationSection.title}
                </h2>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
                  {locationSection.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {locationSection.bullets?.length ? (
                    <ul className="space-y-2 pl-5">
                      {locationSection.bullets.map((bullet) => (
                        <li key={bullet} className="list-disc">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {locationSection.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </div>
              <div className="lg:col-span-5">
              <GuideImagePlaceholder
                aspect="4/3"
                label="Location advantage image"
                note="Replace with Bay Lake Tower walkway / Magic Kingdom proximity visual"
                src={BAY_LAKE_LOCATION_IMAGE}
                alt="Bay Lake Tower proximity to Magic Kingdom"
              />
                <div className="mt-4">
              <GuideImagePlaceholder
                aspect="3/2"
                label="Transit diagram"
                note="Replace with a simple neutral path graphic (no branded map)"
                src={BAY_LAKE_TRANSIT_IMAGE}
                alt="Bay Lake Tower transit diagram"
              />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-6">
          <div className="max-w-4xl space-y-10 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
            <article className="space-y-4">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                {designSection.title}
              </h2>
              {designSection.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {designSection.bullets?.length ? (
                <ul className="space-y-2 pl-5">
                  {designSection.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {designSection.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>

            <article className="space-y-4">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                {villaSection.title}
              </h2>
              {villaSection.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {villaSection.bullets?.length ? (
                <ul className="space-y-2 pl-5">
                  {villaSection.bullets.map((bullet) => (
                    <li key={bullet} className="list-disc">
                      {bullet}
                    </li>
                  ))}
                </ul>
              ) : null}
              {villaSection.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          </div>
        </section>

        <section id="insider-tips" className="mt-16 bg-white/70 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
              {insiderTipsSection.title}
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <GuideImagePlaceholder
                aspect="3/2"
                label="Insider tips image"
                note="Replace with evening walkway / fireworks exit path"
                src={BAY_LAKE_WALKWAY_IMAGE}
                alt="Bay Lake Tower walkway"
              />
              <GuideImagePlaceholder
                aspect="3/2"
                label="Insider tips image"
                note="Replace with room view / lake-facing perspective"
                src={BAY_LAKE_ROOMVIEW_IMAGE}
                alt="Bay Lake Tower room view"
              />
            </div>
            {insiderTipsSection.numbered?.length ? (
              <ol className="mt-8 space-y-5 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
                {insiderTipsSection.numbered.map((item, index) => (
                  <li key={item.title}>
                    <p className="font-semibold text-[#0F2148]">
                      {index + 1}. {item.title}
                    </p>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>

        <section id="dining" className="mx-auto mt-16 max-w-6xl px-6">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">Dining Guide</h2>
              <div className="mt-5 space-y-4 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
                {diningLead ? (
                  <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-[#0F2148] md:text-3xl">
                    {diningLead}
                  </h3>
                ) : null}
                {diningIntro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {BAY_LAKE_DINING_GUIDE.sections.map((section) => (
                  <article key={section.title} className="space-y-3 pt-4">
                    <h3 className="font-display text-2xl font-semibold tracking-tight text-[#0F2148] md:text-3xl">
                      {section.title}
                    </h3>
                    <p className="text-xl font-semibold text-[#0F2148]">{section.venue}</p>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets?.length ? (
                      <ul className="space-y-2 pl-5">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="list-disc">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {section.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </article>
                ))}
              </div>
            </div>
            <div className="lg:col-span-5">
              <GuideImagePlaceholder
                aspect="4/3"
                label="Dining image"
                note="Replace with Contemporary dining / table setting photo"
                src={BAY_LAKE_DINING_IMAGE}
                alt="Contemporary Resort dining"
              />
            </div>
          </div>
        </section>

        <section id="who-its-for" className="mt-16 bg-white/70 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-4xl space-y-8 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
              <article className="space-y-4">
                <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                  {whoForSection.title}
                </h2>
                {whoForSection.bullets?.length ? (
                  <ul className="space-y-2 pl-5">
                    {whoForSection.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>

              <article className="space-y-4">
                <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                  {notIdealSection.title}
                </h2>
                {notIdealSection.bullets?.length ? (
                  <ul className="space-y-2 pl-5">
                    {notIdealSection.bullets.map((bullet) => (
                      <li key={bullet} className="list-disc">
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {notIdealSection.closing?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </article>
            </div>
          </div>
        </section>

        <section id="final-take" className="mx-auto mt-16 max-w-6xl px-6">
          <div className="max-w-4xl space-y-8 text-base leading-relaxed text-[#0F2148]/85 md:text-lg">
            <article className="space-y-4">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                {valueSection.title}
              </h2>
              {valueSection.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
            <article className="space-y-4">
              <h2 className="font-display text-3xl font-bold tracking-tight text-[#0F2148] md:text-4xl">
                {finalSection.title}
              </h2>
              {finalSection.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </article>
          </div>

          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              href="/resorts/bay-lake-tower"
              className="inline-flex items-center rounded-full border border-[#0F2148]/20 bg-[#0F2148] px-5 py-2 text-sm font-semibold !text-white transition hover:bg-[#1A2F66]"
            >
              Back to Resort Page
            </Link>
            <Link
              href="/calculator"
              className="inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2 text-sm font-semibold !text-white transition hover:bg-[#1A2F66]"
            >
              Use the Calculator
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const guide = await getGuideBySlug(slug);
  if (!guide) {
    const isResortSlug = await isKnownResortSlug(slug);
    if (!isResortSlug) {
      notFound();
    }

    return (
      <main className="bg-[#F7F5F2] py-20">
        <section className="mx-auto max-w-3xl px-6">
          <div className="rounded-3xl border border-[#0F2148]/10 bg-white p-10 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[#0F2148]/60">Resort Guide</p>
            <h1 className="mt-3 font-serif text-4xl text-[#0F2148]">Resort Guide Coming Soon</h1>
            <p className="mt-4 text-base leading-relaxed text-[#0F2148]/75">
              We&apos;re building an insider guide for this resort. Check back soon.
            </p>
            <div className="mt-8">
              <Link
                href={`/resorts/${slug}`}
                className="inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1A2F66]"
              >
                Back to Resort Page
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const related = await getRelatedGuides(slug, 6);
  const { title, excerpt, category, publishedAt } = guide.guide;
  const updatedLabel = `Updated ${formatGuideDate(publishedAt)}`;
  const isOwnerGuide = (category ?? "").toLowerCase().includes("owner");
  const resources = isOwnerGuide
    ? [
        {
          title: "Sample Guest Invoice",
          description: "Example invoice template for owner-to-guest rentals.",
          href: "/info/owners/sample-guest-invoice",
          actionLabel: "Open",
        },
        {
          title: "Sample Intermediary Agreement",
          description: "Review the standard intermediary agreement format.",
          href: "/info/owners/sample-intermediary-agreement",
          actionLabel: "Open",
        },
      ]
    : [];

  if (slug === HOW_RENTING_DVC_POINTS_WORKS_SLUG) {
    const requestSteps = [
      {
        title: "Tell us your trip",
        body: "Share your dates, resort preferences, room type, and flexibility.",
      },
      {
        title: "We match you with a verified owner",
        body: "Our concierge team works your request with owners whose points fit your stay.",
      },
      {
        title: "Review before committing",
        body: "You review the details, agreement, and next steps before any payment is required.",
      },
      {
        title: "Secure and link your reservation",
        body: "Once confirmed, your stay is booked and you receive details to link and plan in Disney tools.",
      },
    ];
    const readyStaySteps = [
      {
        title: "Browse confirmed stays",
        body: "View reservations already secured by verified owners.",
      },
      {
        title: "Pick a stay that fits",
        body: "Choose the dates, resort, and room type that work for your trip.",
      },
      {
        title: "Secure it before it's gone",
        body: "Move quickly on fixed-date inventory when the right stay appears.",
      },
    ];

    return (
      <main className="bg-[#f5f1ea] text-[#0F2148]">
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top,rgba(93,120,255,0.22),transparent_34%),linear-gradient(180deg,#0c1631_0%,#152753_54%,#0e1d42_100%)]">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="max-w-4xl">
              <p className="inline-flex items-center rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur-sm">
                PixieDVC Booking Guide
              </p>
              <h1 className="mt-6 max-w-4xl font-display text-4xl leading-[0.96] text-white sm:text-5xl lg:text-7xl">
                How PixieDVC Booking Works
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/78 sm:text-lg">
                Save on Disney Deluxe villas through verified DVC owners, with two simple ways to book: request a
                custom stay or choose a confirmed Ready Stay.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/plan"
                  className="inline-flex items-center rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#1f3567,#5b78ff)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(18,35,74,0.42)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_18px_36px_rgba(18,35,74,0.5)]"
                >
                  Find Your Stay
                </Link>
                <p className="text-sm text-white/62">{updatedLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
          <div className="space-y-6">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0F2148]/55">Two Ways to Book</p>
              <h2 className="font-display text-3xl text-[#0F2148] sm:text-4xl">Choose the booking path that fits your trip</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-[30px] border border-[#0F2148]/8 bg-white p-8 shadow-[0_20px_50px_rgba(15,33,72,0.08)]">
                <p className="text-xs uppercase tracking-[0.22em] text-[#5b78ff]">Custom Match</p>
                <h3 className="mt-3 font-display text-3xl text-[#0F2148]">Request Your Stay</h3>
                <p className="mt-3 text-base font-medium text-[#0F2148]/72">
                  Best for specific dates, resorts, or room types.
                </p>
                <p className="mt-4 text-sm leading-7 text-[#0F2148]/76">
                  Tell us your travel dates, resort preferences, and room type. PixieDVC matches you with verified DVC owners.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#0F2148]/78">
                  <li>Specific travel dates</li>
                  <li>Preferred resorts</li>
                  <li>Planning ahead</li>
                  <li>Concierge guidance</li>
                </ul>
                <div className="mt-8">
                  <Link
                    href="/plan"
                    className="inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A2F66]"
                  >
                    Check Availability
                  </Link>
                </div>
              </Card>

              <Card className="rounded-[30px] border border-[#0F2148]/8 bg-[linear-gradient(180deg,#fffaf1_0%,#f6efe2_100%)] p-8 shadow-[0_20px_50px_rgba(15,33,72,0.08)]">
                <p className="text-xs uppercase tracking-[0.22em] text-[#b67b1e]">Instant Opportunity</p>
                <h3 className="mt-3 font-display text-3xl text-[#0F2148]">Browse Ready Stays</h3>
                <p className="mt-3 text-base font-medium text-[#0F2148]/72">
                  Best for faster booking and last-minute value.
                </p>
                <p className="mt-4 text-sm leading-7 text-[#0F2148]/76">
                  Choose from confirmed reservations already secured by verified owners.
                </p>
                <ul className="mt-6 space-y-3 text-sm text-[#0F2148]/78">
                  <li>Flexible travel</li>
                  <li>Last-minute trips</li>
                  <li>Fixed dates</li>
                  <li>Deal opportunities</li>
                </ul>
                <div className="mt-8">
                  <Link
                    href="/ready-stays"
                    className="inline-flex items-center rounded-full border border-[#0F2148]/14 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/28 hover:bg-white/80"
                  >
                    View Ready Stays
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div className="space-y-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#0F2148]/55">Renting DVC Points, Simplified</p>
                <h2 className="font-display text-3xl leading-tight text-[#0F2148] sm:text-4xl">
                  The same Disney villas, booked a different way.
                </h2>
              </div>
              <div className="space-y-4 text-base leading-relaxed text-[#0F2148]/78">
                <p>
                  Renting DVC points gives you access to the same Disney Deluxe villas, often at a much lower price than booking direct through Disney.
                </p>
                <p>
                  Instead of booking from Disney hotel inventory, your stay is booked through a Disney Vacation Club owner with eligible points.
                </p>
                <p>
                  PixieDVC makes that process feel clear by handling verification, coordination, and the path to confirmation for you.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0F2148]/55">Request Flow</p>
              <h2 className="mt-3 font-display text-3xl text-[#0F2148] sm:text-4xl">If You Request a Stay</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {requestSteps.map((step, index) => (
                <Card
                  key={step.title}
                  className="rounded-[28px] border border-[#0F2148]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ef_100%)] p-6 shadow-[0_18px_44px_rgba(15,33,72,0.08)]"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-[#5b78ff]">Step {index + 1}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight text-[#0F2148]">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#0F2148]/75">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-[#0F2148]/55">Ready Stays Flow</p>
              <h2 className="mt-3 font-display text-3xl text-[#0F2148] sm:text-4xl">If You Choose a Ready Stay</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {readyStaySteps.map((step, index) => (
                <Card
                  key={step.title}
                  className="rounded-[28px] border border-[#0F2148]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ef_100%)] p-6 shadow-[0_18px_44px_rgba(15,33,72,0.08)]"
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-[#b67b1e]">Step {index + 1}</p>
                  <h3 className="mt-3 font-display text-2xl leading-tight text-[#0F2148]">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#0F2148]/75">{step.body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#11224b] py-16 text-white md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/58">Trust</p>
                <h2 className="font-display text-3xl text-white sm:text-4xl">Why This Is Safe</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  "Verified DVC owners only",
                  "Booked through Disney's official system",
                  "Clear agreement before payment",
                  "Concierge support from start to finish",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-white/10 bg-white/8 px-5 py-5 text-sm font-medium text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <span className="inline-flex items-start gap-3">
                      <span aria-hidden="true">✔</span>
                      <span>{item}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#0F2148]/55">PixieDVC Value</p>
                <h2 className="font-display text-3xl text-[#0F2148] sm:text-4xl">
                  Concierge-led, Not Marketplace Chaos
                </h2>
              </div>
              <div className="space-y-4 text-base leading-relaxed text-[#0F2148]/78">
                <p>
                  Direct owner rentals often require you to evaluate strangers, manage coordination, and handle the booking process yourself.
                </p>
                <p>
                  PixieDVC handles owner verification, communication, coordination, and the process from request through confirmation, so the path feels safer and simpler.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[linear-gradient(180deg,#152753_0%,#0c1631_100%)] py-16 text-white md:py-20">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="text-xs uppercase tracking-[0.24em] text-white/58">Next Step</p>
            <h2 className="mt-3 font-display text-3xl text-white sm:text-5xl">Ready to find your stay?</h2>
            <p className="mt-4 text-base leading-relaxed text-white/72">
              Choose the booking path that fits your trip and move forward with clarity.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/plan"
                className="inline-flex items-center rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#1f3567,#5b78ff)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_32px_rgba(18,35,74,0.42)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_18px_36px_rgba(18,35,74,0.5)]"
              >
                Find Your Stay
              </Link>
              <Link
                href="/ready-stays"
                className="inline-flex items-center rounded-full border border-white/18 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/12"
              >
                Browse Ready Stays
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="bg-[#F7F5F2] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <GuideHeader title={title} subtitle={excerpt} category={category} updatedLabel={updatedLabel} />

        <div className="mt-12 grid gap-10 lg:grid-cols-12">
          <main className="space-y-8 lg:col-span-8">
            <Card className="rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Owner Essentials</p>
              <h2 className="mt-3 font-display text-2xl text-ink">
                Step-by-step support from listing to payout
              </h2>
              <p className="mt-3 text-sm text-muted">{excerpt}</p>
            </Card>

            <GuideTOC items={guide.toc} />

            <article className="space-y-8">{guide.content}</article>
          </main>

          <aside className="space-y-6 lg:col-span-4">
            <GuideResources items={resources} />
            <RelatedGuidesList guides={related} />
          </aside>
        </div>
      </div>
    </div>
  );
}
