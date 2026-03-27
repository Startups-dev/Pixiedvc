import Link from "next/link";

export default function PrivateTestIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Private Testing</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">PixieDVC User Test Access</h1>
        <p className="mt-3 text-sm text-slate-600">
          Private testing requires an invite link. Use the exact link provided by the PixieDVC team to start your
          guest or owner test flow.
        </p>
        <div className="mt-6">
          <Link href="/" className="text-sm font-semibold text-[#0F2148] underline-offset-2 hover:underline">
            Return to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}

