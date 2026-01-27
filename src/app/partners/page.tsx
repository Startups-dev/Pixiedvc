import Link from "next/link";

export default function PartnersPage() {
  return (
    <main className="min-h-screen bg-white text-[#0F2148]">
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-[#0F2148]/60">Partners</p>
          <h1 className="text-3xl font-semibold text-[#0F2148] sm:text-4xl">
            Partners
          </h1>
          <p className="text-sm text-[#0F2148]/70 sm:text-base">
            Programs and partnerships that help families plan smarter and save more.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-[#0F2148]/10 bg-white p-6 shadow-[0_20px_60px_rgba(12,15,44,0.08)]">
            <h2 className="text-lg font-semibold text-[#0F2148]">Affiliate Program</h2>
            <p className="mt-2 text-sm text-[#0F2148]/70">
              Refer families and earn commission with a concierge-led experience and trusted inventory.
            </p>
            <Link
              href="/affiliate/login"
              className="mt-4 inline-flex items-center rounded-full border border-[#0F2148]/15 bg-[#0F2148] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0B1B3A]"
            >
              Go to Affiliate Portal
            </Link>
          </div>

          <div className="rounded-3xl border border-[#0F2148]/10 bg-white p-6 shadow-[0_20px_60px_rgba(12,15,44,0.08)]">
            <h2 className="text-lg font-semibold text-[#0F2148]">Store Partnerships</h2>
            <p className="mt-2 text-sm text-[#0F2148]/70">
              Co-branded planning flows and referral programs for boutique travel and hospitality partners.
            </p>
          </div>

          <div className="rounded-3xl border border-[#0F2148]/10 bg-white p-6 shadow-[0_20px_60px_rgba(12,15,44,0.08)]">
            <h2 className="text-lg font-semibold text-[#0F2148]">Owner Referrals</h2>
            <p className="mt-2 text-sm text-[#0F2148]/70">
              Connect verified owners with families ready to book their next DVC stay.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
