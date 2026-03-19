import Link from "next/link";

import { Button } from "@pixiedvc/design-system";

const partnerCards = [
  {
    title: "Travel Advisors",
    body: "Travel advisors supporting clients planning Disney vacations",
  },
  {
    title: "Agencies",
    body: "Agencies looking to add DVC rentals to their service offerings",
  },
  {
    title: "Affiliates & Content Partners",
    body: "Affiliates and content partners serving DVC-interested audiences",
  },
];

const partnershipSteps = [
  "Matching verified guests with available DVC points",
  "Coordinating communication between guests and owners",
  "Preparing agreements and documentation",
  "Ensuring owner approval before any reservation is made",
  "Managing payment collection and payouts",
];

const outcomes = [
  "A dependable DVC rental option you can confidently recommend",
  "Reduced operational burden and administrative overhead",
  "Clear processes, documentation, and support throughout the booking lifecycle",
  "A partner aligned with transparency, compliance, and owner-first protection",
];

export default function BecomePartnerPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-6xl space-y-20 px-6 py-20">
        <section className="grid gap-10 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Become a Partner</h1>
              <p className="max-w-2xl text-base leading-relaxed text-gray-600">
                PixieDVC partners with travel advisors, agencies, and affiliates who want a reliable, owner-safe way to support
                clients interested in Disney Vacation Club rentals.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/partners/affiliate-program" className="!text-white">
                  Apply as a Partner
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/contact">Learn More</Link>
              </Button>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-[#e5e7eb] bg-gradient-to-br from-[#f5f8ff] via-white to-[#eef3ff] p-10 shadow-[0_28px_60px_rgba(15,33,72,0.08)]">
            <div className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#dbe8ff] blur-2xl" />
            <div className="absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-[#edf4ff] blur-2xl" />
            <div className="relative space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Partnership Preview</p>
              <p className="text-sm leading-relaxed text-gray-600">
                Our concierge-led model allows partners to offer DVC rental solutions without managing contracts, owner
                coordination, or payment risk. We handle the operational complexity so you can focus on your clients.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-8 py-16">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-slate-900">Who we work with</h2>
            <p className="text-base leading-relaxed text-gray-600">We collaborate with:</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {partnerCards.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-[#e5e7eb] bg-white/60 p-6 shadow-[0_16px_40px_rgba(15,33,72,0.08)]"
              >
                <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-gray-600">{item.body}</p>
              </article>
            ))}
          </div>
          <p className="text-base leading-relaxed text-gray-600">
            If your clients are exploring DVC rentals and expect a professional, structured experience, PixieDVC can support
            that need.
          </p>
        </section>

        <section className="space-y-8 py-16">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold text-slate-900">How the partnership works</h2>
            <p className="text-base leading-relaxed text-gray-600">PixieDVC manages the full rental process, including:</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-5">
            {partnershipSteps.map((step, index) => (
              <article key={step} className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_10px_24px_rgba(15,33,72,0.06)]">
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f5f8ff] text-xs font-semibold text-[#1f315d]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-slate-900">Step {String(index + 1).padStart(2, "0")}</p>
                    <p className="text-base leading-relaxed text-gray-600">{step}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="text-base leading-relaxed text-gray-600">
            Your clients benefit from a concierge-managed experience, while owners remain protected at every step.
          </p>
        </section>

        <section className="rounded-3xl border border-[#dbe6ff] bg-[#f5f8ff] px-8 py-12 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h2 className="text-3xl font-semibold text-slate-900">Start earning with PixieDVC</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild>
                <Link href="/partners/affiliate-program" className="!text-white">
                  Apply as a Partner
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6 py-16">
          <h2 className="text-3xl font-semibold text-slate-900">What this means for you</h2>
          <ul className="space-y-3 text-base leading-relaxed text-gray-600">
            {outcomes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-6 py-16">
          <h2 className="text-3xl font-semibold text-slate-900">Start a conversation</h2>
          <p className="text-base leading-relaxed text-gray-600">
            If you’re interested in partnering with PixieDVC, reach out to discuss your focus area and how our concierge
            team can support your bookings.
          </p>
          <p className="text-base leading-relaxed text-gray-600">Contact us to explore partnership opportunities and onboarding.</p>
        </section>
      </div>
    </main>
  );
}
