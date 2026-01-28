import { Suspense } from "react";
import Link from "next/link";
import ReferralLink from "@/components/referral/ReferralLink";

import { Button } from "@pixiedvc/design-system";

export default function DiningPlanPage() {
  return (
    <div className="min-h-screen bg-white text-[#0F2148]">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-[#0F2148] sm:text-4xl">Disney Dining Plans</h1>
          <p className="text-base text-[#0F2148]/80">
            A Disney Dining Plan bundles meals and snacks into a single per-night price. It can simplify budgeting and
            help you plan meals in advance for your vacation.
          </p>
        </section>

        <section className="mt-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">What’s included</h2>
            <ul className="space-y-2 text-sm text-[#0F2148]/80">
              <li>• Quick-Service Dining Plan: quick-service meals and snacks each night.</li>
              <li>• Disney Dining Plan: table-service meals plus quick-service meals and snacks.</li>
              <li>• All plans vary by resort and are governed by Disney’s current rules.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">How it works for PixieDVC rentals</h2>
            <ul className="space-y-2 text-sm text-[#0F2148]/80">
              <li>• Dining Plans are added after your reservation is secured.</li>
              <li>• A DVC owner must call Disney to add the plan to the booking.</li>
              <li>• Availability depends on Disney inventory at the time of the request.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">What’s not included</h2>
            <ul className="space-y-2 text-sm text-[#0F2148]/80">
              <li>• Tips and gratuity.</li>
              <li>• Specialty dining events or add-ons not covered by the plan.</li>
              <li>• Final pricing may change before the plan is added.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[#0F2148]/10 bg-[#0F2148]/5 p-5 text-sm text-[#0F2148]/80">
            Dining plan pricing is set by Disney and may change. Plans are subject to availability and can only be added
            after your reservation is confirmed.
          </div>
        </section>

        <div className="mt-10">
          <Suspense fallback={null}>
            <Button asChild>
              <ReferralLink href="/calculator">Return to calculator</ReferralLink>
            </Button>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
