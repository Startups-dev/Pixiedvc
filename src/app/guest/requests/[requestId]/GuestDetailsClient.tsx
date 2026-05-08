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
  const [editingContact, setEditingContact] = useState(false);
  const [editingTravelers, setEditingTravelers] = useState(false);

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
    if (invalid) return "Each traveler must include a full legal name.";
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

      setSuccess("Reservation details updated.");
      setEditingContact(false);
      setEditingTravelers(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save guest details.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Guest contact</h2>
            <p className="mt-1 text-sm text-slate-500">
              We’ll use this information to share reservation updates and booking options.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingContact((current) => !current)}
            className="text-sm font-medium text-[#4457c7] hover:text-[#3344a6]"
          >
            {editingContact ? "Done" : "Edit contact information"}
          </button>
        </div>

        {editingContact ? (
          <div className="mt-5 grid gap-4">
            <label className="space-y-2 text-sm text-slate-500">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-500">
              <span>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
              />
            </label>
          </div>
        ) : (
          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 px-5 py-5">
            <div className="text-base font-medium text-slate-900">{email || "Email to be added"}</div>
            <div className="text-base text-slate-600">{phone || "Phone number to be added"}</div>
          </div>
        )}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Travel party</h2>
            <p className="mt-1 text-sm text-slate-500">
              Review who is traveling with you. We use this to prepare check-in details.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingTravelers((current) => !current)}
            className="text-sm font-medium text-[#4457c7] hover:text-[#3344a6]"
          >
            {editingTravelers ? "Done" : "Edit travelers"}
          </button>
        </div>

        {editingTravelers ? (
          <div className="mt-5 space-y-4">
            {party.map((row, index) => (
              <div key={`${row.fullName}-${index}`} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="grid gap-3 md:grid-cols-[1.6fr_0.6fr_0.4fr_auto]">
                  <label className="space-y-2 text-sm text-slate-500">
                    <span>Full name</span>
                    <input
                      value={row.fullName}
                      onChange={(event) => updateRow(index, { fullName: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder="Full legal name"
                    />
                  </label>
                  <label className="space-y-2 text-sm text-slate-500">
                    <span>Traveler type</span>
                    <select
                      value={row.type}
                      onChange={(event) =>
                        updateRow(index, { type: event.target.value as GuestFormRow["type"] })
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="adult">{typeLabel.adult}</option>
                      <option value="child">{typeLabel.child}</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm text-slate-500">
                    <span>Age</span>
                    <input
                      type="number"
                      min={0}
                      value={row.age ?? ""}
                      onChange={(event) => updateRow(index, { age: event.target.value })}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <label className="space-y-2 text-sm text-slate-500">
                  <span>Notes (optional)</span>
                  <input
                    value={row.notes ?? ""}
                    onChange={(event) => updateRow(index, { notes: event.target.value })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Allergies, accessibility, or special notes"
                  />
                </label>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
            >
              Add traveler
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3 rounded-2xl bg-slate-50 px-5 py-5">
            {party.map((row, index) => (
              <div key={`${row.fullName || "traveler"}-${index}`} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                <div className="text-slate-900">{row.fullName || "Traveler name pending"}</div>
                <div className="text-sm text-slate-500">
                  {row.type === "child" && row.age ? `Child (${row.age})` : typeLabel[row.type]}
                </div>
              </div>
            ))}
          </div>
        )}

        {(editingContact || editingTravelers) ? (
          <div className="mt-5 flex items-center justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-xl bg-[linear-gradient(to_bottom,#5a6bd7,#4457c7)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(45,60,122,0.22)] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save updates"}
            </button>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm text-emerald-600">{success}</p> : null}
      </div>
    </section>
  );
}
