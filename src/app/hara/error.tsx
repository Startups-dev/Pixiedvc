"use client";

import { Button } from "@pixiedvc/design-system";

export default function HaraError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-12">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hara</p>
        <h1 className="mt-3 text-2xl font-semibold text-ink">Hara could not load this planning session.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Your browser draft remains local. Try reloading the planner.</p>
        <Button className="mt-5" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
