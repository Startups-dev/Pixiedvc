import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deferred Cancellation Credit Policy",
  description:
    "Pixie DVC’s Deferred Cancellation Credit Policy, including eligibility schedule and terms.",
};

const schedule = [
  {
    window: "More than 120 days before check-in",
    credit: "100% of total reservation price (minus the non-refundable deposit)",
  },
  {
    window: "120–61 days before check-in",
    credit: "75% of total reservation price",
  },
  {
    window: "60–31 days before check-in",
    credit: "50% of total reservation price",
  },
  {
    window: "30–15 days before check-in",
    credit: "25% of total reservation price",
  },
  {
    window: "Less than 15 days before check-in",
    credit: "0% – All sales final",
  },
];

export default function DeferredCancellationPolicyPage() {
  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-4xl px-6 pb-8 pt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">Policy</p>
        <h1 className="mt-3 text-4xl font-serif sm:text-5xl">Deferred Cancellation Credit Policy</h1>
      </section>

      <section className="mx-auto max-w-4xl space-y-8 px-6 pb-16">
        <div className="space-y-3 text-sm leading-6 text-[#0F2148]/80">
          <p>This reservation may be eligible for Pixie DVC’s Deferred Cancellation Credit Policy.</p>
          <p>
            Eligibility, credit value, and usage are determined by Pixie DVC based on the scheduled arrival date and
            the terms outlined below.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#0F2148]">Cancellation Schedule</h2>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cancellation Approved</th>
                  <th className="px-4 py-3">Deferred Cancellation Credit</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.window} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">{row.window}</td>
                    <td className="px-4 py-3 text-slate-700">{row.credit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Policy Terms</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Are issued at Pixie DVC’s discretion</li>
            <li>Have no cash value and are non-refundable</li>
            <li>Are non-transferable</li>
            <li>May be subject to expiration</li>
            <li>May only be applied to future Pixie DVC reservations</li>
            <li>Cannot be combined with other promotions or credits unless explicitly stated</li>
          </ul>
          <p className="text-sm text-[#0F2148]/80">
            Pixie DVC reserves the right to modify or discontinue this policy at any time.
          </p>
          <p className="text-sm text-[#0F2148]/80">The version published on this page governs all reservations.</p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Examples</h2>
          <div className="space-y-2 text-sm text-[#0F2148]/80">
            <p>
              <span className="font-semibold">Example 1:</span> A guest cancels a reservation 90 days before check-in.
              The guest may receive a Deferred Cancellation Credit equal to 75% of the reservation price.
            </p>
            <p>
              <span className="font-semibold">Example 2:</span> A guest cancels 10 days before check-in. The
              reservation is not eligible for a Deferred Cancellation Credit.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Disclaimer</h2>
          <p className="text-sm text-[#0F2148]/80">This policy applies only where explicitly referenced.</p>
          <p className="text-sm text-[#0F2148]/80">
            Pixie DVC makes no guarantee that a Deferred Cancellation Credit will be issued unless all eligibility
            conditions are met.
          </p>
        </div>
      </section>
    </main>
  );
}
