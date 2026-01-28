// src/app/guides/link-to-disney-experience/page.tsx

import Link from "next/link";

export default function LinkToDisneyExperienceGuidePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-[0.26em] text-[#0B1B3A]/55">
            Guide
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0B1B3A]">
            Link your reservation to My Disney Experience
          </h1>
          <p className="max-w-2xl text-sm text-[#0B1B3A]/70">
            After your booking is confirmed, you can link it inside My Disney
            Experience using your confirmation number. This helps you manage
            dining, tickets, and plans in one place.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#0B1B3A]">What you need</h2>
            <ul className="mt-4 space-y-2 text-sm text-[#0B1B3A]/70">
              <li>• Your confirmation number (from PixieDVC)</li>
              <li>• The last name on the reservation</li>
              <li>• My Disney Experience app or website access</li>
            </ul>
            <div className="mt-5 rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
              <p className="text-xs text-[#0B1B3A]/65">
                Tip: You can find your confirmation number on your Trip Details
                page once your booking is confirmed.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#0B1B3A]">How to link</h2>
            <ol className="mt-4 space-y-3 text-sm text-[#0B1B3A]/70">
              <li>
                <span className="font-semibold text-[#0B1B3A]">1.</span> Open My
                Disney Experience and sign in.
              </li>
              <li>
                <span className="font-semibold text-[#0B1B3A]">2.</span> Go to{" "}
                <span className="font-semibold">My Plans</span> (or{" "}
                <span className="font-semibold">Resort Hotel</span> section).
              </li>
              <li>
                <span className="font-semibold text-[#0B1B3A]">3.</span> Choose{" "}
                <span className="font-semibold">Link a Reservation</span>.
              </li>
              <li>
                <span className="font-semibold text-[#0B1B3A]">4.</span> Enter
                your confirmation number and last name.
              </li>
              <li>
                <span className="font-semibold text-[#0B1B3A]">5.</span> Confirm
                and verify it appears in your plans.
              </li>
            </ol>
          </div>
        </section>

        <section className="rounded-2xl border border-[#0B1B3A]/10 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#0B1B3A]">
            Troubleshooting
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
              <div className="text-sm font-semibold text-[#0B1B3A]">
                “Confirmation not found”
              </div>
              <p className="mt-2 text-sm text-[#0B1B3A]/70">
                Double-check the last name spelling and try again. If it still
                fails, your reservation may not be fully ticketed/propagated yet
                — wait a bit and retry.
              </p>
            </div>

            <div className="rounded-xl border border-[#0B1B3A]/10 bg-[#0B1B3A]/[0.02] p-4">
              <div className="text-sm font-semibold text-[#0B1B3A]">
                “I don’t have my confirmation number”
              </div>
              <p className="mt-2 text-sm text-[#0B1B3A]/70">
                Open your Trip Details page in PixieDVC. If it still shows
                “Pending,” the confirmation hasn’t been assigned yet.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/guest"
              className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-sm font-semibold text-[#0B1B3A]/85 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
            >
              Make a request
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-sm font-semibold text-[#0B1B3A]/85 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
            >
              View services
            </Link>
            <Link
              href="/guides"
              className="inline-flex items-center rounded-full border border-[#0B1B3A]/15 px-4 py-2 text-sm font-semibold text-[#0B1B3A]/85 transition hover:border-[#0B1B3A]/30 hover:text-[#0B1B3A]"
            >
              Back to guides
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
