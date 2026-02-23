"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { usePlacesAutocomplete } from "@/hooks/usePlacesAutocomplete";

import {
  continueReadyStayToAgreement,
  saveReadyStayGuestRoster,
  saveReadyStayTravelerDetails,
} from "../actions";

type GuestRecord = {
  id?: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_category: "adult" | "youth" | null;
  age: number | null;
};

type GuestForm = {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageCategory: "adult" | "youth";
  age: string;
};

type BookingDraft = {
  id: string;
  lead_guest_name: string | null;
  lead_guest_email: string | null;
  lead_guest_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  marketing_source: string | null;
  comments: string | null;
};

function parseName(fullName: string | null) {
  if (!fullName) {
    return { title: null, firstName: null, lastName: null };
  }
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) {
    return { title: null, firstName: parts[0], lastName: null };
  }
  const title = parts.length > 2 ? parts[0] : null;
  const firstName = title ? parts[1] : parts[0];
  const lastName = parts[parts.length - 1];
  return { title, firstName, lastName };
}

const ADULT_TITLES = ["Mr.", "Mrs."] as const;
const CHILD_TITLES = ["Master", "Miss"] as const;

export default function ReadyStayPackageDetailsClient({
  readyStayId,
  lockSessionId,
  bookingId,
  userEmail,
  maxOccupancy,
  initialLeadGuestName,
  initialLeadGuestEmail,
  initialLeadGuestPhone,
  initialAddressLine1,
  initialAddressLine2,
  initialCity,
  initialState,
  initialPostalCode,
  initialCountry,
  initialMarketingSource,
  initialComments,
  initialGuests,
}: {
  readyStayId: string;
  lockSessionId: string;
  bookingId: string;
  userEmail: string;
  maxOccupancy: number;
  initialLeadGuestName: string | null;
  initialLeadGuestEmail: string | null;
  initialLeadGuestPhone: string | null;
  initialAddressLine1: string | null;
  initialAddressLine2: string | null;
  initialCity: string | null;
  initialState: string | null;
  initialPostalCode: string | null;
  initialCountry: string | null;
  initialMarketingSource: string | null;
  initialComments: string | null;
  initialGuests: GuestRecord[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<2 | 3>(2);
  const [draftState, setDraftState] = useState<BookingDraft>({
    id: bookingId,
    lead_guest_name: initialLeadGuestName,
    lead_guest_email: initialLeadGuestEmail,
    lead_guest_phone: initialLeadGuestPhone,
    address_line1: initialAddressLine1,
    address_line2: initialAddressLine2,
    city: initialCity,
    state: initialState,
    postal_code: initialPostalCode,
    country: initialCountry,
    marketing_source: initialMarketingSource,
    comments: initialComments,
  });
  const [guestState, setGuestState] = useState<GuestRecord[]>(initialGuests);

  return (
    <div className="space-y-5">
      {step === 2 ? (
        <StepTwo
          draft={draftState}
          userEmail={userEmail}
          onSaved={(updates) => setDraftState((prev) => ({ ...prev, ...updates }))}
          onAdvance={() => setStep(3)}
          onBack={() =>
            router.push(`/ready-stays/${readyStayId}/book/package?lock=${encodeURIComponent(lockSessionId)}`)
          }
        />
      ) : null}

      {step === 3 ? (
        <StepThree
          draft={draftState}
          guests={guestState}
          maxOccupancy={maxOccupancy}
          onSaved={(guestPayload, draftPayload) => {
            setGuestState(guestPayload);
            setDraftState((prev) => ({ ...prev, ...draftPayload }));
          }}
          onAdvance={async () => {
            const agreement = await continueReadyStayToAgreement({
              readyStayId,
              lockSessionId,
              bookingId,
            });
            if (!agreement.guestAcceptToken || !agreement.agreementPath) {
              throw new Error("Agreement could not be created.");
            }
            router.push(agreement.agreementPath);
          }}
          onBack={() => setStep(2)}
        />
      ) : null}
    </div>
  );
}

function StepTwo({
  draft,
  userEmail,
  onSaved,
  onAdvance,
  onBack,
}: {
  draft: BookingDraft;
  userEmail: string;
  onSaved: (payload: Partial<BookingDraft>) => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const { title, firstName, lastName } = parseName(draft.lead_guest_name);
  const [form, setForm] = useState({
    title: title ?? "Mr.",
    firstName: firstName ?? "",
    lastName: lastName ?? "",
    email: draft.lead_guest_email ?? userEmail,
    confirmEmail: draft.lead_guest_email ?? userEmail,
    phone: draft.lead_guest_phone ?? "",
    addressLine1: draft.address_line1 ?? "",
    addressLine2: draft.address_line2 ?? "",
    city: draft.city ?? "",
    state: draft.state ?? "",
    postalCode: draft.postal_code ?? "",
    country: draft.country ?? "United States",
    marketingSource: draft.marketing_source ?? "",
    notes: draft.comments ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const address1Ref = useRef<HTMLInputElement>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  usePlacesAutocomplete({
    inputRef: address1Ref,
    debugLabel: "stay-builder",
    onSelect: (address) => {
      if (address.line1) update("addressLine1", address.line1);
      if (address.city) update("city", address.city);
      if (address.state) update("state", address.state);
      if (address.postalCode) update("postalCode", address.postalCode);
      if (address.country) update("country", address.country);
    },
  });

  function handleSave() {
    if (
      !form.firstName ||
      !form.lastName ||
      !form.email ||
      !form.phone ||
      !form.addressLine1 ||
      !form.city ||
      !form.postalCode
    ) {
      setError("Please complete the required fields.");
      return;
    }
    if (form.email !== form.confirmEmail) {
      setError("Emails do not match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveReadyStayTravelerDetails({
          bookingId: draft.id,
          title: form.title,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          confirmEmail: form.confirmEmail,
          phone: form.phone,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          marketingSource: form.marketingSource,
          notes: form.notes,
        });
        onSaved({
          lead_guest_name: `${form.title} ${form.firstName} ${form.lastName}`.trim(),
          lead_guest_email: form.email,
          lead_guest_phone: form.phone,
          address_line1: form.addressLine1,
          address_line2: form.addressLine2,
          city: form.city,
          state: form.state,
          postal_code: form.postalCode,
          country: form.country,
          marketing_source: form.marketingSource,
          comments: form.notes,
        });
        setMessage("Traveler details saved.");
        setTimeout(() => setMessage(null), 3000);
        onAdvance();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save traveler details.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 2</p>
        <h2 className="text-2xl font-semibold text-slate-900">Traveler details</h2>
        <p className="text-sm text-slate-600">We use this to populate contracts and confirmations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Title
          <select
            value={form.title}
            onChange={(event) => update("title", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          >
            {ADULT_TITLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          First name
          <input
            value={form.firstName}
            onChange={(event) => update("firstName", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Last name
          <input
            value={form.lastName}
            onChange={(event) => update("lastName", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Phone
          <input
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => update("email", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Confirm email
          <input
            type="email"
            value={form.confirmEmail}
            onChange={(event) => update("confirmEmail", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Address line 1
          <input
            ref={address1Ref}
            value={form.addressLine1}
            onChange={(event) => update("addressLine1", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            autoComplete="street-address"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Address line 2 (optional)
          <input
            value={form.addressLine2}
            onChange={(event) => update("addressLine2", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          City
          <input
            value={form.city}
            onChange={(event) => update("city", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          State / Province
          <input
            value={form.state}
            onChange={(event) => update("state", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Postal code
          <input
            value={form.postalCode}
            onChange={(event) => update("postalCode", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Country
          <input
            value={form.country}
            onChange={(event) => update("country", event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <label className="text-sm font-medium text-slate-700">
        How did you hear about PixieDVC? (optional)
        <input
          value={form.marketingSource}
          onChange={(event) => update("marketingSource", event.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Additional notes (optional)
        <textarea
          value={form.notes}
          onChange={(event) => update("notes", event.target.value)}
          className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm"
          rows={4}
        />
      </label>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" onClick={onBack}>
          ← Back to Step 1
        </button>
        <button
          className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          onClick={handleSave}
          disabled={isPending}
        >
          {isPending ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </div>
  );
}

function StepThree({
  draft,
  guests,
  maxOccupancy,
  onSaved,
  onAdvance,
  onBack,
}: {
  draft: BookingDraft;
  guests: GuestRecord[];
  maxOccupancy: number;
  onSaved: (guests: GuestRecord[], draftPayload: { adults: number; youths: number }) => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const leadGuest = parseName(draft.lead_guest_name);
  const defaultAdultTitle = "Mr.";
  const defaultChildTitle = "Master";
  const initialForms: GuestForm[] = guests.length
    ? guests.map((guest) => ({
        id: guest.id,
        title:
          guest.age_category === "youth"
            ? CHILD_TITLES.includes((guest.title ?? "") as (typeof CHILD_TITLES)[number])
              ? (guest.title as string)
              : defaultChildTitle
            : ADULT_TITLES.includes((guest.title ?? "") as (typeof ADULT_TITLES)[number])
              ? (guest.title as string)
              : defaultAdultTitle,
        firstName: guest.first_name ?? "",
        lastName: guest.last_name ?? "",
        email: guest.email ?? "",
        phone: guest.phone ?? "",
        ageCategory: guest.age_category === "youth" ? "youth" : "adult",
        age: guest.age ? String(guest.age) : "",
      }))
    : [
      {
          title: ADULT_TITLES.includes((leadGuest.title ?? "") as (typeof ADULT_TITLES)[number])
            ? (leadGuest.title as string)
            : defaultAdultTitle,
          firstName: leadGuest.firstName ?? "",
          lastName: leadGuest.lastName ?? "",
          email: draft.lead_guest_email ?? "",
          phone: draft.lead_guest_phone ?? "",
          ageCategory: "adult",
          age: "",
        },
      ];

  const [forms, setForms] = useState<GuestForm[]>(initialForms);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateForm(index: number, patch: Partial<GuestForm>) {
    setForms((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  }

  function addGuest(ageCategory: "adult" | "youth") {
    if (forms.length >= maxOccupancy) {
      setError(`This room allows up to ${maxOccupancy} guests.`);
      return;
    }
    const nextTitle = ageCategory === "youth" ? defaultChildTitle : defaultAdultTitle;
    setForms((prev) => [
      ...prev,
      { title: nextTitle, firstName: "", lastName: "", email: "", phone: "", ageCategory, age: "" },
    ]);
  }

  function removeGuest(index: number) {
    setForms((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleSave() {
    if (forms.length > maxOccupancy) {
      setError(`Please keep your guest list within the ${maxOccupancy}-person limit for this room.`);
      return;
    }
    const sanitized = forms.filter((guest) => guest.firstName.trim() && guest.lastName.trim());
    if (!sanitized.length) {
      setError("Add at least one guest.");
      return;
    }
    const missingChildAge = sanitized.find((guest) => guest.ageCategory === "youth" && !guest.age.trim());
    if (missingChildAge) {
      setError("Please enter the age for each child guest.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveReadyStayGuestRoster({
          bookingId: draft.id,
          guests: sanitized.map((guest) => ({
            title: guest.title,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            ageCategory: guest.ageCategory,
            age: guest.age ? Number(guest.age) : null,
          })),
        });
        setMessage("Guest roster saved.");
        setTimeout(() => setMessage(null), 3000);
        onSaved(
          sanitized.map((guest) => ({
            title: guest.title,
            first_name: guest.firstName,
            last_name: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            age_category: guest.ageCategory,
            age: guest.age ? Number(guest.age) : null,
          })),
          {
            adults: sanitized.filter((guest) => guest.ageCategory === "adult").length,
            youths: sanitized.filter((guest) => guest.ageCategory === "youth").length,
          },
        );
        await onAdvance();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to save guest roster.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 3</p>
        <h2 className="text-2xl font-semibold text-slate-900">Guest roster</h2>
        <p className="text-sm text-slate-600">List everyone staying in the villa. Names must match government IDs.</p>
      </div>

      <div className="space-y-4">
        {forms.map((guest, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Guest {index + 1}</p>
              {forms.length > 1 ? (
                <button type="button" onClick={() => removeGuest(index)} className="text-xs text-rose-500">
                  Remove
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="text-xs font-semibold text-slate-600">
                Guest type
                <p className="mt-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  {guest.ageCategory === "youth" ? "Child (under 18)" : "Adult (18+)"}
                </p>
              </div>
              <label className="text-xs font-semibold text-slate-600">
                Title
                <select
                  value={guest.title}
                  onChange={(event) => updateForm(index, { title: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {(guest.ageCategory === "youth" ? CHILD_TITLES : ADULT_TITLES).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                First name
                <input
                  value={guest.firstName}
                  onChange={(event) => updateForm(index, { firstName: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Last name
                <input
                  value={guest.lastName}
                  onChange={(event) => updateForm(index, { lastName: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Email (optional)
                <input
                  type="email"
                  value={guest.email}
                  onChange={(event) => updateForm(index, { email: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Phone (optional)
                <input
                  value={guest.phone}
                  onChange={(event) => updateForm(index, { phone: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              {guest.ageCategory === "youth" ? (
                <label className="text-xs font-semibold text-slate-600">
                  Child age
                  <input
                    type="number"
                    min={0}
                    max={17}
                    value={guest.age}
                    onChange={(event) => updateForm(index, { age: event.target.value })}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => addGuest("adult")}
          disabled={forms.length >= maxOccupancy}
        >
          + Add adult guest
        </button>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50"
          onClick={() => addGuest("youth")}
          disabled={forms.length >= maxOccupancy}
        >
          + Add child guest
        </button>
      </div>
      <p className="text-xs text-slate-500">This room allows up to {maxOccupancy} guests total.</p>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" onClick={onBack}>
          ← Back to Step 2
        </button>
        <button
          className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          type="button"
          disabled={isPending}
          onClick={handleSave}
        >
          {isPending ? "Saving…" : "Save & continue"}
        </button>
      </div>
    </div>
  );
}
