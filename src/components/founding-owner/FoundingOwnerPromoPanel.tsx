import Link from "next/link";

import type { getFoundingOwnerEnrollmentCopy } from "@/lib/founding-owner-launch";
import type { getFoundingOwnerOfferDisplay } from "@/lib/founding-owner-bonus";

type Props = {
  schedule: ReturnType<typeof getFoundingOwnerEnrollmentCopy>;
  offer: ReturnType<typeof getFoundingOwnerOfferDisplay>;
};

export default function FoundingOwnerPromoPanel({ schedule, offer }: Props) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[#D6B45A]/40 bg-[radial-gradient(circle_at_top_left,rgba(214,180,90,0.18),transparent_38%),linear-gradient(155deg,#0b1b3a_0%,#17325f_58%,#1d457e_100%)] p-6 text-white shadow-[0_28px_70px_rgba(15,33,72,0.18)] sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E8CF8B]">EARN MORE FROM YOUR POINTS</p>
        <span className="inline-flex max-w-full rounded-full border border-[#D6B45A]/60 bg-[#D6B45A]/12 px-4 py-2 text-center text-xs font-semibold tracking-[0.12em] text-[#F1D992]">
          {schedule.badge}
        </span>
      </div>

      <h2 id="founding-owner-benefit" className="mt-8 flex flex-wrap items-baseline gap-x-3 gap-y-1 leading-tight !text-white">
        <span className="text-5xl font-bold tracking-tight text-[#F4D47F] sm:text-6xl">+{offer.amount}</span>
        <span className="text-3xl font-semibold tracking-tight sm:text-4xl">per rented point</span>
      </h2>
      <p className="mt-3 text-2xl font-semibold text-white">For your first {offer.durationYears} years</p>
      <p className="mt-2 text-base leading-7 text-white/80">Above HannaDVC’s standard owner payout.</p>

      <div className="mt-7 rounded-2xl border border-[#D6B45A]/40 bg-[#D6B45A]/12 px-5 py-5">
        <p className="text-2xl font-semibold leading-snug text-[#F4D47F] sm:text-3xl">{offer.example}</p>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/78">
        Bonus applies to qualifying rentals. Rental placement is not guaranteed.
      </p>

      <div className="mt-9 border-t border-white/15 pt-7">
        <h3 className="text-xl font-semibold !text-white">Matches suited to your points</h3>
        <p className="mt-2 text-base leading-7 text-white/78">
          We look for guest requests that fit your resort, available points, and booking window. You choose which opportunities to accept.
        </p>
      </div>

      <div className="mt-7 border-t border-white/15 pt-7">
        <h3 className="text-xl font-semibold !text-white">We handle the guest communication</h3>
        <p className="mt-2 text-base leading-7 text-white/78">
          You keep control of your membership and approve each booking. HannaDVC coordinates the guest communication and rental process.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm text-white/90">
          {[
            "Clear payout before you accept",
            "Concierge support throughout",
            "Founding Owner recognition",
          ].map((item) => (
            <li key={item} className="rounded-full border border-white/15 bg-white/[0.07] px-4 py-2.5">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-9 border-t border-white/15 pt-7">
        <Link
          href="/owner/onboarding"
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-6 py-3 text-center text-sm font-semibold !text-[#0B1F44] shadow-[0_12px_28px_rgba(2,6,23,0.18)] transition hover:bg-[#EDF3FF] hover:!text-[#0B1F44] sm:w-auto"
        >
          Apply as a Founding Owner
        </Link>
        <div className="mt-5 space-y-1 text-sm leading-6 text-white/72">
          <p>{schedule.eligibility}</p>
          {schedule.timing ? <p>{schedule.timing}</p> : null}
        </div>
      </div>
    </div>
  );
}
