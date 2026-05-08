import Link from "next/link";

import { Card } from "@pixiedvc/design-system";

const beforeConfirmation = [
  "You can cancel your request at any time",
  "Any request deposit is handled according to the terms shown at checkout",
  "No booking is made until availability is confirmed and you approve the details",
];

const afterConfirmation = [
  "Confirmed reservations are typically non-refundable",
  "Changes depend on availability and owner limitations",
  "Date changes are not guaranteed",
];

const flexibilityOptions = [
  "Deferred travel credit",
  "Partial recovery options depending on timing",
  "Assistance rebooking your stay",
];

const flexibilityDependsOn = [
  "how far in advance you cancel",
  "resort and room type",
  "owner flexibility",
];

const noSurprises = [
  "Full price",
  "Payment terms",
  "Cancellation terms specific to your booking",
  "Any available flexibility options",
];

const conciergeSupport = [
  "We will help explore rebooking options",
  "We will check availability for alternatives",
  "We will guide you through available credit or adjustment options",
];

export default function GuestCancellationPolicyPage() {
  return (
    <main className="bg-[#f8f6f2] text-[#0F2148]">
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-20">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6f7683]">Guest Policy</p>
          <h1 className="text-[38px] font-semibold leading-tight text-[#06080d] sm:text-[52px]">
            Cancellation &amp; Changes Policy
          </h1>
          <div className="max-w-3xl space-y-4 text-[16px] leading-7 text-[#5f6673]">
            <p className="font-medium text-[#30405f]">DVC reservations are different from standard hotel bookings.</p>
            <p className="font-semibold text-[#0F2148]">
              DVC reservations are typically non-refundable once confirmed.
            </p>
            <p>
              Because reservations are made using owner points, cancellation and change options are more limited.
              However, PixieDVC is structured to provide as much clarity and flexibility as possible before and after
              booking.
            </p>
            <p>
              PixieDVC bookings use owner points, which limits refunds but allows structured flexibility through
              credits and rebooking options.
            </p>
            <p>
              You may qualify for a travel credit under our{" "}
              <Link href="/policies/deferred-cancellation" className="font-semibold text-[#0F2148] underline underline-offset-4">
                Deferred Cancellation Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-8 px-6 pb-20">
        <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#5b78ff]">Before Confirmation</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">Before your stay is confirmed</h2>
          <ul className="mt-5 space-y-3 text-[16px] leading-7 text-[#5f6673]">
            {beforeConfirmation.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-[#5b78ff]">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#6f7683]">After Confirmation</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">After your reservation is confirmed</h2>
          <p className="mt-5 max-w-3xl text-[16px] leading-7 text-[#5f6673]">
            Once a stay is secured with a DVC owner, it becomes subject to the owner&apos;s points and booking rules.
          </p>
          <ul className="mt-5 space-y-3 text-[16px] leading-7 text-[#5f6673]">
            {afterConfirmation.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-[#0F2148]/55">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
            <p className="text-xs uppercase tracking-[0.22em] text-[#5b78ff]">Flexibility Options</p>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">
              Flexible cancellation options
            </h2>
            <p className="mt-5 text-[16px] leading-7 text-[#5f6673]">
              PixieDVC may offer:
            </p>
            <ul className="mt-5 space-y-3 text-[16px] leading-7 text-[#5f6673]">
              {flexibilityOptions.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="text-[#5b78ff]">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="rounded-xl border border-[#0F2148]/8 bg-[#163264] p-8 text-white shadow-[0_20px_50px_rgba(15,33,72,0.12)]">
            <p className="text-xs uppercase tracking-[0.22em] text-white/58">What It Depends On</p>
            <p className="mt-5 text-[16px] leading-7 text-white/76">These options depend on:</p>
            <ul className="mt-5 space-y-3 text-[16px] leading-7 text-white/78">
              {flexibilityDependsOn.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden="true" className="text-white/78">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-[#f7f9fc] p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#6f7683]">Timing Guidelines</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">
            General cancellation timing expectations
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#0F2148]/8 bg-white px-5 py-5">
              <p className="text-sm font-semibold text-[#0F2148]">More than 90 days before check-in</p>
              <p className="mt-2 text-sm text-[#0F2148]/72">Highest flexibility</p>
            </div>
            <div className="rounded-xl border border-[#0F2148]/8 bg-white px-5 py-5">
              <p className="text-sm font-semibold text-[#0F2148]">60-90 days</p>
              <p className="mt-2 text-sm text-[#0F2148]/72">Limited flexibility</p>
            </div>
            <div className="rounded-xl border border-[#0F2148]/8 bg-white px-5 py-5">
              <p className="text-sm font-semibold text-[#0F2148]">Less than 60 days</p>
              <p className="mt-2 text-sm text-[#0F2148]/72">Changes and refunds are unlikely</p>
            </div>
          </div>
          <p className="mt-6 text-[16px] leading-7 text-[#5f6673]">
            Exact terms are always shown before you confirm your booking.
          </p>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#5b78ff]">No Surprises</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">What you will always see</h2>
          <ul className="mt-5 grid gap-3 text-[16px] leading-7 text-[#5f6673] md:grid-cols-2">
            {noSurprises.map((item) => (
              <li key={item} className="flex gap-3 rounded-xl border border-[#0F2148]/8 bg-[#f6f8fc] px-4 py-4">
                <span aria-hidden="true" className="text-[#5b78ff]">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[16px] leading-7 text-[#5f6673]">You approve everything before committing.</p>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <p className="text-xs uppercase tracking-[0.22em] text-[#6f7683]">Concierge Support</p>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight text-[#06080d]">We help you navigate changes</h2>
          <p className="mt-5 text-[16px] leading-7 text-[#5f6673]">If your plans change:</p>
          <ul className="mt-5 space-y-3 text-[16px] leading-7 text-[#5f6673]">
            {conciergeSupport.map((item) => (
              <li key={item} className="flex gap-3">
                <span aria-hidden="true" className="text-[#0F2148]/55">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[16px] leading-7 text-[#5f6673]">We don&apos;t leave you to figure it out alone.</p>
        </Card>

        <section className="rounded-[28px] bg-[linear-gradient(180deg,#152753_0%,#0c1631_100%)] px-8 py-10 text-center text-white shadow-[0_20px_50px_rgba(15,33,72,0.12)]">
          <h2 className="text-[34px] font-semibold leading-tight text-white sm:text-[42px]">Questions before booking?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-[16px] leading-7 text-white/76">
            Talk to a concierge before you commit - we&apos;ll walk you through exactly what applies to your trip.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0F2148] transition hover:bg-white/90"
            >
              Contact Concierge
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
