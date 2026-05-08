import Link from "next/link";
import type { Metadata } from "next";

import { Card } from "@pixiedvc/design-system";

export const metadata: Metadata = {
  title: "Deferred Cancellation Policy",
  description:
    "Pixie DVC’s Deferred Cancellation Policy, including eligibility schedule and terms.",
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
    <main className="bg-[#f8f6f2] text-[#0F2148]">
      <section className="mx-auto max-w-5xl px-6 pb-8 pt-16 md:pt-20">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.24em] text-[#6f7683]">Policy</p>
          <h1 className="text-[38px] font-semibold leading-tight text-[#06080d] sm:text-[52px]">
            Deferred Cancellation Policy
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-8 px-6 pb-20">
        <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <div className="space-y-4 text-[16px] leading-7 text-[#5f6673]">
            <p className="font-medium text-[#30405f]">
              If your plans change, you may be eligible for a travel credit depending on how far in advance you cancel.
            </p>
            <p>
              PixieDVC bookings use owner points, which limits refunds but allows structured flexibility through credits
              and rebooking options.
            </p>
            <p>
              Eligibility, credit value, and usage are determined by Pixie DVC based on the scheduled arrival date and
              the terms outlined below.
            </p>
            <p>
              Review our{" "}
              <Link href="/guests/cancellation-policy" className="font-semibold text-[#0F2148] underline underline-offset-4">
                Cancellation Policy
              </Link>{" "}
              for the broader cancellation and changes framework.
            </p>
          </div>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-[#f7f9fc] p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <div className="space-y-4">
            <h2 className="text-[30px] font-semibold leading-tight text-[#06080d]">Cancellation Schedule</h2>
            <p className="text-[16px] leading-7 text-[#5f6673]">
              The earlier you cancel, the more value you may recover as credit.
            </p>
            <div className="overflow-hidden rounded-xl border border-[#0F2148]/8 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#eef3fb] text-xs uppercase tracking-[0.2em] text-[#6f7683]">
                  <tr>
                    <th className="px-4 py-3">Cancellation Approved</th>
                    <th className="px-4 py-3">Deferred Cancellation Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row) => (
                    <tr key={row.window} className="border-t border-[#0F2148]/8">
                      <td className="px-4 py-3 text-[#30405f]">{row.window}</td>
                      <td className="px-4 py-3 text-[#30405f]">{row.credit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <div className="space-y-4">
            <h2 className="text-[30px] font-semibold leading-tight text-[#06080d]">Policy Terms</h2>
            <ul className="list-disc space-y-2 pl-5 text-[16px] leading-7 text-[#5f6673]">
              <li>Are issued at Pixie DVC’s discretion</li>
              <li>Have no cash value and are non-refundable</li>
              <li>Are non-transferable</li>
              <li>May be subject to expiration</li>
              <li>May only be applied to future Pixie DVC reservations</li>
              <li>Cannot be combined with other promotions or credits unless explicitly stated</li>
            </ul>
            <p className="text-[16px] leading-7 text-[#5f6673]">
              Pixie DVC reserves the right to modify or discontinue this policy at any time.
            </p>
            <p className="text-[16px] leading-7 text-[#5f6673]">The version published on this page governs all reservations.</p>
          </div>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-white p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <div className="space-y-4">
            <h2 className="text-[30px] font-semibold leading-tight text-[#06080d]">Examples</h2>
            <div className="space-y-3 text-[16px] leading-7 text-[#5f6673]">
              <p>
                <span className="font-semibold text-[#30405f]">Example 1:</span> A guest cancels a reservation 90 days before check-in.
                The guest may receive a Deferred Cancellation Credit equal to 75% of the reservation price.
              </p>
              <p>
                <span className="font-semibold text-[#30405f]">Example 2:</span> A guest cancels 10 days before check-in. The
                reservation is not eligible for a Deferred Cancellation Credit.
              </p>
            </div>
          </div>
        </Card>

        <Card className="rounded-xl border border-[#0F2148]/8 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7fb_100%)] p-8 shadow-[0_18px_44px_rgba(15,33,72,0.08)]">
          <div className="space-y-4">
            <h2 className="text-[30px] font-semibold leading-tight text-[#06080d]">Disclaimer</h2>
            <p className="text-[16px] leading-7 text-[#5f6673]">This policy applies only where explicitly referenced.</p>
            <p className="text-[16px] leading-7 text-[#5f6673]">
              Pixie DVC makes no guarantee that a travel credit will be issued under this policy unless all eligibility
              conditions are met.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
