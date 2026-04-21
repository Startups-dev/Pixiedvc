"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const labelClassName = "block text-[11px] font-semibold uppercase leading-none tracking-[0.28em] text-[#9aa8bc]";
const fieldClassName =
  "h-12 w-full rounded-[13px] border border-[#7184a3]/24 bg-[#05070a] px-4 text-[15px] font-medium text-[#edf4ff] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5),inset_0_-1px_0_rgba(255,255,255,0.025)] outline-none transition placeholder:text-[#7d8da3] focus:border-[#02acfb] focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.34),0_0_0_2px_rgba(2,172,251,0.22)]";
const selectClassName = `${fieldClassName} appearance-none bg-[linear-gradient(45deg,transparent_50%,#9aa8bc_50%),linear-gradient(135deg,#9aa8bc_50%,transparent_50%)] bg-[length:6px_6px,6px_6px] bg-[position:calc(100%-18px)_20px,calc(100%-12px)_20px] bg-no-repeat pr-11`;

type ResortOption = {
  id: string;
  name: string;
};

export default function OwnerLiquidationOpportunityForm({ resorts }: { resorts: ResortOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    home_resort_id: resorts[0]?.id ?? "",
    points_available: "",
    expiration_date: "",
    urgency_level: "moderate",
    target_price_per_point_cents: "",
    flexibility_notes: "",
    newsletter_opt_in: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/owner/liquidation-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_resort_id: form.home_resort_id || null,
          points_available: Number(form.points_available),
          expiration_date: form.expiration_date,
          urgency_level: form.urgency_level,
          target_price_per_point_cents: form.target_price_per_point_cents
            ? Number(form.target_price_per_point_cents)
            : null,
          flexibility_notes: form.flexibility_notes || null,
          newsletter_opt_in: form.newsletter_opt_in,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Unable to submit opportunity.");
      }
      setNotice("Last-minute liquidation opportunity submitted for review.");
      setForm((prev) => ({
        ...prev,
        points_available: "",
        expiration_date: "",
        target_price_per_point_cents: "",
        flexibility_notes: "",
      }));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit opportunity.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-x-5 gap-y-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className={labelClassName}>Home resort</span>
        <select
          className={selectClassName}
          value={form.home_resort_id}
          onChange={(event) => setForm((prev) => ({ ...prev, home_resort_id: event.target.value }))}
        >
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className={labelClassName}>Points available</span>
        <input
          type="number"
          min={1}
          required
          className={fieldClassName}
          value={form.points_available}
          onChange={(event) => setForm((prev) => ({ ...prev, points_available: event.target.value }))}
        />
      </label>

      <label className="space-y-2">
        <span className={labelClassName}>Expiration date</span>
        <input
          type="date"
          required
          className={fieldClassName}
          value={form.expiration_date}
          onChange={(event) => setForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
        />
      </label>

      <label className="space-y-2">
        <span className={labelClassName}>Your target price per point</span>
        <input
          type="number"
          min={1}
          className={fieldClassName}
          value={form.target_price_per_point_cents}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, target_price_per_point_cents: event.target.value }))
          }
        />
      </label>

      <div className="liquidation-guidance-panel rounded-2xl border p-4 text-[13px] leading-5 text-[#b7c3d4] md:col-span-2">
        <div className="flex items-center gap-3 border-b border-[#7184a3]/20 pb-3">
          <span className="h-2.5 w-2.5 rounded-full border border-[#02acfb]/70 bg-[#02acfb]/20 shadow-[0_0_12px_rgba(2,172,251,0.28)]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#edf4ff]">
            How to price your points
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          <li>• Fast placement for expiring points</li>
          <li>• Priced below market to move quickly</li>
          <li>• Lower price = faster match</li>
        </ul>
        <div className="mt-4 space-y-2 border-t border-[#7184a3]/20 pt-3">
          <p className="font-semibold text-[#edf4ff]">Suggested pricing:</p>
          <ul className="space-y-1">
            <li>• 60+ days: ~$16/pt</li>
            <li>• 45–60 days: $12–15/pt</li>
            <li>• 30–45 days: $8–11/pt</li>
            <li>• &lt;30 days: $5–7/pt</li>
          </ul>
          <p>Pricing is set by you based on urgency.</p>
          <p>You approve any booking before it&apos;s confirmed.</p>
        </div>
      </div>

      <label className="space-y-2 md:col-span-2">
        <span className={labelClassName}>Anything else we should know? (optional)</span>
        <textarea
          className={`${fieldClassName} min-h-20 resize-none py-3 leading-5`}
          value={form.flexibility_notes}
          onChange={(event) => setForm((prev) => ({ ...prev, flexibility_notes: event.target.value }))}
        />
      </label>

      <label className="inline-flex items-center gap-3 text-[13px] font-medium text-[#b7c3d4] md:col-span-2">
        <input
          type="checkbox"
          className="h-4 w-4 appearance-none rounded border border-[#02acfb] bg-[#0b1422] shadow-[inset_0_1px_1px_rgba(0,0,0,0.45)] checked:border-[#02acfb] checked:bg-[#02acfb]"
          checked={form.newsletter_opt_in}
          onChange={(event) => setForm((prev) => ({ ...prev, newsletter_opt_in: event.target.checked }))}
        />
        Include this offer in curated newsletter consideration
      </label>

      {error ? <p className="text-sm text-[#fca5a5] md:col-span-2">{error}</p> : null}
      {notice ? <p className="text-sm text-[#9cc7aa] md:col-span-2">{notice}</p> : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="h-11 rounded-[10px] border border-[rgba(2,172,251,0.7)] bg-[#0A0F1A] bg-none px-7 text-[14px] font-semibold text-white shadow-none transition-colors duration-150 [background-image:none] hover:border-[#02ACFB] hover:bg-[#101A2B] hover:shadow-[0_0_12px_rgba(2,172,251,0.25)] focus-visible:border-[#02ACFB] focus-visible:bg-[#101A2B] focus-visible:shadow-[0_0_12px_rgba(2,172,251,0.25)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Find a guest for my points"}
        </button>
      </div>
    </form>
  );
}
