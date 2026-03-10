import DiningPlanCalculator from "@/components/dining/DiningPlanCalculator";

export default function DiningPlanPage() {
  return (
    <div className="min-h-screen bg-white text-[#0F2148]">
      <main className="mx-auto max-w-5xl px-6 py-16">
        <section className="space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-[#0F2148] sm:text-4xl">Disney Dining Plans</h1>
          <p className="text-base text-[#0F2148]/80">
            A stay booked through PixieDVC secures your Disney Vacation Club villa accommodation. Dining plans are
            optional add-ons that can be coordinated after your reservation is confirmed.
          </p>
        </section>

        <section className="mt-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">Can I add a dining plan to a DVC reservation?</h2>
            <ul className="space-y-2 text-sm text-[#0F2148]/80">
              <li>• Yes. Eligible Walt Disney World DVC stays can add a Disney Dining Plan after the stay is secured.</li>
              <li>• Because the reservation belongs to a DVC owner, the owner must add the plan through Member Services.</li>
              <li>• PixieDVC can coordinate that request once your reservation is confirmed.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">Important requirements</h2>
            <ul className="space-y-2 text-sm text-[#0F2148]/80">
              <li>• Dining plans must be added for every guest on the reservation.</li>
              <li>• The plan must cover the full length of stay.</li>
              <li>• Requests should be made at least 30 days before check-in.</li>
            </ul>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#0F2148]/10 bg-white p-5">
              <h3 className="text-lg font-semibold text-[#0F2148]">Quick-Service Dining Plan</h3>
              <p className="mt-2 text-sm text-[#0F2148]/75">Per guest, per night of stay:</p>
              <ul className="mt-3 space-y-2 text-sm text-[#0F2148]/80">
                <li>• 2 quick-service meals</li>
                <li>• 1 snack or non-alcoholic drink</li>
                <li>• 1 resort refillable mug</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#0F2148]/10 bg-white p-5">
              <h3 className="text-lg font-semibold text-[#0F2148]">Disney Dining Plan</h3>
              <p className="mt-2 text-sm text-[#0F2148]/75">Per guest, per night of stay:</p>
              <ul className="mt-3 space-y-2 text-sm text-[#0F2148]/80">
                <li>• 1 table-service meal</li>
                <li>• 1 quick-service meal</li>
                <li>• 1 snack or non-alcoholic drink</li>
                <li>• 1 resort refillable mug</li>
              </ul>
            </div>
          </div>

          <DiningPlanCalculator />

          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[#0F2148]">How to add a dining plan</h2>
            <ol className="space-y-2 text-sm text-[#0F2148]/80">
              <li>1. Contact PixieDVC after your reservation is confirmed.</li>
              <li>2. We coordinate with the DVC owner to add the selected plan.</li>
              <li>3. Payment is collected securely by phone and must be paid in full when added.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-[#0F2148]/10 bg-[#0F2148]/5 p-5 text-sm text-[#0F2148]/80">
            Credits roll over during your stay and expire at midnight on checkout day. Gratuities are not included.
            Disney pricing and policy rules can change.
          </div>
        </section>
      </main>
    </div>
  );
}
