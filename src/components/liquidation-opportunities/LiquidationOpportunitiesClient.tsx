"use client";

import { useEffect, useState } from "react";

import { Button } from "@pixiedvc/design-system";

type Opportunity = {
  id: string;
  resortName: string;
  pointsAvailable: number;
  expirationDate: string;
  travelWindowStart: string | null;
  travelWindowEnd: string | null;
  roomType: string | null;
  targetPricePerPointCents: number | null;
  newsletterFeatured: boolean;
};

const UNLOCK_KEY = "pixie:liquidation-opportunities:unlocked";

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString();
}

export default function LiquidationOpportunitiesClient({ opportunities }: { opportunities: Opportunity[] }) {
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasUnlock = window.sessionStorage.getItem(UNLOCK_KEY);
    if (hasUnlock === "1") setUnlocked(true);
  }, []);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/liquidation-opportunities/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourcePage: "/liquidation-opportunities" }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Unable to unlock.");
      setUnlocked(true);
      setModalOpen(false);
      if (typeof window !== "undefined") window.sessionStorage.setItem(UNLOCK_KEY, "1");
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unable to unlock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {opportunities.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink">{item.resortName}</h2>
              {item.newsletterFeatured ? (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Featured
                </span>
              ) : null}
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted">
              <p>{item.pointsAvailable} points available</p>
              <p>Expires {formatDate(item.expirationDate)}</p>
              <p>
                Window: {formatDate(item.travelWindowStart)} - {formatDate(item.travelWindowEnd)}
              </p>
              <p>Room: {item.roomType ?? "Flexible"}</p>
            </div>

            <div className="mt-4">
              {unlocked ? (
                <p className="text-base font-semibold text-ink">
                  {item.targetPricePerPointCents
                    ? `Target from $${(item.targetPricePerPointCents / 100).toFixed(2)}/pt`
                    : "Target pricing shared during concierge review"}
                </p>
              ) : (
                <p className="text-sm font-semibold text-blue-700">Unlock target pricing</p>
              )}
            </div>

            <div className="mt-4">
              {unlocked ? (
                <Button asChild>
                  <a href="/contact">Talk to concierge</a>
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex rounded-full border border-blue-300/50 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800"
                >
                  Unlock this opportunity
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-semibold text-ink">Get access to liquidation opportunities</h3>
            <form className="mt-4 space-y-4" onSubmit={unlock}>
              <label className="block">
                <span className="text-sm text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm"
                >
                  Close
                </button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Unlocking..." : "Unlock opportunities"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
