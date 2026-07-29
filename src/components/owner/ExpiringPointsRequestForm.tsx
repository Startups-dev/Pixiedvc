"use client";

import { useState } from "react";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  resort: string;
  points: string;
  expirationDate: string;
  reservationDetails: string;
  desiredPayout: string;
  urgency: "flexible" | "within_60_days" | "within_30_days" | "immediate";
  notes: string;
  acknowledged: boolean;
};

const fieldClassName =
  "mt-2 w-full rounded-2xl border border-[#d7e1f2] bg-white px-4 py-3.5 text-sm text-[#0F2148] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_4px_14px_rgba(15,33,72,0.04)] outline-none transition placeholder:text-[#8aa0c2] focus:border-[#0F2148]/30 focus:ring-4 focus:ring-[#d9a53a]/12";
const labelClassName = "text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5f7397]";
const resortOptions = [
  "Disney's Animal Kingdom Villas - Jambo House",
  "Disney's Animal Kingdom Villas - Kidani Village",
  "Aulani, Disney Vacation Club Villas",
  "Bay Lake Tower at Disney's Contemporary Resort",
  "Disney's Beach Club Villas",
  "Disney's BoardWalk Villas",
  "Disney's Boulder Ridge Villas at Disney's Wilderness Lodge",
  "Copper Creek Villas & Cabins at Disney's Wilderness Lodge",
  "The Villas at Disneyland Hotel",
  "The Cabins at Disney's Fort Wilderness Resort",
  "The Villas at Disney's Grand Californian Hotel & Spa",
  "The Villas at Disney's Grand Floridian Resort & Spa",
  "Disney's Hilton Head Island Resort",
  "Disney's Old Key West Resort",
  "Disney's Polynesian Villas & Bungalows",
  "Disney's Riviera Resort",
  "Disney's Saratoga Springs Resort & Spa",
  "Disney's Vero Beach Resort",
];

const initialState: FormState = {
  fullName: "",
  email: "",
  phone: "",
  resort: "",
  points: "",
  expirationDate: "",
  reservationDetails: "",
  desiredPayout: "",
  urgency: "flexible",
  notes: "",
  acknowledged: false,
};

export default function ExpiringPointsRequestForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setStatus("submitting");
    setErrorMessage("");

    try {
      const response = await fetch("/api/expiring-point-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          resort: form.resort,
          points: Number(form.points),
          expirationDate: form.expirationDate,
          reservationDetails: form.reservationDetails || null,
          desiredPayout: form.desiredPayout,
          urgency: form.urgency,
          notes: form.notes || null,
          acknowledged: form.acknowledged,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to submit request.");
      }

      setStatus("success");
      setForm(initialState);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Unable to submit request.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <label>
        <span className={labelClassName}>Full Name</span>
        <input
          required
          className={fieldClassName}
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          placeholder="Your full name"
        />
      </label>

      <label>
        <span className={labelClassName}>Email Address</span>
        <input
          required
          type="email"
          className={fieldClassName}
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          placeholder="you@example.com"
        />
      </label>

      <label>
        <span className={labelClassName}>Phone Number (optional)</span>
        <input
          type="tel"
          className={fieldClassName}
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          placeholder="(555) 555-5555"
        />
      </label>

      <label>
        <span className={labelClassName}>Home Resort</span>
        <select
          required
          className={fieldClassName}
          value={form.resort}
          onChange={(event) => setForm((prev) => ({ ...prev, resort: event.target.value }))}
        >
          <option value="">Select a resort</option>
          {resortOptions.map((resort) => (
            <option key={resort} value={resort}>
              {resort}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={labelClassName}>Number of Points</span>
        <input
          required
          type="number"
          min={1}
          className={fieldClassName}
          value={form.points}
          onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
          placeholder="150"
        />
      </label>

      <label>
        <span className={labelClassName}>Expiration Date</span>
        <input
          required
          type="date"
          className={fieldClassName}
          value={form.expirationDate}
          onChange={(event) => setForm((prev) => ({ ...prev, expirationDate: event.target.value }))}
        />
      </label>

      <label className="md:col-span-2">
        <span className={labelClassName}>Confirmed Reservation Details (optional)</span>
        <textarea
          className={`${fieldClassName} min-h-[110px] resize-none py-3.5`}
          value={form.reservationDetails}
          onChange={(event) => setForm((prev) => ({ ...prev, reservationDetails: event.target.value }))}
          placeholder="Include resort, room type, dates, and any details we should know."
        />
      </label>

      <label>
        <span className={labelClassName}>Desired Owner Payout</span>
        <input
          required
          className={fieldClassName}
          value={form.desiredPayout}
          onChange={(event) => setForm((prev) => ({ ...prev, desiredPayout: event.target.value }))}
          placeholder="Price per point"
        />
      </label>

      <label>
        <span className={labelClassName}>Urgency</span>
        <select
          className={fieldClassName}
          value={form.urgency}
          onChange={(event) =>
            setForm((prev) => ({
              ...prev,
              urgency: event.target.value as FormState["urgency"],
            }))
          }
        >
          <option value="flexible">Flexible</option>
          <option value="within_60_days">Within 60 Days</option>
          <option value="within_30_days">Within 30 Days</option>
          <option value="immediate">Immediate</option>
        </select>
      </label>

      <label className="md:col-span-2">
        <span className={labelClassName}>Anything else we should know?</span>
        <textarea
          className={`${fieldClassName} min-h-[140px] resize-none py-3.5`}
          value={form.notes}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          placeholder="Share context around your timing, flexibility, reservation status, or any other notes."
        />
      </label>

      <label className="md:col-span-2 flex items-start gap-3 rounded-[24px] border border-[#d7e1f2] bg-[linear-gradient(180deg,#fbfdff_0%,#f5f9ff_100%)] px-4 py-4 text-sm text-[#496384]">
        <input
          required
          type="checkbox"
          checked={form.acknowledged}
          onChange={(event) => setForm((prev) => ({ ...prev, acknowledged: event.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-[#b7c8e5] text-[#0F2148]"
        />
        <span>
          I understand this is a manual review request and does not guarantee placement, booking, or sale.
        </span>
      </label>

      {status === "error" ? (
        <p className="md:col-span-2 text-sm text-[#b42318]">{errorMessage}</p>
      ) : null}

      {status === "success" ? (
        <div className="md:col-span-2 rounded-[24px] border border-[#d8e8cf] bg-[#f4fbef] px-4 py-4 text-sm text-[#355b25]">
          Request received. HannaDVC will review your opportunity and reach out if additional information is needed.
        </div>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex min-w-[190px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#f5c965,#d9a53a)] px-7 py-3.5 text-sm font-semibold !text-white shadow-[0_20px_40px_rgba(217,165,58,0.30)] transition hover:-translate-y-[1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "submitting" ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );
}
