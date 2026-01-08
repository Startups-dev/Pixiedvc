import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button, Card, SectionHeader } from "@pixiedvc/design-system";
import FaqAccordion from "@/components/FaqAccordion";
import type { FaqItem } from "@/components/faqData";

const trustHighlights = [
  {
    title: "Verified Owners",
    description: "We work with vetted DVC members who have a history of successful bookings.",
  },
  {
    title: "Transparent Pricing",
    description: "Clear estimates up front, with totals explained before you submit a request.",
  },
  {
    title: "Concierge Support",
    description: "Real humans guide your request, confirm details, and suggest smart alternates.",
  },
  {
    title: "Official Disney Reservation",
    description: "When secured, you receive a Disney confirmation number for your stay.",
  },
];

const processSteps = [
  {
    title: "Pick your dates and preferences",
    bullets: [
      "Share dates, resort priorities, room type, view, and guest count.",
      "Let us know if you are flexible with resort or dates.",
      "Use the calculator to estimate points and total cost.",
    ],
    badge: "Automation",
    badgeTone: "bg-brand/10 text-brand",
    link: { label: "Estimate with the calculator", href: "/calculator" },
  },
  {
    title: "Get an instant estimate",
    bullets: [
      "We provide a point estimate and price range based on your inputs.",
      "If demand is high, we highlight alternates with better odds.",
      "Estimates are fast so you can decide how to proceed.",
    ],
    badge: "Automation",
    badgeTone: "bg-brand/10 text-brand",
  },
  {
    title: "Submit your request + $99 deposit",
    bullets: [
      "A $99 request deposit secures your place in the queue.",
      "The deposit applies to your total once confirmed.",
      "If we cannot secure a reservation, the deposit is refunded.",
    ],
    badge: "Concierge",
    badgeTone: "bg-slate-100 text-slate-700",
  },
  {
    title: "Smart matching + concierge review",
    bullets: [
      "We match you to verified owners based on points and booking windows.",
      "A concierge double-checks details and timing.",
      "We may suggest alternates for better availability or value.",
    ],
    badge: "Automation + Concierge",
    badgeTone: "bg-brand/5 text-brand",
  },
  {
    title: "Human-assisted availability check + booking",
    bullets: [
      "Availability is confirmed through verified owner booking access.",
      "We do not scrape or automate Disney systems.",
      "Once secured, you receive a Disney confirmation number.",
    ],
    badge: "Concierge",
    badgeTone: "bg-slate-100 text-slate-700",
  },
  {
    title: "Confirmation, planning, and support",
    bullets: [
      "Link your reservation in Disney apps where available.",
      "We support allowed updates and answer questions.",
      "Review FAQs and policies for important details.",
    ],
    badge: "Concierge",
    badgeTone: "bg-slate-100 text-slate-700",
    links: [
      { label: "Read the FAQ", href: "/faq" },
      { label: "Contact concierge", href: "/contact" },
    ],
  },
];

const automations = [
  {
    title: "What we automate",
    bullets: [
      "Point estimates and price ranges.",
      "Request routing and owner matching based on fit.",
      "Queue tracking and updates as windows open.",
    ],
  },
  {
    title: "What is human-assisted",
    bullets: [
      "Availability checks through verified owner access.",
      "Reservation submission and confirmation handling.",
      "Personal guidance on alternates and timing.",
    ],
  },
];

const included = [
  "Accommodations via DVC point rental",
  "Standard Disney resort guest amenities (benefits offered by Disney to resort guests may vary)",
];

const notIncluded = [
  "Park tickets",
  "Flights or ground transportation beyond Disney options",
  "Dining plans or add-ons",
  "Travel insurance (strongly recommended)",
];

