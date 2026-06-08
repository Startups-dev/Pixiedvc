import Link from "next/link";

import ExpiringPointsRequestForm from "@/components/owner/ExpiringPointsRequestForm";

export const metadata = {
  title: "Expiring DVC Points | PixieDVC",
  description:
    "Manual review support for DVC owners with expiring points or reservations they need to move quickly.",
};

const trustIndicators = [
  "Manual Review",
  "No Obligation",
  "Owner Verification Required",
  "Newsletter Promotion",
  "Best submitted 30–180 days before expiration",
];
const helpMoments = [
  "Points expiring soon",
  "Last-minute schedule changes",
  "Reservation no longer needed",
  "Looking for additional exposure",
  "Seeking faster placement support",
];
const newsletterBenefits = [
  "Email newsletters",
  "Featured promotions",
  "Featured owner stays",
  "Targeted outreach campaigns",
];
const steps = [
  { title: "Tell us what you have", body: "Share your points, home resort, or confirmed reservation details." },
  { title: "Tell us when it expires", body: "We need timing context to understand urgency and possible placement paths." },
  {
    title: "Tell us what you’d like to receive",
    body: "Let us know what you hope to receive so we can assess whether the opportunity is realistic.",
  },
  {
    title: "PixieDVC reviews demand",
    body: "Our team reviews your resort, expiration date, stay details, and target payout.",
  },
  {
    title: "We May Feature Your Stay",
    body: "If it is a good fit, we may feature your stay through PixieDVC newsletters, owner channels, and other marketing initiatives designed to reach Disney travelers.",
  },
  {
    title: "You decide whether to move forward",
    body: "If interest is generated, you remain in control and decide whether to move forward.",
  },
];

const disclosures = [
  "Submitting a request does not guarantee placement, promotion, or a completed rental.",
  "Owner verification may be required.",
  "We review each request individually.",
  "Selected stays may be featured through newsletters, promotional campaigns, or other marketing channels based on demand, timing, and travel dates.",
  "Nothing moves forward without your approval.",
];

const promotionChannels = [
  "Featured newsletter placements",
  "Limited-time promotions",
  "Featured owner stays",
  "Targeted outreach to Disney travelers",
  "Placement opportunities based on demand and timing",
];

