"use client";

import { useMemo, useState } from "react";

type GuestRow = {
  first_name: string | null;
  last_name: string | null;
  age_category: string | null;
  age: number | null;
};

type GuestFormRow = {
  fullName: string;
  type: "adult" | "child";
  age?: string;
  notes?: string;
};

type Props = {
  requestId: string;
  userEmail: string | null;
  leadGuestEmail: string | null;
  leadGuestPhone: string | null;
  guests: GuestRow[];
};

const typeLabel: Record<GuestFormRow["type"], string> = {
  adult: "Adult",
  child: "Child",
};

function normalizeGuests(guests: GuestRow[]): GuestFormRow[] {
  return guests.map((guest) => ({
    fullName: [guest.first_name, guest.last_name].filter(Boolean).join(" "),
    type: guest.age_category === "youth" ? "child" : "adult",
    age: guest.age ? String(guest.age) : "",
    notes: "",
  }));
}

export default function GuestDetailsClient({
  requestId,
  userEmail,
  leadGuestEmail,
  leadGuestPhone,
  guests,
}: Props) {
  const initialGuests = useMemo(() => normalizeGuests(guests), [guests]);
  const [email, setEmail] = useState(leadGuestEmail ?? userEmail ?? "");
  const [phone, setPhone] = useState(leadGuestPhone ?? "");
  const [party, setParty] = useState<GuestFormRow[]>(
    initialGuests.length ? initialGuests : [{ fullName: "", type: "adult" }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const addRow = () => {
    setParty((prev) => [...prev, { fullName: "", type: "adult" }]);
  };

  const removeRow = (index: number) => {
    setParty((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, patch: Partial<GuestFormRow>) => {
    setParty((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const validateParty = () => {
    const invalid = party.find((row) => !row.fullName.trim());
    if (invalid) return "Each party member must include a full name.";
    return null;
  };

  const onSave = async () => {
    setError(null);
    setSuccess(null);
    const partyError = validateParty();
    if (partyError) {
      setError(partyError);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/guest/requests/${requestId}/details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestEmail: email,
          guestPhone: phone,
          travelParty: party.map((row) => ({
            fullName: row.fullName.trim(),
            type: row.type,
            age: row.age ? Number(row.age) : null,
            notes: row.notes?.trim() || null,
          })),
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || "Unable to save guest details.");
      }

      setSuccess("Details saved.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save guest details.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div id="guest-details" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Guest Details</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Operational
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          For communication purposes only. This does not change your contract.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
            />
          </label>
          <label className="space-y-2 text-sm text-slate-600">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Guest phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
            />
          </label>
        </div>
      </div>

      <div id="travel-party" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Travel Party</h2>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Operational
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          For check-in purposes only. This does not change your contract.
        </p>

        <div className="mt-4 space-y-4">
          {party.map((row, index) => (
            <div key={`${row.fullName}-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[1.6fr_0.6fr_0.4fr_auto]">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Full name</span>
                <input
                  value={row.fullName}
                  onChange={(event) => updateRow(index, { fullName: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                  placeholder="Full legal name"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Type</span>
                <select
                  value={row.type}
                  onChange={(event) =>
                    updateRow(index, { type: event.target.value as GuestFormRow["type"] })
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                >
                  <option value="adult">{typeLabel.adult}</option>
                  <option value="child">{typeLabel.child}</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Age</span>
                <input
                  type="number"
                  min={0}
                  value={row.age ?? ""}
                  onChange={(event) => updateRow(index, { age: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-700"
                >
                  Remove
                </button>
              </div>
              </div>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Notes (optional)</span>
                <input
                  value={row.notes ?? ""}
                  onChange={(event) => updateRow(index, { notes: event.target.value })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900"
                  placeholder="Allergies, accessibility, or special notes"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addRow}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 hover:text-slate-800"
          >
            Add traveler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save details"}
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-600">{success}</p> : null}
      </div>
    </section>
  );
}
