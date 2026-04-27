import Link from "next/link";

export default function ReadyStaysEmptyState() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <div className="rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(243,247,255,0.95))] px-8 py-10 shadow-[0_24px_60px_rgba(15,33,72,0.08)]">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-[#0F2148]/55">Ready Stays</p>
          <h2 className="mt-3 text-3xl font-semibold text-[#0F2148] sm:text-4xl">Ready Stays coming soon</h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
            Confirmed DVC stays will appear here as owners release availability.
          </p>
          <div className="mt-7">
            <Link
              href="/plan"
              className="inline-flex items-center rounded-full bg-[linear-gradient(to_bottom,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_46%,rgba(255,255,255,0)_52%),linear-gradient(to_right,#19284d,#4f72ff)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(30,47,92,0.34)] transition-[transform,box-shadow,filter] duration-300 hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_14px_28px_rgba(30,47,92,0.4)]"
            >
              Check My Dates
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
