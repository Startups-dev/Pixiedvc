import Link from "next/link";

import { Card } from "@pixiedvc/design-system";

const trustItems = [
  "Free to list",
  "Verified guests",
  "You approve every booking",
  "No membership access required",
];

const customMatchSteps = [
  {
    step: "1",
    title: "Submit your points",
    body:
      "Tell us your home resort, available points, use year, expiration date, and preferred payout.",
  },
  {
    step: "2",
    title: "We match you with a guest",
    body:
      "PixieDVC looks for guest requests that fit your points, resort, booking window, and timing.",
  },
  {
    step: "3",
    title: "You approve the booking",
    body:
      "We send you the guest details, travel dates, room type, points required, and payout terms. You can accept or decline.",
  },
  {
    step: "4",
    title: "You book through Disney",
    body:
      "If you accept, you create the reservation through your official DVC membership. You stay in control of your account.",
  },
  {
    step: "5",
    title: "You get paid",
    body:
      "Once the booking is confirmed and guest payment is collected, PixieDVC processes your payout according to the agreed terms.",
  },
];

const readyStaySteps = [
  {
    step: "1",
    title: "Submit your confirmed reservation",
    body:
      "Share the resort, dates, room type, guest capacity, and booking details for the reservation you already hold.",
  },
  {
    step: "2",
    title: "We prepare it for listing",
    body:
      "PixieDVC reviews the stay, helps position the price, and prepares it as a Ready Stay for guests looking for fixed dates.",
  },
  {
    step: "3",
    title: "Guests browse your stay",
    body:
      "Ready Stays are shown as confirmed reservations available to book faster than a custom request.",
  },
  {
    step: "4",
    title: "You review payout terms",
    body:
      "Before moving forward, you review the payout structure and any owner responsibilities tied to the reservation.",
  },
  {
    step: "5",
    title: "You get paid",
    body:
      "Once the guest books and payment is collected, PixieDVC processes your payout according to the agreed terms.",
  },
];

const valueItems = [
  {
    title: "You stay in control",
    body: "No access to your DVC account required.",
  },
  {
    title: "No guest back-and-forth",
    body: "We handle communication for you.",
  },
  {
    title: "Rent points before they expire",
    body: "Position inventory for faster placement.",
  },
  {
    title: "Monetize confirmed stays",
    body: "Turn bookings into Ready Stays guests can book faster.",
  },
  {
    title: "Clear terms upfront",
    body: "Review payout and booking details before accepting.",
  },
];

const notes = [
  "You keep full control of your DVC membership",
  "You create and manage the reservation directly",
  "Some updates may require your involvement",
  "You are responsible for any applicable taxes or reporting",
];

const faqs = [
  {
    q: "Who communicates with the guest?",
    a: "PixieDVC handles all guest communication from start to finish. You never need to communicate with the guest directly.",
  },
  {
    q: "How and when do I get paid?",
    a: "Once a booking is confirmed, you receive 70% of your payout upfront. The remaining 30% is released at check-in. You always see the full payout schedule before accepting any booking.",
  },
  {
    q: "How much can I earn?",
    a: "Most owners earn between $18–$23 per point depending on resort, demand, and timing. You always see the exact payout before accepting a booking.",
  },
  {
    q: "How long does it take to rent my points?",
    a: "It depends on your resort, dates, and pricing strategy. High-demand listings can match quickly, while others may take longer depending on flexibility and booking window. We prioritize points with approaching expiration to help maximize their chances of being placed.",
  },
  {
    q: "Do you take a commission?",
    a: "No. The payout you see is the amount you receive. PixieDVC’s service fee is built into the guest price and does not reduce your payout.",
  },
  {
    q: "Can I rent my DVC points legally?",
    a: "Yes. Renting DVC points is a common and widely accepted practice among owners.",
  },
  {
    q: "What happens if a guest cancels?",
    a: "Once a booking is confirmed and payment is collected, your payout is secured. If a guest cancels, it does not affect your payout. PixieDVC manages the cancellation and any rebooking or credits directly with the guest. See our Cancellation Policy for full details.",
  },
  {
    q: "What happens if there’s damage during a stay?",
    a: "Guests provide their own payment method to Disney at check-in, and any incidental charges or damages are handled directly by the resort. PixieDVC manages the booking process, and you are not responsible for guest-related charges during the stay.",
  },
  {
    q: "Do I need to book tickets or dining for the guest?",
    a: "No. Guests manage their own park tickets and dining plans through their Disney account once the reservation is linked. PixieDVC provides guidance and support to help guests navigate the process when needed.",
  },
  {
    q: "Do I have to accept every booking request?",
    a: "No. You review and approve every match before anything is booked.",
  },
];

