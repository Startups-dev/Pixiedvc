import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";

export default function PlanLandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <main className="mx-auto max-w-6xl px-6 py-16 font-sans">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            How do you want to book your Disney stay?
          </h1>
          <p className="text-sm font-medium text-muted">
            Three ways to book, pick what fits you best.
          </p>
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login?next=/plan" className="font-semibold text-ink underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </section>

        <Suspense fallback={null}>
          <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <ReferralLink
              href="/ready-stays"
              className="group flex h-full flex-col items-center justify-between rounded-lg border border-ink/50 bg-white p-6 text-center shadow-[0_12px_34px_rgba(15,33,72,0.12)] transition hover:border-ink/55 hover:shadow-[0_12px_34px_rgba(15,33,72,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <div className="space-y-3">
                <p className="inline-flex w-fit rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-700">
                  Fastest
                </p>
                <h2 className="text-2xl font-semibold text-ink">Book instantly</h2>
                <p className="text-sm font-medium text-muted">
                  See confirmed stays available right now. No waiting or matching required.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <span>View available stays</span>
                </Button>
              </div>
            </ReferralLink>

            <ReferralLink
              href="/plan/resorts"
              className="group flex h-full flex-col items-center justify-between rounded-lg border border-ink/35 bg-white p-6 text-center transition hover:border-ink/45 hover:shadow-[0_10px_30px_rgba(15,33,72,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-ink">I know what I want</h2>
                <p className="text-sm font-medium text-muted">
                  Enter your dates and resort. We will match you quickly with verified owners.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <span>Start my request</span>
                </Button>
              </div>
            </ReferralLink>

            <ReferralLink
              href="/plan/guided"
              className="group flex h-full flex-col items-center justify-between rounded-lg border border-ink/35 bg-white p-6 text-center transition hover:border-ink/45 hover:shadow-[0_10px_30px_rgba(15,33,72,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-ink">Help me choose</h2>
                <p className="text-sm font-medium text-muted">
                  Answer a few questions and we will recommend the best resorts for your trip.
                </p>
              </div>
              <div className="mt-6">
                <Button asChild>
                  <span>Start guided planning</span>
                </Button>
              </div>
            </ReferralLink>
          </section>
          <p className="mt-6 text-sm font-medium text-muted">Verified owners, Secure booking, Concierge support</p>
        </Suspense>
      </main>
    </div>
  );
}
