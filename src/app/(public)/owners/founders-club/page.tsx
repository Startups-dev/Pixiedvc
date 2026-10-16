import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import FoundersBonusCalculator from "@/components/founding-owner/FoundersBonusCalculator";
import FoundersJourneyLink from "@/components/founding-owner/FoundersJourneyLink";
import { FOUNDING_OWNER_BONUS_TERM_YEARS } from "@/lib/founding-owner-bonus";
import { getFoundingOwnerEnrollmentCopy, shouldShowFoundingOwnerLaunch } from "@/lib/founding-owner-launch";
import { getActivePromotion } from "@/lib/pricing-promotions";
import { resolveResortImage } from "@/lib/resort-image";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Founding Owners | HannaDVC",
  description: "Explore the HannaDVC Founding Owner launch and learn how the additional $2 per rented point works.",
  alternates: { canonical: "/owners/founders-club" },
};

const signupClass = "inline-flex min-h-12 items-center justify-center rounded-full bg-[#d7b462] px-7 py-3 text-center text-sm font-bold text-[#102345] transition hover:bg-[#f0d18a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const headingClass = "font-semibold tracking-tight text-[#102345]";

function Signup({ active, children }: { active: boolean; children?: React.ReactNode }) {
  return (
    <Suspense fallback={<Link href="/owner/onboarding" className={signupClass}>{children ?? (active ? "Join as a Founding Owner" : "Sign up as an owner")}</Link>}>
      <FoundersJourneyLink href="/owner/onboarding" className={signupClass}>
        {children ?? (active ? "Join as a Founding Owner" : "Sign up as an owner")}
      </FoundersJourneyLink>
    </Suspense>
  );
}

export default async function FoundersClubPage() {
  const adminClient = getSupabaseAdminClient();
  const promotion = adminClient ? (await getActivePromotion({ adminClient })).data : null;
  const active = shouldShowFoundingOwnerLaunch(promotion);
  const schedule = active && promotion ? getFoundingOwnerEnrollmentCopy(promotion) : null;
  const floridian = resolveResortImage({ resortSlug: "grand-floridian-villas", imageIndex: 1 }).url;
  const riviera = resolveResortImage({ resortSlug: "riviera-resort", imageIndex: 1 }).url;

  const faqs = active ? [
    { question: "Do I need a separate Founders application?", answer: "No. Use HannaDVC’s regular owner signup. The Founding Owner benefit is granted when eligible owners complete onboarding while the launch promotion is active." },
    { question: "Is the bonus above every broker’s rate?", answer: "The additional $2 per rented point is above HannaDVC’s standard owner payout. You can review the full payout before approving a booking." },
    { question: "Is there a cap or a rental exclusion?", answer: "No. The additional $2 applies to every point rented through HannaDVC during your two-year benefit period. There is no bonus cap or category of excluded rentals." },
    { question: "When does my two-year benefit begin?", answer: "It begins when the Founding Owner benefit is granted during eligible enrollment, and runs for two years from that date." },
    { question: "How and when am I paid?", answer: "You see the payout and its schedule before you approve a booking. Payment timing follows the terms for that reservation; it is not necessarily at check-in." },
    { question: "Do I give HannaDVC access to my Disney account?", answer: "No. You keep control of your DVC membership and make approved reservations through your own account." },
    { question: "What happens when enrollment closes?", answer: "Owners already granted the benefit keep it for their individual two-year period. New owners may still sign up through the regular owner flow, without the Founding Owner bonus." },
    { question: "Are rentals guaranteed?", answer: "No. Rental placement depends on guest demand and the points or reservation you offer." },
  ] : [
    { question: "Can I still sign up as an owner?", answer: "Yes. Regular owner signup remains open. New signups do not receive the closed Founding Owner launch bonus." },
    { question: "What happens to existing Founding Owners?", answer: "Owners who were granted the benefit while enrollment was active keep their additional $2 per rented point for their own two-year benefit period." },
    { question: "Are rentals guaranteed?", answer: "No. Rental placement depends on guest demand and the points or reservation you offer." },
  ];

  return (
    <div className="overflow-x-clip bg-[#f8f5ee]">
      <section className="relative isolate overflow-hidden bg-[#091a36] text-white">
        <Image src="/images/hero-new.png" alt="Guests walking toward a resort at sunset" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,18,42,0.88)_0%,rgba(7,23,50,0.75)_46%,rgba(7,23,50,0.44)_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:py-32">
          <div className="max-w-[620px]">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f0ce7c]">Founding Owner Launch</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight !text-white sm:text-5xl lg:text-[4.2rem]">
              {active ? "Your unused points. A little more rewarding." : "Founding Owner enrollment has closed."}
            </h1>
            <p className="mt-6 max-w-[54ch] text-base leading-8 text-white/90 sm:text-lg">
              {active
                ? "Join HannaDVC as a Founding Owner and earn an extra $2 for every point rented through us during your first two years. You approve each booking; we coordinate the rental."
                : "Existing Founding Owners keep their two-year benefits. You can still join HannaDVC through regular owner signup."}
            </p>
            <div className="mt-8"><Signup active={active} /></div>
            {schedule ? <p className="mt-4 text-sm font-medium text-white/85">{schedule.timing ?? schedule.eligibility}</p> : null}
          </div>
          {active ? (
            <div className="min-w-0 rounded-[28px] border border-[#d7b462]/60 bg-[#0c2044]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f0ce7c]">Your Founding Owner bonus</p>
              <p className="mt-5 text-4xl font-bold leading-tight tracking-tight text-[#f0ce7c] sm:text-5xl">+$2 <span className="text-2xl text-white sm:text-3xl">per rented point</span></p>
              <p className="mt-3 text-xl font-semibold">For your first {FOUNDING_OWNER_BONUS_TERM_YEARS} years</p>
              <p className="mt-2 text-sm leading-6 text-white/85">Above HannaDVC’s standard owner payout.</p>
              <p className="mt-7 rounded-2xl border border-[#d7b462]/45 bg-[#d7b462]/10 p-5 text-xl font-semibold text-[#f0ce7c] sm:text-2xl">300 rented points = $600 extra.</p>
              <p className="mt-6 text-sm leading-6 text-white/85">Every point rented during your benefit period earns the bonus. No bonus cap. Rental placement is not guaranteed.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-[#d9d1bd] bg-white px-5 py-6 text-[#102345] sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 text-sm font-semibold sm:grid-cols-3 sm:gap-8">
          <p>You keep control of your membership.</p><p>You approve every booking.</p><p>We handle guest communication.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-16 sm:px-8 lg:grid-cols-2">
        <article className="overflow-hidden rounded-[24px] bg-[#102345] text-white">
          <div className="relative h-64 sm:h-80"><Image src={floridian} alt="Grand Floridian Villas resort" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" /></div>
          <div className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0ce7c]">Your membership</p><h2 className="mt-2 text-2xl font-semibold !text-white">Your decision.</h2><p className="mt-2 text-sm leading-6 text-white/85">Keep control of your DVC points and approve each booking.</p></div>
        </article>
        <article className="overflow-hidden rounded-[24px] bg-[#102345] text-white">
          <div className="relative h-64 sm:h-80"><Image src={riviera} alt="Riviera Resort grounds" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" /></div>
          <div className="p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0ce7c]">Less to manage</p><h2 className="mt-2 text-2xl font-semibold !text-white">Leave the coordination to us.</h2><p className="mt-2 text-sm leading-6 text-white/85">HannaDVC handles guest communication throughout the rental process.</p></div>
        </article>
      </section>

      <section className="bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b742b]">Simple from the start</p>
          <h2 className={`mt-3 max-w-[18ch] text-3xl sm:text-4xl ${headingClass}`}>You bring the points. We coordinate the rental.</h2>
          <div className="mt-11 grid gap-5 lg:grid-cols-3">
            {[
              { number: "01", title: "Tell us about your points", body: "Use regular owner signup to share your home resort, available points, and expiration details." },
              { number: "02", title: "Review each opportunity", body: "See the request and full payout before you approve. You make the reservation through your own DVC membership." },
              { number: "03", title: "Receive your payout", body: active ? "For points rented during your two-year benefit, your payout includes the extra $2 per point." : "Review your payout and payment schedule before accepting a booking." },
            ].map((step) => <article key={step.number} className="rounded-[22px] border border-[#ded8c9] bg-[#faf8f2] p-7"><p className="text-xl font-semibold text-[#b58b3a]">{step.number}</p><h3 className="mt-6 text-xl font-semibold text-[#102345]">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[#53617a]">{step.body}</p></article>)}
          </div>
        </div>
      </section>

      {active ? <section className="px-5 py-20 sm:px-8"><div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b742b]">See the difference</p><h2 className={`mt-3 text-3xl sm:text-4xl ${headingClass}`}>What could your bonus add up to?</h2><p className="mt-5 max-w-[45ch] leading-7 text-[#53617a]">The extra $2 is on top of your standard owner payout. Explore an example using points rented during your benefit period.</p></div><FoundersBonusCalculator /></div></section> : null}

      <section className="bg-white px-5 py-20 sm:px-8"><div className="mx-auto max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b742b]">Owner FAQs</p><h2 className={`mt-3 text-3xl sm:text-4xl ${headingClass}`}>A few things to know.</h2><div className="mt-9 divide-y divide-[#ded8c9] border-y border-[#ded8c9]">{faqs.map((faq) => <details key={faq.question} className="group py-1"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-semibold text-[#102345] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#102345]"><span>{faq.question}</span><span aria-hidden="true" className="text-2xl font-light group-open:rotate-45">+</span></summary><p className="max-w-[70ch] pb-5 text-sm leading-7 text-[#53617a]">{faq.answer}</p></details>)}</div></div></section>

      <section className="bg-[#102345] px-5 py-20 text-white sm:px-8"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#f0ce7c]">HannaDVC owners</p><h2 className="mt-4 text-3xl font-semibold tracking-tight !text-white sm:text-4xl">{active ? "Make your next rental more rewarding." : "Make more of your DVC membership."}</h2><p className="mx-auto mt-5 max-w-[55ch] leading-7 text-white/85">{active ? "Extra earnings. Clear payout terms. Your membership stays in your hands." : "Regular owner signup remains available. You stay in control of your membership and approve every booking."}</p><div className="mt-8"><Signup active={active} /></div>{schedule ? <p className="mt-4 text-sm text-white/80">{schedule.timing ?? schedule.eligibility}</p> : null}<p className="mt-7 text-sm text-white/75">Want to learn about regular renting? <Link href="/owners" className="font-semibold underline underline-offset-4 hover:text-[#f0ce7c]">Explore owner options</Link>.</p></div></section>
    </div>
  );
}