export default function ExpiringPointsPage() {
  return (
    <main className="bg-[linear-gradient(180deg,#f7faff_0%,#ffffff_24%,#f6f9fe_100%)] text-[#0F2148]">
      <section className="relative overflow-hidden border-b border-[#dde7f7] bg-[radial-gradient(circle_at_top_left,rgba(41,69,132,0.16),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(217,165,58,0.18),transparent_24%),linear-gradient(180deg,#fbfdff_0%,#f4f8ff_100%)]">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.58)_48%,rgba(255,255,255,0.88)_100%)]"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20 lg:py-24">
          <div className="rounded-[40px] border border-[#dbe5f5] bg-white/82 px-7 py-10 shadow-[0_28px_70px_rgba(15,33,72,0.10)] backdrop-blur-sm sm:px-10 sm:py-12 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
              <div className="max-w-4xl">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#5f7397]">Owner Support</p>
                <h1 className="mt-5 max-w-[14ch] font-display text-4xl font-semibold leading-[1.02] text-[#0F2148] sm:text-5xl md:text-6xl">
                  Have Expiring DVC Points?
                </h1>
                <p className="mt-5 text-xl leading-8 text-[#3f5a80]">Don&apos;t let valuable points go unused.</p>
                <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#5d6f8b]">
                  If you have points approaching expiration or a reservation you can no longer use, PixieDVC may be
                  able to help by presenting select stays to our audience of Disney travelers through newsletters,
                  featured promotions, and targeted outreach.
                </p>

                <div className="mt-8 rounded-[28px] border border-[#ead39d] bg-[linear-gradient(180deg,#fffaf0_0%,#fff5dc_100%)] p-6 shadow-[0_14px_34px_rgba(217,165,58,0.12)]">
                  <p className="text-sm font-semibold text-[#8f6a20]">
                    Selected stays may be featured to our audience of Disney travelers through:
                  </p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {newsletterBenefits.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm font-medium text-[#5b4a22]">
                        <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#d9a53a] text-[11px] font-semibold text-white">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-10">
                  <Link
                    href="#request-form"
                    className="inline-flex items-center rounded-full bg-[linear-gradient(180deg,#0f2148_0%,#193466_100%)] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(15,33,72,0.22)] transition hover:-translate-y-[1px] hover:brightness-105"
                  >
                    Submit Request
                  </Link>
                </div>
              </div>

              <div className="rounded-[34px] border border-[#dbe5f5] bg-[linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] p-7 shadow-[0_22px_56px_rgba(15,33,72,0.10)]">
                <div className="inline-flex rounded-full border border-[#e4cb8d] bg-[#fff8e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#8f6a20]">
                  Trust Overview
                </div>
                <div className="mt-6 space-y-3">
                  {trustIndicators.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-[22px] border border-[#dfe8f7] bg-white px-4 py-3.5 text-sm font-medium text-[#21406f] shadow-[0_8px_20px_rgba(15,33,72,0.04)]"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#d9a53a]/16 text-[#b58522]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#d9a53a]" />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5f7397]">Why Owners Contact Us</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F2148] sm:text-4xl">
            When This Can Help
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {helpMoments.map((item) => (
            <div
              key={item}
              className="rounded-[30px] border border-[#dbe5f5] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-6 shadow-[0_18px_44px_rgba(15,33,72,0.08)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(180deg,#fff8e8_0%,#f6edd2_100%)] ring-1 ring-[#ead39d]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#d9a53a]" />
              </div>
              <p className="mt-4 text-lg font-semibold leading-7 text-[#0F2148]">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5f7397]">How It Works</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F2148] sm:text-4xl">How It Works</h2>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-[32px] border border-[#dbe5f5] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-7 shadow-[0_18px_44px_rgba(15,33,72,0.08)]"
            >
              <div className="text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#d9a53a]">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="mt-4 h-px w-14 bg-[linear-gradient(90deg,#d9a53a_0%,rgba(217,165,58,0)_100%)]" />
              <h3 className="mt-4 text-xl font-semibold text-[#0F2148]">{step.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#5d6f8b]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="request-form" className="scroll-mt-32 border-y border-[#dde7f7] bg-[linear-gradient(180deg,#fbfdff_0%,#f6f9ff_100%)]">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5f7397]">Owner Request Form</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F2148] sm:text-4xl">
                Concierge-Led Review
              </h2>
              <p className="mt-4 max-w-xl text-[16px] leading-8 text-[#5d6f8b]">
                This is a selective, manual review process. PixieDVC does not automatically list every request. We
                review timing, resort demand, travel dates, and owner expectations before recommending next steps.
              </p>
              <div className="mt-8 rounded-[30px] border border-[#dbe5f5] bg-white/80 p-6 shadow-[0_18px_44px_rgba(15,33,72,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#5f7397]">
                  How Promotion Works
                </p>
                <div className="mt-4 space-y-3 text-[15px] leading-7 text-[#5d6f8b]">
                  <p>
                    Unlike a traditional marketplace listing, selected stays may receive additional
                    exposure through:
                  </p>
                  <ul className="space-y-3 pt-1">
                    {promotionChannels.map((item) => (
                      <li key={item} className="flex gap-3">
                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d9a53a]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>This approach can help generate visibility for stays that require faster action.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[38px] border border-[#dbe5f5] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-6 shadow-[0_28px_70px_rgba(15,33,72,0.12)] sm:p-8 md:p-9">
              <ExpiringPointsRequestForm />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="rounded-[34px] border border-[#dbe5f5] bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] p-8 shadow-[0_22px_56px_rgba(15,33,72,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5f7397]">Important Information</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#0F2148]">Important Information</h2>
          <ul className="mt-6 space-y-4 text-[15px] leading-7 text-[#5d6f8b]">
            {disclosures.map((item) => (
              <li key={item} className="flex gap-4 rounded-[22px] border border-[#e4ecf8] bg-white px-4 py-3.5">
                <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#d9a53a]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-[#0f2148]/10 bg-[radial-gradient(circle_at_top_right,rgba(217,165,58,0.18),transparent_22%),linear-gradient(135deg,#0f2148_0%,#17325f_54%,#102554_100%)] px-8 py-14 text-center text-white shadow-[0_30px_70px_rgba(15,33,72,0.22)]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/62">Owner Support</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Need Help Before Your Points Expire?
          </h2>
          <p className="mt-4 text-base leading-8 text-white/78">
            Tell us what you have and we&apos;ll review whether your stay may be a good fit for newsletter promotion and other marketing support.
          </p>
          <div className="mt-8">
            <Link
              href="#request-form"
              className="inline-flex items-center rounded-full bg-[linear-gradient(180deg,#f5c965,#d9a53a)] px-6 py-3 text-sm font-semibold text-[#102554] shadow-[0_18px_36px_rgba(217,165,58,0.26)] transition hover:brightness-105"
            >
              Submit Request
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