const whyDifferent = [
  {
    title: "Fast estimates, better guidance",
    description: "Get clarity on points and pricing early, with concierge advice on the best path forward.",
  },
  {
    title: "Verified owners, documented process",
    description: "We use a repeatable flow so you know what happens next at every step.",
  },
  {
    title: "Human support when it matters",
    description: "We step in when timing is critical and keep you in the loop throughout.",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "Can I check DVC availability on Disney.com?",
    answer:
      "No. DVC availability is not listed on Disney.com. We confirm inventory through verified owner access and share the best options available.",
  },
  {
    question: "How far in advance should I plan?",
    answer:
      "Owners can book their home resort up to 11 months out and other resorts at 7 months. Earlier planning gives the most flexibility.",
  },
  {
    question: "Is my reservation official?",
    answer:
      "Yes. Once booked, you receive a Disney confirmation number and can link the reservation in Disney apps where available.",
  },
  {
    question: "What if you cannot secure my request?",
    answer:
      "We review alternates with you first. If nothing can be secured, your request deposit is refunded.",
  },
  {
    question: "Can I request multiple resorts or split stays?",
    answer:
      "Yes. We can submit a primary choice plus alternates or build a split stay to improve availability.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
          <div className="absolute left-[28%] top-[-12%] h-[380px] w-[380px] rounded-full bg-brand/20 blur-3xl" />
          <div className="absolute right-[-18%] top-[32%] h-[320px] w-[320px] rounded-full bg-lavender/35 blur-3xl" />
        </div>

        <main className="relative z-10 mx-auto max-w-6xl px-6 py-20">
          <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted shadow-sm backdrop-blur">
                How It Works
              </span>
              <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl lg:text-6xl">
                How PixieDVC Works
              </h1>
              <p className="max-w-xl text-lg text-muted">
                Plan with confidence. We combine smart automation with real concierge support to match your request
                with verified DVC owners.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <ReferralLink href="/calculator">Check Pricing</ReferralLink>
                </Button>
                <Button asChild variant="ghost">
                  <ReferralLink href="/plan">Submit a Request</ReferralLink>
                </Button>
              </div>
              <p className="text-sm text-muted">
                Availability checks are human-assisted through verified owner access. We do not scrape or automate
                Disney systems.
              </p>
            </div>
            <Card surface="light" className="space-y-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">At a glance</p>
              <div className="rounded-3xl border border-ink/10 bg-white/90 p-5">
                <p className="text-sm text-muted">Sample stay estimate</p>
                <p className="mt-2 text-2xl font-display text-ink">5 nights · 214 points</p>
                <p className="mt-3 text-sm text-muted">
                  Clear pricing plus concierge guidance before you commit.
                </p>
              </div>
              <div className="grid gap-3 text-sm text-muted">
                <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/80 px-4 py-3">
                  <span>Request deposit</span>
                  <span className="font-semibold text-ink">$99</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/80 px-4 py-3">
                  <span>Support</span>
                  <span className="font-semibold text-ink">Concierge + automation</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white/80 px-4 py-3">
                  <span>Reservation type</span>
                  <span className="font-semibold text-ink">Official Disney booking</span>
                </div>
              </div>
            </Card>
          </section>

          <section className="mt-20">
            <SectionHeader
              eyebrow="Trust Highlights"
              title="The confidence builders"
              description="Premium stays anchored in verification, transparency, and real support."
            />
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {trustHighlights.map((item) => (
                <Card key={item.title} className="space-y-3">
                  <h3 className="font-display text-xl text-ink">{item.title}</h3>
                  <p className="text-sm text-muted">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <SectionHeader
              eyebrow="The Process"
              title="A clear, semi-automated flow"
              description="Automation keeps things fast. Concierge oversight keeps it accurate and personal."
            />
            <div className="mt-10 space-y-6 md:border-l md:border-slate-200 md:pl-10">
              {processSteps.map((step, index) => (
                <div key={step.title} className="relative">
                  <span className="absolute -left-[18px] top-7 hidden h-4 w-4 rounded-full border-2 border-brand bg-white md:block" />
                  <Card className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
                        {index + 1}
                      </span>
                      <h3 className="font-display text-2xl text-ink">{step.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${step.badgeTone}`}>
                        {step.badge}
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm text-muted">
                      {step.bullets.map((bullet) => (
                        <li key={bullet} className="flex items-start gap-3">
                          <span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                    {step.link ? (
                      <Link href={step.link.href} className="text-sm font-semibold text-brand hover:text-brand/80">
                        {step.link.label}
                      </Link>
                    ) : null}
                    {step.links ? (
                      <div className="flex flex-wrap gap-4">
                        {step.links.map((link) => (
                          <Link key={link.href} href={link.href} className="text-sm font-semibold text-brand hover:text-brand/80">
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </Card>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <SectionHeader
              eyebrow="Automation vs. Human Support"
              title="Fast where it should be, human where it matters"
              description="We combine the speed of smart systems with the care of a dedicated concierge team."
            />
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {automations.map((item) => (
                <Card key={item.title} className="space-y-3">
                  <h3 className="font-display text-xl text-ink">{item.title}</h3>
                  <ul className="space-y-2 text-sm text-muted">
                    {item.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-20 grid gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <SectionHeader
                eyebrow="What is included"
                title="Resort accommodations and guest benefits"
                description="PixieDVC focuses on lodging and the resort guest perks Disney offers."
              />
              <Card className="space-y-3">
                <ul className="space-y-3 text-sm text-muted">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
            <div className="space-y-6">
              <SectionHeader
                eyebrow="What is not included"
                title="Items you will arrange separately"
                description="Tickets, flights, and add-ons are handled outside the rental."
              />
              <Card className="space-y-3">
                <ul className="space-y-3 text-sm text-muted">
                  {notIncluded.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-2 w-2 rounded-full bg-slate-300" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </section>

          <section className="mt-20">
            <SectionHeader
              eyebrow="Why this is different"
              title="A more guided way to book DVC"
              description="We blend automation with concierge-level care for a smoother journey."
            />
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {whyDifferent.map((item) => (
                <Card key={item.title} className="space-y-3">
                  <h3 className="font-display text-xl text-ink">{item.title}</h3>
                  <p className="text-sm text-muted">{item.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <SectionHeader
              eyebrow="FAQ"
              title="Quick answers"
              description="Short responses to the questions we hear most."
            />
            <div className="mt-8">
              <FaqAccordion categoryId="how-it-works" items={faqItems} />
            </div>
          </section>

          <section className="mt-20">
            <Card surface="light" className="flex flex-col items-start gap-6 border border-ink/10 bg-white/90 p-10 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">Ready to plan?</p>
                <h2 className="font-display text-3xl text-ink sm:text-4xl">Ready to plan your stay?</h2>
                <p className="text-sm text-muted">
                  Start with pricing or send us your request. We will take care of the rest.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <ReferralLink href="/calculator">Check Pricing</ReferralLink>
                </Button>
                <Button asChild variant="ghost">
                  <ReferralLink href="/plan">Submit a Request</ReferralLink>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/contact">Talk to Concierge</Link>
                </Button>
              </div>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
