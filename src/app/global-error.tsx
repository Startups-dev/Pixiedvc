"use client";

import { useEffect } from "react";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-start justify-center gap-4 px-6">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-300">
            An unexpected error occurred while rendering this page.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
