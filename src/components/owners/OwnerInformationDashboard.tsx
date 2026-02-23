import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

import IntercomButton from "@/components/chat/IntercomButton";

const protectionTiles = [
  { title: "Verified Guests", text: "Identity and payment confirmed before booking." },
  { title: "Owner Authorization", text: "No reservation made without your approval." },
  { title: "Secure Payments", text: "Guest funds collected by PixieDVC." },
  { title: "Concierge Oversight", text: "Every reservation reviewed manually." },
  { title: "Clear Documentation", text: "Agreements and invoices provided." },
  { title: "No Owner Fees", text: "You receive payout without deductions." },
];

const timingTiles = [
  { title: "Booking window", text: "Earlier availability usually rents faster." },
  { title: "Resort demand", text: "High-demand resorts move quickly." },
  { title: "Point expiration", text: "Short shelf life may need flexibility." },
  { title: "Dates & room type", text: "Popular dates fill first." },
];

const specialTiles = [
  { title: "Confirmed reservations", text: "We can list them safely when it makes sense." },
  { title: "Short-notice / expiring points", text: "Concierge can recommend the best option." },
  { title: "Flexible or last-minute availability", text: "We match faster when you’re flexible." },
];

const flowSteps = [
  { title: "Share availability", body: "Resort • use year • dates" },
  { title: "We match & verify guests", body: "ID verified • payment secured" },
  { title: "You approve & book", body: "Agreement reviewed • reservation made" },
  { title: "Payout released", body: "After check-out" },
];

export default function OwnerInformationDashboard() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <section className="py-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-12">
            <Hero />
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl lg:text-4xl">
                Rent your Disney Vacation Club points with confidence
              </h1>
            <p className="text-base text-slate-600">
              You don’t hand over control of your points — you partner with a concierge-led team that takes on the
              operational work of renting them responsibly.
            </p>
            <p className="text-base text-slate-600">
              PixieDVC connects verified guests with available Disney Vacation Club points, manages communication and
              documentation, and ensures each booking follows a clear, structured, and contractually sound process,
              with owner protection built in at every step.
            </p>
            <div className="mt-8 max-w-[calc(768px+40px)]">
              <div className="border-t border-slate-300/80 pt-6">
                <p className="text-base font-semibold uppercase tracking-[0.2em] text-slate-700">What this means for you</p>
                <div className="mt-6 space-y-8">
                  <div>
                    <p className="text-base font-semibold text-slate-900">Consistent guest demand, responsibly matched</p>
                    <p className="mt-2 text-sm text-slate-600">
                      We work with active renters seeking specific resorts, dates, and room types, allowing your points
                      to be matched efficiently.
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">Concierge-managed from inquiry to checkout</p>
                    <p className="mt-2 text-sm text-slate-600">
                      We handle guest screening, communication, agreements, and coordination, so you don’t have to manage
                      emails, negotiations, or follow-ups.
                    </p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">Owner approval required for every booking</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Once a match is found, we send you all the necessary details so you can easily complete the
                      booking. You remain in control of when, how, and if your points are used.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-900">Ready to list your points with full control?</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/owner/onboarding"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#0F2148] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b1b39]"
                style={{ backgroundColor: "#0F2148", color: "#ffffff" }}
              >
                Create Owner Account
              </Link>
              <IntercomButton
                label="Talk to a Concierge"
                showStatus
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#0F2148] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b1b39]"
              />
            </div>
            <hr className="mt-6 w-full border-t border-slate-300/80" />
          </div>

          </div>
        </section>

        <section className="py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">From points to payout</h2>
          </div>
          <div className="rounded-2xl bg-[#0B1E3A] px-6 py-5 text-white shadow-sm ring-1 ring-white/10">
            <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch lg:gap-4">
              {flowSteps.map((step, idx) => (
                <div key={step.title} className="contents">
                  <div className="min-h-[92px] space-y-1 rounded-2xl bg-[#0B1E3A]">
                    <div className="text-sm font-semibold tracking-tight">{step.title}</div>
                    <div className="text-xs text-white/70">{step.body}</div>
                  </div>
                  {idx < flowSteps.length - 1 ? (
                    <div className="flex items-center justify-center self-center justify-self-center">
                      <ArrowNode direction="right" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="lg:hidden space-y-3">
              {flowSteps.map((step, idx) => (
                <div key={step.title}>
                  <div className="min-h-[92px] space-y-1 rounded-2xl bg-[#0B1E3A]">
                    <div className="text-sm font-semibold tracking-tight">{step.title}</div>
                    <div className="text-xs text-white/70">{step.body}</div>
                  </div>
                  {idx < flowSteps.length - 1 ? (
                    <div className="my-3 flex justify-center">
                      <ArrowNode direction="down" />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">How your payout works</h2>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
              <span>Booking</span>
              <span className="text-slate-300">→</span>
              <span>Check-in</span>
              <span className="text-slate-300">→</span>
              <span>Check-out</span>
              <span className="text-slate-300">→</span>
              <span>Payout released</span>
            </div>
            <p className="mt-3 text-sm text-slate-600">No chasing. No guessing. Clear release timing.</p>
          </div>
        </section>

        <section className="py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">Owner-first protection, by design</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {protectionTiles.map((tile) => (
              <Tile key={tile.title} title={tile.title} body={tile.text} />
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">What affects how fast points rent</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {timingTiles.map((tile) => (
              <Tile key={tile.title} title={tile.title} body={tile.text} />
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-900">Special situations we can help with</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {specialTiles.map((tile) => (
              <div
                key={tile.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
              >
                <h3 className="text-sm font-semibold text-slate-900">{tile.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{tile.text}</p>
                <Link href="/contact?role=Owner" className="mt-4 inline-flex text-xs font-semibold text-slate-900">
                  Talk to concierge →
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12">
          <div className="rounded-[24px] border border-slate-200 bg-slate-900 px-6 py-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold !text-white">You stay in control. We handle the rest.</h3>
                <p className="mt-2 text-sm text-slate-400">List your points when you’re ready.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/owner/onboarding"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/30 hover:bg-white/16"
                >
                  Create Owner Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Tile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.08)]">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden ring-1 ring-black/10 shadow-sm">
      <img
        src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/pixiedvc-social-proof/platform-images/Screenshot%202026-01-01%20at%2012.34.06%20AM.png"
        alt="PixieDVC owner rental process overview"
        className="h-[280px] w-full object-cover lg:h-[460px]"
      />
    </div>
  );
}

function ArrowNode({ direction }: { direction: "right" | "down" }) {
  const Icon = direction === "right" ? ArrowRight : ArrowDown;
  return (
    <div className="flex items-center justify-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm ring-1 ring-black/5">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
