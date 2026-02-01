import { Suspense } from "react";
import DepositSuccessClient from "./DepositSuccessClient";

export default function DepositSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-lg px-4 py-16">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Deposit status
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0B1B3A]/10 text-[#0B1B3A]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B1B3A]/30 border-t-[#0B1B3A]" />
              </span>
              <h1 className="text-2xl font-semibold text-slate-900">
                Finalizing your deposit...
              </h1>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Loading details…
            </p>
          </div>
        </main>
      }
    >
      <DepositSuccessClient />
    </Suspense>
  );
}
