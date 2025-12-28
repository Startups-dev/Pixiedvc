import Link from "next/link";

import TestimonialsSection from "@/components/TestimonialsSection";

export default function OurStoryPage() {
  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-6xl px-6 pb-10 pt-10">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">Our Story</p>
        <h1 className="mt-3 text-4xl font-serif sm:text-5xl">Built by a DVC family — for families like yours.</h1>
        <div className="mt-6 space-y-4 text-base leading-7 text-[#0F2148]/80">
          <p>
            PixieDVC started the same way many Disney trips do: around a family table, planning a vacation that meant
            more than just a few days away.
          </p>
          <p>
            We’re Disney Vacation Club owners. We’ve planned trips with kids, grandparents, first-time Disney guests,
            and lifelong fans. We know how exciting — and sometimes overwhelming — planning a DVC stay can feel.
          </p>
          <p>So we built PixieDVC to make it easier, calmer, and more human.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-12 px-6 pb-14">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#0F2148]">Why PixieDVC Exists</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">Disney vacations are special.</p>
          <p className="text-sm leading-6 text-[#0F2148]/80">They’re often:</p>
          <ul className="space-y-2 text-sm text-[#0F2148]/80">
            <li>• A once-a-year escape</li>
            <li>• A big family reunion</li>
            <li>• A child’s first unforgettable trip</li>
            <li>• A meaningful investment in time together</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            But finding the right DVC stay doesn’t always feel magical.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Too often, families are left sorting through confusing point charts, wondering if they’re making the right
            choice, or feeling unsure about who to trust.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">PixieDVC exists to change that experience.</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#0F2148]">We’re DVC Owners Too</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">PixieDVC isn’t a faceless marketplace.</p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            We’re people who actually use DVC. We understand how the system works, where it gets confusing, and what
            details matter most when you’re planning a stay.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">Because we’ve been there, we focus on helping you:</p>
          <ul className="space-y-2 text-sm text-[#0F2148]/80">
            <li>• Understand your options clearly</li>
            <li>• Choose what fits your trip best</li>
            <li>• Feel confident every step of the way</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            No pressure. No rushing. Just thoughtful guidance.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#0F2148]">How We Do Things Differently</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Instead of treating your stay like a transaction, we treat it like a conversation.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">With PixieDVC, you can expect:</p>
          <ul className="space-y-2 text-sm text-[#0F2148]/80">
            <li>• Personal, concierge-style support</li>
            <li>• Clear explanations (no guesswork)</li>
            <li>• Honest recommendations</li>
            <li>• Careful matching with trusted owners</li>
            <li>• A planning experience that feels calm, not chaotic</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">We’d rather get it right than get it fast.</p>
        </div>
      </section>

      <TestimonialsSection />

      <section className="mx-auto max-w-6xl space-y-12 px-6 pb-16">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#0F2148]">A Family-Run Approach</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">PixieDVC is family-run, and that shapes how we work.</p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            We know how much these trips matter — especially when you’re traveling with the people you love most. That’s
            why we take extra care with every request, every question, and every detail.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Your vacation deserves that level of attention.
          </p>
        </div>

        <div className="rounded-3xl border border-[#0F2148]/10 bg-[#0F2148]/5 p-6 text-sm leading-6 text-[#0F2148]/80">
          <h2 className="text-xl font-semibold text-[#0F2148]">Transparency Matters</h2>
          <p className="mt-3">
            PixieDVC is an independent platform created by Disney Vacation Club owners.
            We are not affiliated with or endorsed by The Walt Disney Company or Disney Vacation Club. Our role is to
            help families access DVC resorts with clarity, care, and confidence.
          </p>
        </div>

        <div className="rounded-3xl bg-[#0F2148] px-6 py-10 text-white shadow-[0_30px_80px_rgba(8,12,30,0.35)] sm:px-10">
          <p className="text-sm text-white/75">
            If you’re thinking about a Disney Vacation Club stay and want a more relaxed, supportive way to plan it,
            we’d be happy to help.
          </p>
          <p className="mt-3 text-lg font-semibold">Let’s plan your stay — together.</p>
          <Link
            href="/stay-builder"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F2148]"
          >
            Plan Your Stay
          </Link>
        </div>
      </section>
    </main>
  );
}
