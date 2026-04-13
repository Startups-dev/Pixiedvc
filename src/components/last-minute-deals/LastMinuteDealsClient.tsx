"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Button } from "@pixiedvc/design-system";

export type LastMinuteDeal = {
  id: string;
  resortName: string;
  resortSlug: string | null;
  checkIn: string | null;
  checkOut: string | null;
  nights: number;
  sleeps: number;
  roomType: string;
  totalPriceCents: number | null;
  originalTotalPriceCents: number | null;
  pricePerPointCents: number | null;
  imageUrl: string;
  createdAt: string | null;
};

const SESSION_UNLOCK_KEY = "pixie:last-minute-deals:unlocked";

function formatDate(value: string | null) {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrencyFromCents(value: number | null) {
  if (!value || value <= 0) return "Price unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getCardTag(deal: LastMinuteDeal) {
  if (deal.createdAt) {
    const created = new Date(deal.createdAt);
    if (!Number.isNaN(created.getTime())) {
      const ageHours = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      if (ageHours <= 24) return "Just added";
    }
  }

  if (deal.nights <= 2) return "Limited";
  return "New";
}

export default function LastMinuteDealsClient({ deals }: { deals: LastMinuteDeal[] }) {
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const persisted = window.sessionStorage.getItem(SESSION_UNLOCK_KEY);
    if (persisted === "1") {
      setUnlocked(true);
    }
  }, []);

  const hasDeals = deals.length > 0;

  const trustText = useMemo(
    () => "Verified owners, Secure booking, Concierge support",
    [],
  );

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/last-minute-deals/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          sourcePage: "/last-minute-deals",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to unlock deals right now.");
      }

      setUnlocked(true);
      setModalOpen(false);
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(SESSION_UNLOCK_KEY, "1");
      }
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unable to unlock deals right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Last-minute Disney stays</h1>
        <p className="max-w-3xl text-sm text-muted sm:text-base">
          Confirmed availability you can book right now. Limited inventory.
        </p>
      </section>

      <section className="mt-8">
        {!hasDeals ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-ink">No last-minute stays right now</h2>
            <p className="mt-3 text-sm text-muted">New availability appears daily. Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {deals.map((deal) => {
              const totalPrice = formatCurrencyFromCents(deal.totalPriceCents);
              const perNight =
                deal.totalPriceCents && deal.nights > 0
                  ? formatCurrencyFromCents(Math.round(deal.totalPriceCents / deal.nights))
                  : null;
              const originalPerNight =
                deal.originalTotalPriceCents && deal.nights > 0
                  ? formatCurrencyFromCents(Math.round(deal.originalTotalPriceCents / deal.nights))
                  : null;

              return (
                <article
                  key={deal.id}
                  className="group overflow-hidden rounded-[20px] border border-white/10 bg-slate-900 shadow-[0_10px_30px_rgba(2,8,23,0.28)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(2,8,23,0.38)]"
                >
                  <div className="relative h-[180px] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={deal.imageUrl}
                      alt={`${deal.resortName} last-minute stay`}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-blue-500/90 px-2 py-1 text-xs font-semibold text-white">
                      {getCardTag(deal)}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-1 text-xs font-medium text-white">
                      {deal.nights} {deal.nights === 1 ? "night" : "nights"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 p-4">
                    <h2 className="text-base font-semibold leading-snug text-white">
                      {deal.resortName}, {deal.nights} {deal.nights === 1 ? "night" : "nights"}
                    </h2>
                    <p className="text-[13px] text-white/75">
                      {formatDate(deal.checkIn)} - {formatDate(deal.checkOut)} • Sleeps {deal.sleeps} • {deal.roomType}
                    </p>

                    {unlocked ? (
                      <div className="pt-1">
                        {deal.originalTotalPriceCents ? (
                          <p className="text-xs text-white/60 line-through">
                            {formatCurrencyFromCents(deal.originalTotalPriceCents)} total
                            {originalPerNight ? ` • ${originalPerNight}/night` : ""}
                          </p>
                        ) : null}
                        <p className="text-xl font-bold text-emerald-400">{totalPrice} total</p>
                        <p className="text-xs text-white/60">{perNight ? `${perNight}/night` : "Per-night pricing unavailable"}</p>
                        {deal.originalTotalPriceCents ? (
                          <span className="mt-1 inline-flex rounded-full bg-emerald-100/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-900">
                            Price reduced
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="pt-1">
                        <p className="text-lg font-semibold text-blue-300">Unlock price</p>
                      </div>
                    )}

                    <p className="text-xs text-white/60">Verified owner</p>

                    {unlocked ? (
                      <Button asChild className="mt-2 h-11 w-full rounded-xl px-4 py-0 text-sm">
                        <Link href={`/ready-stays/${deal.id}/book`}>Book this stay</Link>
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl border border-blue-300/40 bg-blue-400/15 px-4 text-sm font-semibold text-blue-200 transition hover:border-blue-200/55 hover:bg-blue-400/20"
                      >
                        Unlock this deal
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-muted sm:text-base">
        {trustText}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-ink">Get access to last-minute Disney deals</h3>

            <form className="mt-5 space-y-4" onSubmit={handleUnlock}>
              <label className="block">
                <span className="text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-ink outline-none transition focus:border-slate-300"
                  placeholder="you@example.com"
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
                >
                  Close
                </button>
                <Button type="submit" className="h-10 px-5 py-0" disabled={saving}>
                  {saving ? "Unlocking..." : "Unlock deals"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
