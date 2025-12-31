import { Button } from "@pixiedvc/design-system";
import ReferralLink from "@/components/referral/ReferralLink";

export default function PlanLandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <main className="mx-auto max-w-6xl px-6 py-16 font-sans">
        <section className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            How would you like to plan your stay?
          </h1>
          <p className="text-sm font-medium text-muted">
            Choose the fastest path — you can change anytime.
          </p>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <ReferralLink
            href="/plan/guided"
            className="group flex h-full flex-col items-center justify-between rounded-lg border border-ink/35 bg-white p-6 text-center transition hover:border-ink/45 hover:shadow-[0_10px_30px_rgba(15,33,72,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-ink">Help me choose</h2>
              <p className="text-sm font-medium text-muted">
                We’ll recommend resorts based on your travel style.
              </p>
            </div>
            <div className="mt-6">
              <Button asChild>
                <span>Start guided planning →</span>
              </Button>
            </div>
          </ReferralLink>

          <ReferralLink
            href="/plan/resorts"
            className="group flex h-full flex-col items-center justify-between rounded-lg border border-ink/35 bg-white p-6 text-center transition hover:border-ink/45 hover:shadow-[0_10px_30px_rgba(15,33,72,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold text-ink">Browse resorts</h2>
              <p className="text-sm font-medium text-muted">
                Explore resorts visually, then price your stay.
              </p>
            </div>
            <div className="mt-6">
              <Button asChild>
                <span>Browse resorts →</span>
              </Button>
            </div>
          </ReferralLink>
        </section>
      </main>
    </div>
  );
}
