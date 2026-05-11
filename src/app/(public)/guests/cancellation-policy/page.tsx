import Link from "next/link";
import { ArrowRight, CalendarDays, CreditCard, RefreshCcw } from "lucide-react";

import FaqAccordion from "@/components/FaqAccordion";

const beforeConfirmation = [
  {
    question: "When is my request deposit refundable?",
    answer:
      "Your request deposit remains refundable while PixieDVC is still working to match your stay and confirm availability. The specific booking terms shown before checkout always control how that deposit is handled.",
  },
  {
    question: "What happens before availability is confirmed?",
    answer:
      "No reservation is booked until availability is confirmed and you approve the stay details. Before that point, our concierge team is still working through owner availability, resort timing, and match options for your request.",
  },
];

const afterConfirmation = [
  {
    question: "Are confirmed reservations refundable?",
    answer:
      "Confirmed Disney villa reservations are typically much more restrictive than standard hotel bookings. Once owner points are committed to your stay, refund and cancellation flexibility depends on the specific terms shown before you complete payment.",
  },
  {
    question: "Can I change dates after confirmation?",
    answer:
      "Changes may be possible, but availability becomes more limited closer to arrival and depends on owner point restrictions, resort demand, and room type availability.",
  },
  {
    question: "What flexibility options may be available?",
    answer:
      "Depending on timing and booking terms, eligible flexibility may include rebooking support, travel credit options, or other approved adjustment paths described with your reservation terms before you commit.",
  },
];

const travelCredits = [
  {
    question: "What is the Deferred Cancellation Policy?",
    answer:
      "Some bookings may include eligibility for a Deferred Cancellation Credit rather than a cash refund. When available, this is explained in the reservation-specific terms shown before payment is completed.",
  },
  {
    question: "How are travel credits determined?",
    answer:
      "Travel credit eligibility depends on factors such as how far in advance you cancel, the resort and room type booked, owner flexibility, and the specific terms attached to your reservation.",
  },
  {
    question: "What affects cancellation flexibility?",
    answer:
      "Cancellation flexibility is influenced by booking timing, resort demand, owner point restrictions, and any reservation-specific options offered before checkout. Earlier notice generally creates more room for alternatives.",
  },
];

export default function GuestCancellationPolicyPage() {
  return (
    <main className="bg-[linear-gradient(180deg,#f8faff_0%,#ffffff_18%,#f9fbff_100%)] text-slate-900">
      <section className="mx-auto max-w-6xl px-6 pb-12 pt-16 sm:pt-20">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-[#10224b] sm:text-5xl">
            Cancellation &amp; Changes Policy
          </h1>
          <p className="mt-5 text-base leading-8 text-[#546887] sm:text-lg">
            Important information about booking flexibility, reservation changes, and travel credit options for Disney
            villa stays.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div
          className="overflow-hidden rounded-[2.25rem] border border-[#dbe5f5] shadow-[0_22px_56px_rgba(16,34,75,0.08)]"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,15,34,0.08) 0%, rgba(7,15,34,0.22) 100%), url(https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR4.png) center/cover",
          }}
        >
          <div className="bg-[linear-gradient(90deg,rgba(7,15,34,0.72)_0%,rgba(7,15,34,0.34)_52%,rgba(7,15,34,0.16)_100%)] px-8 py-10 sm:px-12 sm:py-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight !text-white sm:text-[2.2rem]">
                Booking flexibility, explained clearly.
              </h2>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-10 px-6 pb-20">
        <section className="scroll-mt-28 rounded-[2rem] bg-white px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(180deg,#eef3ff,#f8faff)] text-[#3a57a5] shadow-[0_12px_30px_rgba(16,34,75,0.08)]">
                <CalendarDays className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-[#10224b]">Before confirmation</h2>
                <div className="mt-3 h-px w-24 bg-[linear-gradient(90deg,rgba(49,79,152,0.34),rgba(49,79,152,0.06))]" />
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5a6d8f]">
              What happens while your request is still being worked, before a Disney villa stay is secured and ready
              for approval.
            </p>
          </div>
          <div className="mt-7">
            <FaqAccordion categoryId="cancellation-before-confirmation" items={beforeConfirmation} />
          </div>
        </section>

        <section className="scroll-mt-28 rounded-[2rem] bg-[linear-gradient(180deg,rgba(243,247,255,0.96),rgba(249,251,255,0.99))] px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(180deg,#eef3ff,#f8faff)] text-[#3a57a5] shadow-[0_12px_30px_rgba(16,34,75,0.08)]">
                <CreditCard className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-[#10224b]">After confirmation</h2>
                <div className="mt-3 h-px w-24 bg-[linear-gradient(90deg,rgba(49,79,152,0.34),rgba(49,79,152,0.06))]" />
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5a6d8f]">
              What to expect once a matching owner is secured, availability is confirmed, and your reservation terms
              are ready for approval.
            </p>
          </div>
          <div className="mt-7">
            <FaqAccordion categoryId="cancellation-after-confirmation" items={afterConfirmation} />
          </div>
        </section>

        <section className="scroll-mt-28 rounded-[2rem] bg-white px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.15rem] bg-[linear-gradient(180deg,#eef3ff,#f8faff)] text-[#3a57a5] shadow-[0_12px_30px_rgba(16,34,75,0.08)]">
                <RefreshCcw className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-[2rem] font-semibold tracking-tight text-[#10224b]">Travel credits &amp; rebooking</h2>
                <div className="mt-3 h-px w-24 bg-[linear-gradient(90deg,rgba(49,79,152,0.34),rgba(49,79,152,0.06))]" />
              </div>
            </div>
            <p className="mt-5 max-w-2xl text-[17px] leading-8 text-[#5a6d8f]">
              How Deferred Cancellation terms, travel credits, and alternate options may apply if plans change.
            </p>
          </div>
          <div className="mt-7">
            <FaqAccordion categoryId="cancellation-travel-credits" items={travelCredits} />
          </div>
        </section>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-[2rem] border border-[#dde6f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,255,0.98))] px-8 py-9 text-center shadow-[0_18px_44px_rgba(15,33,72,0.06)]">
          <h2 className="text-2xl font-semibold tracking-tight text-[#10224b]">Still have questions?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#5a6d8f]">
            Our concierge team can help clarify booking and cancellation questions before you commit.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(180deg,#203b78,#152c5b)] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,33,72,0.18)] transition hover:brightness-110 hover:shadow-[0_14px_28px_rgba(15,33,72,0.22)]"
          >
            Talk to concierge
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
