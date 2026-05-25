"use client";

import { useEffect, useState, useTransition } from "react";

type Promotion = {
  name: string;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  is_effective_active?: boolean;
  effective_reason?: string | null;
};

function toDateTimeLocalValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatReason(reason?: string | null) {
  if (!reason) return null;
  switch (reason) {
    case "active":
      return "Active within current date window";
    case "inactive_flag":
      return "Promotion is toggled inactive";
    case "starts_in_future":
      return "Start date is in the future";
    case "ended":
      return "End date has already passed";
    case "invalid_start":
      return "Start date is invalid";
    case "invalid_end":
      return "End date is invalid";
    default:
      return reason;
  }
}

export default function PricingPromotionToggleClient({ name }: { name: string }) {
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/admin/pricing-promotions?name=${encodeURIComponent(name)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        const nextPromotion = json?.promotion ?? null;
        setPromotion(nextPromotion);
        setStartsAt(toDateTimeLocalValue(nextPromotion?.starts_at));
        setEndsAt(toDateTimeLocalValue(nextPromotion?.ends_at));
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
  const isEffectiveActive = promotion?.is_effective_active ?? false;
  const effectiveReason = promotion?.effective_reason ?? null;

  async function submitUpdate(payload: Record<string, unknown>, successText: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    const response = await fetch("/api/admin/pricing-promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, ...payload }),
    });
    const json = await response.json();
    if (!response.ok) {
      setErrorMessage(json?.error ?? "Unable to update promotion.");
      return;
    }
    const nextPromotion = json?.promotion ?? null;
    setPromotion(nextPromotion);
    setStartsAt(toDateTimeLocalValue(nextPromotion?.starts_at));
    setEndsAt(toDateTimeLocalValue(nextPromotion?.ends_at));
    setSuccessMessage(successText);
  }

  function handleToggle(next: boolean) {
    startTransition(async () => {
      try {
        await submitUpdate({ is_active: next }, "Promotion status updated.");
      } catch {
        setErrorMessage("Unable to update promotion.");
      }
    });
  }

  function handleWindowSave() {
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setErrorMessage("End date must be after start date.");
      setSuccessMessage(null);
      return;
    }

    startTransition(async () => {
      try {
        await submitUpdate(
          {
            starts_at: startsAt || null,
            ends_at: endsAt || null,
          },
          "Promotion dates updated.",
        );
      } catch {
        setErrorMessage("Unable to update promotion.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-[#3a3a3a] bg-[#2f2f2f] p-6 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8e8ea0]">Pricing promotion</p>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: '#64748b' }}>
            {name}
          </h2>
          <p className="mt-1 text-sm text-[#b4b4b4]">
            Toggle the active promotion window without redeploying.
          </p>
          {promotion ? (
            <div className="mt-3 space-y-1 text-xs text-[#8e8ea0]">
              <p>
                Effective status:{" "}
                <span className={isEffectiveActive ? "text-[#10a37f]" : "text-amber-400"}>
                  {isEffectiveActive ? "Visible now" : "Not currently visible"}
                </span>
              </p>
              {effectiveReason && effectiveReason !== "active" ? (
                <p>Reason: {formatReason(effectiveReason)}</p>
              ) : null}
              <p>Starts: {promotion.starts_at ?? "—"}</p>
              <p>Ends: {promotion.ends_at ?? "—"}</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => handleToggle(!isActive)}
          disabled={isPending || !promotion}
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            isActive
              ? "border-[#10a37f] bg-[#10a37f] text-white"
              : "border-[#3a3a3a] bg-[#212121] text-[#b4b4b4] hover:bg-[#171717]"
          } ${isPending ? "opacity-70" : ""}`}
        >
          <span>{isActive ? "Active" : "Inactive"}</span>
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">Start date</span>
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-4 py-3 text-sm text-[#ececec] outline-none transition focus:border-[#64748b]"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-[#8e8ea0]">End date</span>
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
            className="w-full rounded-xl border border-[#3a3a3a] bg-[#212121] px-4 py-3 text-sm text-[#ececec] outline-none transition focus:border-[#64748b]"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleWindowSave}
          disabled={isPending || !promotion}
          className="inline-flex items-center rounded-full bg-[#64748b] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#55657f] disabled:opacity-70"
        >
          Save dates
        </button>
        <button
          type="button"
          onClick={() => {
            setStartsAt("");
            setEndsAt("");
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          disabled={isPending || !promotion}
          className="inline-flex items-center rounded-full border border-[#3a3a3a] bg-[#212121] px-4 py-2 text-sm font-semibold text-[#b4b4b4] transition hover:bg-[#171717] disabled:opacity-70"
        >
          Clear both
        </button>
        <p className="text-xs text-[#8e8ea0]">
          Leave either field blank to remove that schedule boundary.
        </p>
      </div>
      {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
      {successMessage ? <p className="mt-3 text-sm text-[#10a37f]">{successMessage}</p> : null}
    </div>
  );
}
