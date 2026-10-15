import Link from "next/link";

import type { getFoundingOwnerEnrollmentCopy } from "@/lib/founding-owner-launch";
import type { getFoundingOwnerOfferDisplay } from "@/lib/founding-owner-bonus";

type Props = {
  schedule: ReturnType<typeof getFoundingOwnerEnrollmentCopy>;
  offer: ReturnType<typeof getFoundingOwnerOfferDisplay>;
};

export default function FoundingOwnerPromoPanel({ schedule, offer }: Props) {
  return (
    <div className="grid items-start gap-7 lg:grid-cols-2 lg:gap-x-12 lg:gap-y-5">
      <div className="lg:col-start-1 lg:row-start-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#5c6f98]">FOUNDING OWNER LAUNCH</p>
        <h2 id="founding-owner-benefit" className="mt-4 max-w-[18ch] text-3xl font-semibold leading-tight text-[#0F2148] sm:text-4xl">
          Get more from your unused DVC points.
        </h2>
        <p className="mt-4 max-w-[56ch] text-base leading-7 text-[#405170]">
          Become a HannaDVC Founding Owner. You keep control of your membership and approve each booking. We handle guest communication and coordinate the rental process.
        </p>
      </div>

      <div className="min-w-0 rounded-[26px] border border-[#D6B45A]/40 bg-[radial-gradient(circle_at_top_left,rgba(214,180,90,0.18),transparent_44%),linear-gradient(155deg,#0b1b3a_0%,#17325f_100%)] p-6 text-white shadow-[0_20px_48px_rgba(15,33,72,0.16)] sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <p className="text-4xl font-bold leading-tight tracking-tight text-[#F4D47F] sm:text-5xl">
          +{offer.amount} <span className="text-2xl font-semibold text-white sm:text-3xl">per rented point</span>
        </p>
        <p className="mt-2 text-xl font-semibold text-white">For your first {offer.durationYears} years</p>
        <p className="mt-2 text-sm leading-6 text-white/85">Above HannaDVC’s standard owner payout.</p>

        <p className="mt-6 rounded-2xl border border-[#D6B45A]/40 bg-[#D6B45A]/12 px-4 py-4 text-xl font-semibold leading-snug text-[#F4D47F] sm:text-2xl">
          {offer.example}
        </p>

        <ul className="mt-6 space-y-2 border-t border-white/20 pt-5 text-sm leading-6 text-white/90">
          <li>You approve every booking.</li>
          <li>We handle guest communication.</li>
        </ul>
        <p className="mt-5 text-xs leading-5 text-white/75">Rental placement is not guaranteed.</p>
      </div>

      <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
        <Link
          href="/owner/onboarding"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#0F2148] px-6 py-3 text-center text-sm font-semibold !text-white transition hover:bg-[#1d3d73] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F2148] sm:w-auto"
        >
          Apply as a Founding Owner
        </Link>
        <p className="mt-3 max-w-[56ch] text-sm leading-6 text-[#53627e]">
          {schedule.timing ?? schedule.eligibility}
        </p>
      </div>
    </div>
  );
}
