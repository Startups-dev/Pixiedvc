import Link from "next/link";

export default function GuestPoliciesPage() {
  return (
    <main className="bg-[#f7f4ef] text-[#0F2148]">
      <section className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <div className="rounded-[28px] border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)] md:p-10">
          <h1 className="font-display text-3xl font-semibold text-[#0F2148] sm:text-4xl">
            Booking Basics for Guests
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[#0F2148]/76">
            Before you book, here are the essentials:
          </p>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-[#0F2148]/76">
            <li>Requests are not instant reservations</li>
            <li>You review full details before payment</li>
            <li>Confirmed stays include a Disney reservation number</li>
            <li>Changes and cancellations depend on booking terms</li>
            <li>Our concierge team can guide you before you commit</li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-full bg-[#0F2148] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1A2F66]"
            >
              Start Your Request
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-[#0F2148]/14 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/28"
            >
              Contact Concierge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
