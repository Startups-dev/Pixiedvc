import Link from "next/link";

const schedule = [
  {
    window: "More than 120 days before check-in",
    credit: "100% of total reservation price (minus $99 request deposit)",
  },
  {
    window: "120-61 days before check-in",
    credit: "75% of total reservation price",
  },
  {
    window: "60-31 days before check-in",
    credit: "50% of total reservation price",
  },
  {
    window: "30-15 days before check-in",
    credit: "25% of total reservation price",
  },
  {
    window: "Fewer than 15 days before check-in",
    credit: "0% - All sales final",
  },
];

export default function PoliciesPage() {
  return (
    <main className="bg-white text-[#0F2148]">
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-12">
        <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">
          PixieDVC Flexible Cancellation Policy
        </p>
        <h1 className="mt-3 text-4xl font-serif sm:text-5xl">Flexible Cancellation Policy</h1>
        <p className="mt-3 text-sm text-[#0F2148]/70">(Draft)</p>
      </section>

      <section className="mx-auto max-w-4xl space-y-8 px-6 pb-16">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Overview</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            PixieDVC understands that plans can change. While Disney Vacation Club point rentals are traditionally
            non-refundable, PixieDVC offers a Flexible Travel Credit policy on eligible reservations to provide guests
            with added peace of mind when planning their Disney vacation.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Guests who cancel within the applicable window may receive a PixieDVC Travel Credit, which can be applied
            toward a future PixieDVC reservation.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Eligibility</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            This policy applies only to Disney Vacation Club reservations that are:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Secured through PixieDVC</li>
            <li>Successfully confirmed</li>
            <li>Paid in full</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Reservations that are not eligible under the terms of the Rental Agreement remain subject to PixieDVC’s
            standard All Sales Final policy.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">How to Request a Cancellation</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">To request a cancellation:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Contact PixieDVC by email or through your assigned Vacation Coordinator.</li>
            <li>Cancellation requests must be received and acknowledged by PixieDVC to be considered valid.</li>
            <li>
              Reservations must be unlinked from Disney platforms (including My Disney Experience, My Disneyland, or My
              Aulani) before cancellation can be completed.
            </li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            PixieDVC will confirm receipt of your cancellation request within 24 hours, excluding statutory holidays.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Guests should not assume a cancellation has been accepted until written confirmation is provided by
            PixieDVC.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-[#0F2148]">Travel Credit Schedule</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Due to the complexity of Disney Vacation Club point usage, the value of any PixieDVC Travel Credit is
            determined by the timing of the cancellation relative to the scheduled check-in date:
          </p>
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cancellation Approved</th>
                  <th className="px-4 py-3">PixieDVC Travel Credit</th>
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
          <div className="space-y-2 text-sm text-[#0F2148]/80">
            <p>Important notes:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>The $99 refundable request deposit becomes non-refundable once a reservation is confirmed.</li>
              <li>Travel Credits apply only to amounts paid beyond the request deposit.</li>
              <li>Cancellations made within 14 days of check-in are not eligible for Travel Credits.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">What This Policy Covers</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            PixieDVC Travel Credits apply to accommodations only, as outlined in the PixieDVC Rental Agreement.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">The following are not covered:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Park tickets</li>
            <li>Flights or transportation</li>
            <li>Dining plans</li>
            <li>Special events, tours, or add-ons</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            PixieDVC strongly recommends that guests purchase third-party travel insurance to protect non-accommodation
            travel expenses.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Reservation Changes</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Any modification to a confirmed reservation, including but not limited to:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Lead guest name changes</li>
            <li>Travel date changes</li>
            <li>Resort, room type, or view changes</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            is considered a cancellation of the original reservation and is subject to this policy. Any new reservation
            is treated independently and is not linked to prior agreements or credits.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Issuance of Travel Credits</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Eligible PixieDVC Travel Credits are issued within 14 business days after cancellation is confirmed.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Credits are issued in the guest’s name and associated with their PixieDVC account.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Travel Credit Usage</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Are valid for 36 months from the date of issue</li>
            <li>Have no cash value</li>
            <li>May be applied only toward new PixieDVC accommodation reservations</li>
            <li>May be combined with other PixieDVC Travel Credits or cash payments</li>
            <li>May be used across multiple reservations</li>
          </ul>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            If multiple Travel Credits are applied to a reservation that is later canceled, any non-refundable amounts
            will be deducted from the earliest-expiring credit.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            If a Travel Credit is used to secure reservations that are canceled twice, any remaining balance of that
            Travel Credit becomes null and void.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Reservations Not Covered</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Reservations that do not qualify under this policy remain subject to PixieDVC’s All Sales Final terms. No
            refunds, credits, or modifications are permitted outside the scope of this policy.
          </p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            Guests with exceptional circumstances may contact PixieDVC for guidance; however, eligibility is not
            guaranteed.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Questions or Assistance</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">Our Vacation Coordinators are happy to help:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-[#0F2148]/80">
            <li>Daily, 9:00am-5:30pm ET</li>
            <li>Via email, live chat, or the contact form on our website</li>
          </ul>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Disclaimer</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            PixieDVC reserves the right to interpret, apply, or update this policy in accordance with its Rental
            Agreements and operational requirements. This policy applies only to eligible reservations as outlined
            above.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0F2148]">Contact</h2>
          <p className="text-sm leading-6 text-[#0F2148]/80">PixieDVC</p>
          <p className="text-sm leading-6 text-[#0F2148]/80">
            <span className="mr-2">📧</span>
            <Link href="mailto:hello@pixiedvc.com" className="underline underline-offset-4">
              hello@pixiedvc.com
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
