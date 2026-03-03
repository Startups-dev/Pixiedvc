import { affiliateCard, affiliateTextMuted } from "@/lib/affiliate-theme";

export default function AffiliateAgreementPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className={`text-xs uppercase tracking-[0.28em] ${affiliateTextMuted}`}>PixieDVC</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-500">Affiliate Agreement</h1>
      <div className={`mt-8 space-y-5 rounded-2xl p-8 text-sm leading-7 ${affiliateCard}`}>
        <p>
          By participating in the PixieDVC Affiliate Program, you agree to promote PixieDVC accurately and in good
          faith. You may not make misleading claims about availability, pricing, or guarantees.
        </p>
        <p>
          PixieDVC reserves the right to suspend or terminate affiliate accounts that promote in ways inconsistent with
          brand standards, including misleading claims, unauthorized paid advertising, trademark bidding, or placements
          that may damage brand reputation.
        </p>
        <p>
          Commission eligibility is based on confirmed bookings tracked through official PixieDVC referral links.
          Referral attribution windows, payout schedules, and operational policies may be updated from time to time.
        </p>
        <p>
          Affiliates are independent contractors and are responsible for all legal, tax, and regulatory obligations in
          their jurisdiction.
        </p>
        <p>
          This agreement is governed by the laws of the Province of Ontario and applicable federal laws of Canada.
        </p>
      </div>
    </main>
  );
}
