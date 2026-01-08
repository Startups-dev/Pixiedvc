import Link from "next/link";

export default function OwnerPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-3xl space-y-6 rounded-[40px] border border-slate-200 bg-white/80 p-10 shadow-lg">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Home for owners</p>
        <h1 className="text-4xl font-semibold text-slate-900">Put your unused points to work.</h1>
        <p className="text-lg text-slate-600">
          PixieDVC handles guest verification, agreements, and payouts so you can rent with confidence without the hassle.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/owner/onboarding"
            className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Start onboarding
          </Link>
          <Link href="/owner/dashboard" className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
