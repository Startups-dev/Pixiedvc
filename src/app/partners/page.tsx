import Link from "next/link";
import { Button } from "@pixiedvc/design-system";

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-white text-[#0F2148]">
      <section className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        <section className="space-y-6 rounded-3xl bg-[#0F2148] px-8 py-10 text-white shadow-[0_30px_80px_rgba(8,12,30,0.35)]">
          <h1 className="text-4xl font-semibold tracking-tight !text-slate-400">Become a PixieDVC Partner</h1>
          <p className="text-lg text-white/80">
            Join a growing ecosystem of professionals, creators, and service providers supporting Disney Vacation Club
            stays.
          </p>
          <p className="max-w-3xl text-base text-white/75">
            Whether you bring clients, audiences, or experiences — PixieDVC helps you monetize and scale without
            operational complexity.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="#partnership-types" className="!text-white">
                Explore Partner Types
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/contact" className="!text-white">
                Contact Us
              </Link>
            </Button>
          </div>
        </section>

        <section id="partnership-types" className="space-y-6 scroll-mt-24">
          <h2 className="text-3xl font-semibold text-[#0F2148]">Choose Your Partnership Type</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <article className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-semibold text-[#0F2148]">Travel Advisors &amp; Agencies</h3>
              <p className="text-sm leading-relaxed text-[#0F2148]/75">
                Offer Disney Vacation Club rentals to your clients without managing contracts, owner coordination, or
                payment risk.
              </p>
              <div className="space-y-2 text-sm text-[#0F2148]/80">
                <p>
                  <span className="font-semibold">You:</span> Bring or manage the client relationship
                </p>
                <p>
                  <span className="font-semibold">PixieDVC:</span> Handles matching, contracts, communication, and
                  payments
                </p>
                <p>
                  <span className="font-semibold">You earn:</span> Commission on each completed booking
                </p>
              </div>
              <Button asChild>
                <Link href="/partners/apply?type=advisor" className="!text-white">
                  Apply as an Advisor
                </Link>
              </Button>
            </article>

            <article className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-semibold text-[#0F2148]">Affiliates &amp; Content Creators</h3>
              <p className="text-sm leading-relaxed text-[#0F2148]/75">
                Monetize your audience by referring travelers interested in Disney Vacation Club stays.
              </p>
              <div className="space-y-2 text-sm text-[#0F2148]/80">
                <p>
                  <span className="font-semibold">You:</span> Share PixieDVC through your content, links, or audience
                </p>
                <p>
                  <span className="font-semibold">PixieDVC:</span> Manages the entire booking and fulfillment process
                </p>
                <p>
                  <span className="font-semibold">You earn:</span> Commission on successful referrals
                </p>
              </div>
              <Button asChild>
                <Link href="/partners/apply?type=affiliate" className="!text-white">
                  Apply as an Affiliate
                </Link>
              </Button>
            </article>

            <article className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
              <h3 className="text-xl font-semibold text-[#0F2148]">Experience &amp; Service Providers</h3>
              <p className="text-sm leading-relaxed text-[#0F2148]/75">
                Enhance guest stays by offering services and experiences during their visit.
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-[#0F2148]/80">
                <li>Photography sessions</li>
                <li>Room decoration (birthdays, anniversaries)</li>
                <li>Charcuterie &amp; celebration setups</li>
                <li>Personal training &amp; wellness services</li>
                <li>Massage &amp; spa services</li>
                <li>Grocery &amp; delivery services</li>
                <li>Private chefs</li>
                <li>Transportation &amp; concierge add-ons</li>
              </ul>
              <div className="space-y-2 text-sm text-[#0F2148]/80">
                <p>
                  <span className="font-semibold">You:</span> Deliver high-quality services to guests
                </p>
                <p>
                  <span className="font-semibold">PixieDVC:</span> Connects you with qualified, high-intent travelers
                </p>
                <p>
                  <span className="font-semibold">You earn:</span> Direct bookings and/or platform-referred clients
                </p>
              </div>
              <Button asChild>
                <Link href="/partners/apply?type=service" className="!text-white">
                  Apply as a Service Partner
                </Link>
              </Button>
            </article>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-3xl font-semibold text-[#0F2148]">Not sure which partnership fits?</h2>
          <p className="max-w-3xl text-base text-[#0F2148]/75">
            If you&apos;re not sure which partnership type is right for your business, contact us and our team will
            help you find the best fit.
          </p>
          <Button asChild>
            <Link href="/contact" className="!text-white">
              Contact Us
            </Link>
          </Button>
        </section>
      </section>
    </main>
  );
}
