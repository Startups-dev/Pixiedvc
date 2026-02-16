"use client";

import { useEffect, useState, useTransition } from "react";

type Promotion = {
  name: string;
  is_active: boolean;
};

export default function PricingPromotionToggleClient({ name }: { name: string }) {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/admin/pricing-promotions?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        setPromotion(json?.promotion ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setErrorMessage("Unable to load promotion.");
      });
    return () => {
      isMounted = false;
    };
  }, [name]);

  const isActive = promotion?.is_active ?? false;

  function handleToggle(next: boolean) {
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/pricing-promotions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, is_active: next }),
        });
        const json = await response.json();
        if (!response.ok) {
          setErrorMessage(json?.error ?? "Unable to update promotion.");
          return;
        }
        setPromotion(json?.promotion ?? null);
      } catch {
        setErrorMessage("Unable to update promotion.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pricing promotion</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Toggle the active promotion window without redeploying.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isActive)}
          disabled={isPending || !promotion}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isActive
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          } ${isPending ? "opacity-70" : ""}`}
        >
          <span>{isActive ? "Active" : "Inactive"}</span>
        </button>
      </div>
      {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
    </div>
  );
}
