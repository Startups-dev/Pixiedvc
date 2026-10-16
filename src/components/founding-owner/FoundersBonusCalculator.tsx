"use client";

import { useState } from "react";

import { FOUNDING_OWNER_BONUS_CENTS_PER_POINT } from "@/lib/founding-owner-bonus";

export default function FoundersBonusCalculator() {
  const [points, setPoints] = useState(300);
  const bonus = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    .format((points * FOUNDING_OWNER_BONUS_CENTS_PER_POINT) / 100);

  return (
    <div className="rounded-[28px] border border-[#d9d1bd] bg-white p-6 shadow-[0_22px_60px_rgba(15,33,72,0.08)] sm:p-9">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <label htmlFor="founders-points" className="block text-sm font-semibold text-[#304466]">Points rented through HannaDVC</label>
          <p className="mt-1 text-3xl font-semibold text-[#0f2148]" aria-live="polite">{points.toLocaleString()} points</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5a6680]">Additional bonus earnings</p>
          <output htmlFor="founders-points" className="mt-1 block text-4xl font-semibold text-[#0f2148]" aria-live="polite">{bonus}</output>
        </div>
      </div>
      <input id="founders-points" className="mt-8 w-full accent-[#b58b3a]" type="range" min="100" max="1000" step="25" value={points} onChange={(event) => setPoints(Number(event.target.value))} />
      <div className="mt-1 flex justify-between text-xs text-[#59677f]"><span>100 points</span><span>1,000 points</span></div>
      <p className="mt-7 border-t border-[#d9d1bd] pt-5 text-sm leading-6 text-[#53617a]">
        Illustration only. This is the extra $2 per rented point, above the standard owner payout. Rental placement is not guaranteed. The slider range is not a program limit.
      </p>
    </div>
  );
}