function ImageSlot({
  label,
  note,
  className,
  imageUrl,
  imagePosition,
}: {
  label: string;
  note: string;
  className?: string;
  imageUrl?: string;
  imagePosition?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-[#0F2148]/10 bg-[linear-gradient(180deg,#edf3fb_0%,#dfe7f4_100%)] shadow-[0_18px_44px_rgba(15,33,72,0.08)] ${className ?? ""}`}
      style={
        imageUrl
          ? {
              backgroundImage: `url('${imageUrl}')`,
              backgroundPosition: imagePosition ?? "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!imageUrl ? (
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(15,33,72,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,33,72,0.06)_1px,transparent_1px)] [background-size:26px_26px]" />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,33,72,0.12),rgba(15,33,72,0.2))]" />
      )}
      {!imageUrl ? (
        <div className="relative flex h-full min-h-[260px] items-end p-6">
          <div className="border border-white/40 bg-white/70 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-[0.22em] text-[#0F2148]/50">{label}</p>
            <p className="mt-2 text-sm leading-6 text-[#0F2148]/72">{note}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HowItWorksPanel({
  label,
  steps,
}: {
  label: string;
  steps: Array<{ step: string; title: string; body: string }>;
}) {
  return (
    <details className="group rounded-xl border border-[#0F2148]/10 bg-white/80">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-[#0B1F44] marker:content-none">
        <span>{label}</span>
        <span className="text-[#6f7683] transition-transform duration-200 group-open:rotate-180">⌄</span>
      </summary>
      <div className="border-t border-[#0F2148]/8 px-5 py-5">
        <div className="space-y-3">
          {steps.map((item) => (
            <div
              key={`${label}-${item.step}`}
              className="flex gap-4 rounded-xl border border-[#0F2148]/8 bg-[#f8fafc] px-4 py-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B1F44] text-sm font-semibold text-white">
                {item.step}
              </div>
              <div>
                <p className="text-[16px] font-semibold leading-6 text-[#0B1F44]">{item.title}</p>
                <p className="mt-1 text-[15px] leading-6 text-[#5f6673]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

export default function OwnersPage() {
  return (
    <main className="bg-[#f8f6f2] text-[#0F2148]">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,16,36,0.48),rgba(7,16,36,0.62)),url('https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/vero-beach/VBR1.png')] bg-cover bg-center" />
        <div className="relative mx-auto max-w-6xl px-6 py-40 md:py-56" />
      </section>

      <section className="relative z-10 -mt-36 px-6">
        <div className="mx-auto max-w-4xl">
          <Card className="border border-[#0F2148]/8 bg-white p-8 text-center shadow-[0_24px_60px_rgba(15,33,72,0.10)] md:p-10">
            <div className="mx-auto max-w-3xl space-y-5">
              <p className="text-[18px] leading-[1.7] text-[#5f6673] sm:text-[20px]">
                PixieDVC helps DVC owners rent unused points or confirmed reservations through a secure, guided platform. You stay in control, we handle the rest.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/owner/onboarding"
                  className="inline-flex items-center rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#1f3567,#5b78ff)] px-6 py-3 text-sm font-semibold !text-white shadow-[0_14px_32px_rgba(18,35,74,0.42)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_18px_36px_rgba(18,35,74,0.5)]"
                >
                  List Your Points
                </Link>
                <Link
                  href="/owner/onboarding"
                  className="inline-flex items-center rounded-full border border-[#0F2148]/14 bg-white px-6 py-3 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/28"
                >
                  Rent a Confirmed Reservation
                </Link>
              </div>
              <div className="flex flex-col gap-3 pt-2 text-sm text-[#0F2148]/60 sm:flex-row sm:flex-wrap sm:justify-center">
                {trustItems.map((item) => (
                  <span key={item} className="border border-[#e3daf5] bg-[#f3effa] px-4 py-2">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <Card className="rounded-xl border border-[#0F2148]/8 bg-[#f7f9fc] px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,33,72,0.06)] md:px-12">
            <div className="mx-auto max-w-3xl space-y-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7d8490]">Typical Owner Payouts</p>
              <h2 className="text-3xl font-bold leading-tight text-[#0B1F44] sm:text-4xl">
                $18–$23 per point depending on resort, booking window, and demand
              </h2>
              <ul className="space-y-3 text-left text-[17px] leading-[1.65] text-[#5f6673] sm:text-[18px]">
                <li>• Up to $23/point for premium resorts booked early (7–11 months)</li>
                <li>• $20/point for high-demand resorts in the home booking window</li>
                <li>• $18/point for shorter windows, expiring points, or standard resorts</li>
              </ul>
              <p className="text-[17px] font-semibold leading-[1.6] text-[#30405f] sm:text-[18px]">
                You always see and approve the payout before accepting any booking.
              </p>
              <details className="group mx-auto max-w-2xl text-left">
                <summary className="cursor-pointer list-none text-sm font-semibold text-[#0B1F44] underline underline-offset-4 marker:content-none">
                  See how pricing works
                </summary>
                <div className="mt-4 rounded-xl border border-[#0F2148]/8 bg-white px-5 py-5 text-[15px] leading-7 text-[#5f6673]">
                  <p className="font-medium text-[#30405f]">Pricing is based on:</p>
                  <ul className="mt-2 space-y-1">
                    <li>• Resort demand</li>
                    <li>• Booking window (7–11 months vs shorter)</li>
                    <li>• Travel dates and seasonality</li>
                    <li>• How quickly you want to place your points</li>
                  </ul>
                </div>
              </details>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <ImageSlot
            label="Image Placement"
            note="Owner lifestyle or DVC resort image for the points-listing section."
            className="min-h-[420px] rounded-xl"
            imageUrl="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/resorts/Riviera/RR4.png"
            imagePosition="center 72%"
          />
          <div className="space-y-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#7d8490]">Custom Matches</p>
            <h2 className="text-2xl font-bold leading-tight text-[#0B1F44] sm:text-4xl">List Your DVC Points</h2>
            <p className="text-[19px] font-medium leading-[1.5] text-[#4f5866]">
              Best if you have unused points
            </p>
            <ul className="space-y-3 text-[17px] leading-[1.6] text-[#5f6673]">
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                <span>Tell us your resort, points, and expiration</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                <span>Set your preferred payout</span>
              </li>
              <li className="flex items-start gap-3">
                <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                <span>Review each guest match before accepting</span>
              </li>
            </ul>
            <p className="text-[18px] font-semibold leading-[1.55] text-[#30405f]">
              You stay in control. Nothing is booked without your approval.
            </p>
            <div className="space-y-3">
              <p className="text-[18px] font-semibold leading-[1.5] text-[#0B1F44]">
                Choose your strategy
              </p>
              <ul className="space-y-2 text-[17px] leading-[1.6] text-[#5f6673]">
                <li>• Accept faster matches at standard pricing</li>
                <li>• Hold out for higher-paying premium bookings</li>
                <li>• Or stay flexible and review each opportunity as it comes</li>
              </ul>
              <p className="text-[17px] font-medium leading-[1.6] text-[#30405f]">
                You decide what to accept. Nothing is automatic.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                  <Link
                    href="/owner/onboarding"
                    className="inline-flex h-12 items-center rounded-full bg-[#0B1F44] px-6 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(11,31,68,0.18)] transition hover:bg-[#173566] hover:!text-white hover:shadow-[0_14px_28px_rgba(11,31,68,0.22)]"
                  >
                    List My Points
                  </Link>
              </div>
              <HowItWorksPanel label="How Custom Matches works" steps={customMatchSteps} />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-start">
            <div className="space-y-6">
              <p className="text-xs uppercase tracking-[0.24em] text-[#7d8490]">Ready Stays</p>
              <h2 className="text-2xl font-bold leading-tight text-[#0B1F44] sm:text-4xl">Rent a Confirmed Reservation</h2>
              <p className="text-[19px] font-medium leading-[1.5] text-[#4f5866]">
                Best for faster placement and last-minute value
              </p>
              <ul className="space-y-3 text-[17px] leading-[1.6] text-[#5f6673]">
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                  <span>List an already secured Disney reservation</span>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                  <span>Reach guests looking for fixed dates or short-notice stays</span>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden="true" className="pt-0.5 text-[#0B1F44]">✔</span>
                  <span>Review payout terms before deciding to move forward</span>
                </li>
              </ul>
              <p className="text-[18px] font-semibold leading-[1.55] text-[#30405f]">
                Your stay is already secured, and PixieDVC helps market it to the right guest.
              </p>
              <div className="space-y-4">
                <div>
                  <Link
                    href="/owner/onboarding"
                    className="inline-flex h-12 items-center rounded-full bg-[#0B1F44] px-6 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(11,31,68,0.18)] transition hover:bg-[#173566] hover:!text-white hover:shadow-[0_14px_28px_rgba(11,31,68,0.22)]"
                  >
                    List My Reservation
                  </Link>
                </div>
                <HowItWorksPanel label="How Ready Stays works" steps={readyStaySteps} />
              </div>
            </div>
            <ImageSlot
              label="Image Placement"
              note="Confirmed reservation / Ready Stay image placement for this section."
              className="min-h-[360px] rounded-xl"
              imageUrl="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/c6860da3-95d5-4e4c-ac16-7af0bab3a097-1.png"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#163264] py-16 text-white md:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="space-y-10">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-white/58">Why Owners Use PixieDVC</p>
              <h2 className="text-[34px] font-semibold leading-tight !text-white sm:text-[42px]">
                Keep control, reduce friction, and earn more from your points
              </h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {valueItems.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/8 px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                >
                  <p className={`text-[20px] font-semibold leading-tight ${index === 0 ? "!text-white" : "text-white"}`}>{item.title}</p>
                  <p className={`mt-3 text-[15px] leading-7 ${index === 0 ? "!text-white" : "text-white/72"}`}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="space-y-6">
            <ImageSlot
              label="Image Placement"
              note="Optional owner dashboard, resort, or hospitality image placement."
              className="min-h-[300px] rounded-xl"
              imageUrl="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/Owners-images/earnings%20owner%20daashboard.png"
            />
            <Card className="rounded-xl border border-[#0F2148]/8 bg-[#f7f9fc] p-6 shadow-[0_16px_36px_rgba(15,33,72,0.06)]">
              <p className="text-xs uppercase tracking-[0.22em] text-[#6f7683]">What owners should know</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[#5f6673]">
                {notes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden="true" className="text-[#8d5cf6]">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#6f7683]">Owner FAQ</p>
            <h2 className="text-[38px] font-semibold leading-tight text-[#06080d] sm:text-[46px]">Everything owners want to know before listing</h2>
            <p className="max-w-[500px] text-[17px] leading-7 text-[#5f6673]">
              Still have questions? Most owners do before listing. Here are the answers that matter most.
            </p>
            <div className="space-y-4">
              {faqs.map((item) => (
                <Card
                  key={item.q}
                  className="border border-[#eadff7] bg-[#fbf8ff] px-6 py-5 shadow-[0_12px_28px_rgba(15,33,72,0.05)] transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-[1px] hover:border-[#d8c6f2] hover:shadow-[0_16px_32px_rgba(15,33,72,0.08)]"
                >
                  <h3 className="text-[24px] font-semibold leading-tight text-[#06080d]">{item.q}</h3>
                  <p className="mt-3 text-[16px] leading-7 text-[#5f6673]">{item.a}</p>
                </Card>
              ))}
            </div>
            <div className="pt-3">
              <p className="text-[18px] font-semibold leading-7 text-[#0B1F44]">Ready to list your points?</p>
              <div className="mt-4">
                <Link
                  href="/owner/onboarding"
                  className="inline-flex h-12 items-center rounded-full bg-[#0B1F44] px-6 text-sm font-semibold !text-white shadow-[0_10px_24px_rgba(11,31,68,0.18)] transition hover:bg-[#173566] hover:!text-white hover:shadow-[0_14px_28px_rgba(11,31,68,0.22)]"
                >
                  List My Points
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#6f7683]">
                Takes less than 2 minutes. No commitment required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#0F2148]/8 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-[38px] font-semibold leading-tight text-[#06080d] sm:text-[52px]">
            Ready to earn from your unused DVC points?
          </h2>
          <p className="mt-4 text-[18px] leading-[1.65] text-[#5f6673] sm:text-[19px]">
            List your points or confirmed reservation today and let PixieDVC help you find the right guest.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/owner/onboarding"
              className="inline-flex items-center rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#1f3567,#5b78ff)] px-6 py-3 text-sm font-semibold !text-white shadow-[0_14px_32px_rgba(18,35,74,0.42)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:!text-white hover:brightness-105 hover:shadow-[0_18px_36px_rgba(18,35,74,0.5)]"
            >
              Start Owner Listing
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-full border border-[#0F2148]/14 bg-white px-6 py-3 text-sm font-semibold text-[#0F2148] transition hover:border-[#0F2148]/28"
            >
              Contact Owner Concierge
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
