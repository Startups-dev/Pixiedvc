'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { quoteStay } from 'pixiedvc-calculator/engine/calc';
import { Resorts as CalculatorResorts } from 'pixiedvc-calculator/engine/charts';
import type { QuoteResult, RoomCode, ViewCode } from 'pixiedvc-calculator/engine/types';

import { resolveCalculatorCode } from '@/lib/resort-calculator';

import { saveStayBuilderStepOne, saveTravelerDetails, saveGuestRoster, submitStayRequest } from './actions';

type Step = 1 | 2 | 3 | 4;

type BookingDraft = {
  id: string;
  status: 'draft' | 'submitted' | string;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  primary_resort_id: string | null;
  primary_room: string | null;
  primary_view: string | null;
  requires_accessibility: boolean | null;
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
  adults: number | null;
  youths: number | null;
  accepted_terms: boolean | null;
  accepted_insurance: boolean | null;
};

type GuestRecord = {
  id?: string;
  title: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  age_category: 'adult' | 'youth' | null;
};

type GuestForm = {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ageCategory: 'adult' | 'youth';
};

type ResortOption = {
  id: string;
  slug: string;
  name: string;
  location: string | null;
  card_image?: string | null;
  calculator_code?: string | null;
};

const ROOM_LABELS: Record<string, string> = {
  STUDIO: 'Deluxe Studio',
  DUOSTUDIO: 'Tower Studio',
  DELUXESTUDIO: 'Deluxe Studio',
  ONEBR: '1-Bedroom Villa',
  TWOBR: '2-Bedroom Villa',
  TWOBRBUNGALOW: '2-Bedroom Bungalow',
  GRANDVILLA: 'Grand Villa',
  PENTHOUSE: 'Penthouse',
};

export default function StayBuilderClient({
  userEmail,
  draft,
  resorts,
  guests,
}: {
  userEmail: string;
  draft: BookingDraft;
  resorts: ResortOption[];
  guests: GuestRecord[];
}) {
  const [draftState, setDraftState] = useState(draft);
  const [guestState, setGuestState] = useState(guests);
  const [estimate, setEstimate] = useState<QuoteResult | null>(null);

  const stepOneComplete = Boolean(draftState.check_in && draftState.check_out && draftState.primary_resort_id);
  const stepTwoComplete = Boolean(draftState.lead_guest_name && draftState.lead_guest_email && draftState.address_line1);
  const stepThreeComplete = guestState.length > 0;
  const stepFourComplete = draftState.status === 'submitted';

  const initialStep: Step = (() => {
    if (!stepOneComplete) return 1;
    if (!stepTwoComplete) return 2;
    if (!stepThreeComplete) return 3;
    return 4;
  })();

  const [step, setStep] = useState<Step>(initialStep);

  const maxUnlocked: Step = (() => {
    if (!stepOneComplete) return 1;
    if (!stepTwoComplete) return 2;
    if (!stepThreeComplete) return 3;
    return 4;
  })();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pixie Stay Builder</p>
        <h1 className="text-3xl font-semibold text-slate-900">Plan your Disney stay</h1>
        <p className="text-slate-600">
          Step through dates, resorts, guest details, and policies so our concierge team can match you with the perfect DVC owner.
        </p>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Stepper
            currentStep={step}
            completed={{
              1: stepOneComplete,
              2: stepTwoComplete,
              3: stepThreeComplete,
              4: stepFourComplete,
            }}
            maxUnlocked={maxUnlocked}
            onChange={(target) => {
              if (target <= maxUnlocked) setStep(target);
            }}
          />

          {step === 1 ? (
            <StepOne
              draft={draftState}
              resorts={resorts}
              onSaved={(payload) => setDraftState((prev) => ({ ...prev, ...payload }))}
              onAdvance={() => setStep(2)}
              userEmail={userEmail}
              onEstimate={setEstimate}
            />
          ) : null}

          {step === 2 ? (
            <StepTwo
              draft={draftState}
              userEmail={userEmail}
              onSaved={(updates) => setDraftState((prev) => ({ ...prev, ...updates }))}
              onAdvance={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          ) : null}

          {step === 3 ? (
            <StepThree
              draft={draftState}
              guests={guestState}
              onSaved={(guestPayload, draftPayload) => {
                setGuestState(guestPayload);
                setDraftState((prev) => ({ ...prev, ...draftPayload }));
              }}
              onAdvance={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          ) : null}

          {step === 4 ? (
            <StepFour
              draft={draftState}
              onSubmit={() => setDraftState((prev) => ({ ...prev, status: 'submitted', accepted_terms: true }))}
              onBack={() => setStep(3)}
            />
          ) : null}
        </div>

        <SummaryPanel draft={draftState} guests={guestState} resorts={resorts} estimate={estimate} />
      </section>
    </div>
  );
}

function Stepper({
  currentStep,
  completed,
  maxUnlocked,
  onChange,
}: {
  currentStep: Step;
  completed: Record<Step, boolean>;
  maxUnlocked: Step;
  onChange: (step: Step) => void;
}) {
  const steps: { label: string; step: Step }[] = [
    { label: 'Dates & Resorts', step: 1 },
    { label: 'Traveler Details', step: 2 },
    { label: 'Guest Roster', step: 3 },
    { label: 'Policies & Deposit', step: 4 },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
      {steps.map(({ label, step }) => {
        const isActive = currentStep === step;
        const isComplete = completed[step];
        const disabled = step > maxUnlocked;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(step)}
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition ${
                isComplete ? 'border-emerald-600 bg-emerald-600 text-white' : isActive ? 'border-slate-900 text-slate-900' : 'border-slate-300'
              } ${disabled ? 'opacity-40' : ''}`}
            >
              {isComplete ? '✓' : step}
            </button>
            <span className={isActive ? 'font-semibold text-slate-900' : ''}>{label}</span>
            {step < 4 ? <div className="mx-2 hidden h-px w-8 bg-slate-200 lg:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepOne({
  draft,
  resorts,
  userEmail,
  onSaved,
  onAdvance,
  onEstimate,
}: {
  draft: BookingDraft;
  resorts: ResortOption[];
  userEmail: string;
  onSaved: (payload: Partial<BookingDraft>) => void;
  onAdvance: () => void;
  onEstimate: (quote: QuoteResult | null) => void;
}) {
  const [checkIn, setCheckIn] = useState(draft.check_in ?? '');
  const [checkOut, setCheckOut] = useState(draft.check_out ?? '');
  const [resortId, setResortId] = useState(draft.primary_resort_id ?? '');
  const [roomCode, setRoomCode] = useState<RoomCode | ''>((draft.primary_room as RoomCode) ?? '');
  const [viewCode, setViewCode] = useState<ViewCode | ''>((draft.primary_view as ViewCode) ?? '');
  const [requiresAccessibility, setRequiresAccessibility] = useState<boolean>(draft.requires_accessibility ?? false);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localEstimate, setLocalEstimate] = useState<QuoteResult | null>(null);

  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  const selectedResort = useMemo(() => (resortId ? resorts.find((resort) => resort.id === resortId) ?? null : null), [resortId, resorts]);
  const calculatorCode = resolveCalculatorCode(selectedResort);
  const calculatorMeta = useMemo(() => CalculatorResorts.find((meta) => meta.code === calculatorCode) ?? null, [calculatorCode]);

  useEffect(() => {
    if (!calculatorMeta) {
      setRoomCode('');
      setViewCode('');
      return;
    }
    const rooms = calculatorMeta.roomTypes as RoomCode[];
    if (!rooms.length) {
      setRoomCode('');
      setViewCode('');
      return;
    }
    const nextRoom = roomCode && rooms.includes(roomCode) ? roomCode : rooms[0];
    setRoomCode(nextRoom);
    const views = calculatorMeta.viewsByRoom[nextRoom] as ViewCode[];
    const nextView = viewCode && views?.includes(viewCode) ? viewCode : views?.[0] ?? '';
    setViewCode(nextView);
  }, [calculatorMeta, roomCode, viewCode]);

  useEffect(() => {
    if (!calculatorMeta || !roomCode || !viewCode || !checkIn || !nights) {
      setCalcError(null);
      setLocalEstimate(null);
      onEstimate(null);
      return;
    }
    try {
      const quote = quoteStay({ resortCode: calculatorMeta.code, room: roomCode as RoomCode, view: viewCode as ViewCode, checkIn, nights });
      setCalcError(null);
      setLocalEstimate(quote);
      onEstimate(quote);
    } catch (error) {
      console.error('Estimator error', error);
      setCalcError('Pricing data unavailable for this combination. Try a different view or contact concierge.');
      setLocalEstimate(null);
      onEstimate(null);
    }
  }, [calculatorMeta, roomCode, viewCode, checkIn, nights, onEstimate]);

  function handleSave() {
    if (!checkIn || !checkOut || !resortId || !roomCode || !viewCode) {
      setErrorMessage('Select dates, resort, room, and view to continue.');
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      try {
        const result = await saveStayBuilderStepOne({
          bookingId: draft.id,
          checkIn,
          checkOut,
          resortId,
          requiresAccessibility,
          roomType: roomCode,
          viewCode,
        });
        onSaved({
          check_in: checkIn,
          check_out: checkOut,
          nights: result.nights ?? null,
          primary_resort_id: resortId,
          primary_room: roomCode,
          primary_view: viewCode,
          requires_accessibility: requiresAccessibility,
        });
        setSavingMessage('Saved!');
        setTimeout(() => setSavingMessage(null), 3000);
        onAdvance();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to save selection.');
      }
    });
  }

  const viewOptions = useMemo(() => {
    if (!calculatorMeta || !roomCode) return [];
    return (calculatorMeta.viewsByRoom[roomCode] ?? []) as ViewCode[];
  }, [calculatorMeta, roomCode]);

  const selectedViewName = calculatorMeta && viewCode ? calculatorMeta.viewNames?.[viewCode] ?? viewCode : viewCode;
  const selectedRoomLabel = roomCode ? ROOM_LABELS[roomCode] ?? roomCode : 'Room preference';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 1</p>
        <h2 className="text-2xl font-semibold text-slate-900">Choose your dates & resort</h2>
        <p className="text-sm text-slate-600">Pick dates, resort, and villa type. Pricing preview updates as you go.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Check-in date
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Check-out date
          <input
            type="date"
            value={checkOut}
            min={checkIn || undefined}
            onChange={(event) => setCheckOut(event.target.value)}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>
      <p className="text-sm text-slate-500">{nights ? `${nights} night stay` : 'Select both dates to see nights.'}</p>

      <div>
        <p className="text-sm font-semibold text-slate-800">Select your first-choice resort</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {resorts.map((resort) => (
            <button
              key={resort.id}
              type="button"
              onClick={() => setResortId(resort.id)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition hover:border-emerald-500 ${
                resortId === resort.id ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200'
              }`}
            >
              <p className="font-semibold">{resort.name}</p>
              <p className="text-xs text-slate-500">{resort.location ?? '—'}</p>
            </button>
          ))}
        </div>
      </div>

      {calculatorMeta ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Room type
            <select
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value as RoomCode)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            >
              {calculatorMeta.roomTypes.map((room) => (
                <option key={room} value={room}>
                  {ROOM_LABELS[room] ?? room}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            View
            <select
              value={viewCode}
              onChange={(event) => setViewCode(event.target.value as ViewCode)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            >
              {viewOptions.map((view) => (
                <option key={view} value={view}>
                  {calculatorMeta.viewNames?.[view] ?? view}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : selectedResort ? (
        <p className="text-xs text-amber-600">Mapping for this resort is still being configured. We’ll surface pricing soon.</p>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Do you require wheelchair accessibility?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRequiresAccessibility(true)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              requiresAccessibility ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setRequiresAccessibility(false)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${
              !requiresAccessibility ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'
            }`}
          >
            No
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="text-sm font-semibold text-slate-900">Stay estimate</p>
        {calcError ? (
          <p className="text-sm text-rose-600">{calcError}</p>
        ) : localEstimate ? (
          <div className="space-y-1 text-sm">
            <p>
              {nights} nights in {selectedRoomLabel} · {selectedViewName}
            </p>
            <p>
              <span className="text-lg font-semibold text-slate-900">{localEstimate.totalPoints.toLocaleString()} pts</span>
              {` · approx $${localEstimate.totalUSD.toLocaleString()}`}
            </p>
            <p className="text-xs text-slate-500">Includes PixieDVC service fee and nightly point charts. We’ll confirm final pricing after matching.</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Choose dates, resort, room, and view to preview pricing.</p>
        )}
      </div>

      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Signed in as <span className="font-semibold text-slate-900">{userEmail || 'guest'}</span>. We’ll auto-fill traveler details on the next step.
      </div>

      {savingMessage ? <p className="text-sm text-emerald-600">{savingMessage}</p> : null}
      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

      <div className="flex items-center justify-end gap-3 text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" disabled>
          Previous
        </button>
        <button
          type="button"
          className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          disabled={!checkIn || !checkOut || !resortId || !roomCode || !viewCode || isPending}
          onClick={handleSave}
        >
          {isPending ? 'Saving…' : 'Save step 1'}
        </button>
      </div>
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
    title: title ?? 'Mr.',
    firstName: firstName ?? '',
    lastName: lastName ?? '',
    email: draft.lead_guest_email ?? userEmail,
    confirmEmail: draft.lead_guest_email ?? userEmail,
    phone: draft.lead_guest_phone ?? '',
    addressLine1: draft.address_line1 ?? '',
    addressLine2: draft.address_line2 ?? '',
    city: draft.city ?? '',
    state: draft.state ?? '',
    postalCode: draft.postal_code ?? '',
    country: draft.country ?? 'United States',
    marketingSource: draft.marketing_source ?? '',
    notes: draft.comments ?? '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    if (!form.firstName || !form.lastName || !form.email || !form.phone || !form.addressLine1 || !form.city || !form.postalCode) {
      setError('Please complete the required fields.');
      return;
    }
    if (form.email !== form.confirmEmail) {
      setError('Emails do not match.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveTravelerDetails({
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
        setMessage('Traveler details saved.');
        setTimeout(() => setMessage(null), 3000);
        onAdvance();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save traveler details.');
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
          <select value={form.title} onChange={(event) => update('title', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
            {['Mr.', 'Ms.', 'Mx.', 'Mrs.', 'Dr.'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          First name
          <input value={form.firstName} onChange={(event) => update('firstName', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Last name
          <input value={form.lastName} onChange={(event) => update('lastName', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Phone
          <input value={form.phone} onChange={(event) => update('phone', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Email
          <input type="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Confirm email
          <input type="email" value={form.confirmEmail} onChange={(event) => update('confirmEmail', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Address line 1
          <input value={form.addressLine1} onChange={(event) => update('addressLine1', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Address line 2 (optional)
          <input value={form.addressLine2} onChange={(event) => update('addressLine2', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          City
          <input value={form.city} onChange={(event) => update('city', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          State / Province
          <input value={form.state} onChange={(event) => update('state', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Postal code
          <input value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Country
          <input value={form.country} onChange={(event) => update('country', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
      </div>

      <label className="text-sm font-medium text-slate-700">
        How did you hear about PixieDVC? (optional)
        <input value={form.marketingSource} onChange={(event) => update('marketingSource', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Additional notes (optional)
        <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 p-3 text-sm" rows={4} />
      </label>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" onClick={onBack}>
          ← Back to Step 1
        </button>
        <button className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}

function StepThree({
  draft,
  guests,
  onSaved,
  onAdvance,
  onBack,
}: {
  draft: BookingDraft;
  guests: GuestRecord[];
  onSaved: (guests: GuestRecord[], draftPayload: Partial<BookingDraft>) => void;
  onAdvance: () => void;
  onBack: () => void;
}) {
  const leadGuest = parseName(draft.lead_guest_name);
  const initialForms: GuestForm[] = guests.length
    ? guests.map((guest) => ({
        id: guest.id,
        title: guest.title ?? 'Mr.',
        firstName: guest.first_name ?? '',
        lastName: guest.last_name ?? '',
        email: guest.email ?? '',
        phone: guest.phone ?? '',
        ageCategory: guest.age_category === 'youth' ? 'youth' : 'adult',
      }))
    : [
        {
          title: leadGuest.title ?? 'Mr.',
          firstName: leadGuest.firstName ?? '',
          lastName: leadGuest.lastName ?? '',
          email: draft.lead_guest_email ?? '',
          phone: draft.lead_guest_phone ?? '',
          ageCategory: 'adult',
        },
      ];

  const [forms, setForms] = useState<GuestForm[]>(initialForms);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateForm(index: number, patch: Partial<GuestForm>) {
    setForms((prev) => prev.map((entry, idx) => (idx === index ? { ...entry, ...patch } : entry)));
  }

  function addGuest(ageCategory: 'adult' | 'youth') {
    setForms((prev) => [...prev, { title: 'Mr.', firstName: '', lastName: '', email: '', phone: '', ageCategory }]);
  }

  function removeGuest(index: number) {
    setForms((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleSave() {
    const sanitized = forms.filter((guest) => guest.firstName.trim() && guest.lastName.trim());
    if (!sanitized.length) {
      setError('Add at least one guest.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await saveGuestRoster({
          bookingId: draft.id,
          guests: sanitized.map((guest) => ({
            title: guest.title,
            firstName: guest.firstName,
            lastName: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            ageCategory: guest.ageCategory,
          })),
        });
        setMessage('Guest roster saved.');
        setTimeout(() => setMessage(null), 3000);
        onSaved(
          sanitized.map((guest) => ({
            title: guest.title,
            first_name: guest.firstName,
            last_name: guest.lastName,
            email: guest.email,
            phone: guest.phone,
            age_category: guest.ageCategory,
          })),
          {
            adults: sanitized.filter((guest) => guest.ageCategory === 'adult').length,
            youths: sanitized.filter((guest) => guest.ageCategory === 'youth').length,
          },
        );
        onAdvance();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to save guest roster.');
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
              <label className="text-xs font-semibold text-slate-600">
                Age group
                <select
                  value={guest.ageCategory}
                  onChange={(event) => updateForm(index, { ageCategory: event.target.value as 'adult' | 'youth' })}
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="adult">Adult (18+)</option>
                  <option value="youth">Youth (17 or younger)</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Title
                <select value={guest.title} onChange={(event) => updateForm(index, { title: event.target.value })} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm">
                  {['Mr.', 'Ms.', 'Mx.', 'Mrs.', 'Dr.'].map((option) => (
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
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => addGuest('adult')}>
          + Add adult guest
        </button>
        <button type="button" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold" onClick={() => addGuest('youth')}>
          + Add youth guest
        </button>
      </div>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" onClick={onBack}>
          ← Back to Step 2
        </button>
        <button className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60" type="button" disabled={isPending} onClick={handleSave}>
          {isPending ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}

function StepFour({
  draft,
  onSubmit,
  onBack,
}: {
  draft: BookingDraft;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const [acceptTerms, setAcceptTerms] = useState(draft.accepted_terms ?? false);
  const [ackInsurance, setAckInsurance] = useState(draft.accepted_insurance ?? false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitStayRequest({ bookingId: draft.id, acceptTerms, acknowledgeInsurance: ackInsurance });
        setMessage('Request submitted! Our concierge team will reach out within 24 hours.');
        setTimeout(() => setMessage(null), 5000);
        onSubmit();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to submit request.');
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Step 4</p>
        <h2 className="text-2xl font-semibold text-slate-900">Policies & deposit</h2>
        <p className="text-sm text-slate-600">Review the cancellation terms before sending your request to our concierge team.</p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Quick summary</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Deposit invoiced after we confirm availability. Fully refundable if we can’t match your stay.</li>
          <li>Payment is due in full within 24 hours of match notification.</li>
          <li>Each guest must travel with the same legal name shown above for check-in.</li>
        </ul>
      </div>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={acceptTerms} onChange={(event) => setAcceptTerms(event.target.checked)} />
        <span>
          I agree to the PixieDVC rental terms, cancellation policy, and acknowledge that this request is for accommodations only (tickets, dining, and
          transfers are not included).
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={ackInsurance} onChange={(event) => setAckInsurance(event.target.checked)} />
        <span>
          I understand that PixieDVC recommends optional travel insurance from a third-party provider and that deposits may be forfeited if I cancel
          within 14 days of travel.
        </span>
      </label>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="flex items-center justify-between text-sm text-slate-500">
        <button className="rounded-full border border-slate-200 px-4 py-2" type="button" onClick={onBack}>
          ← Back to Step 3
        </button>
        <button
          className="rounded-full bg-emerald-600 px-5 py-2 font-semibold text-white disabled:opacity-60"
          type="button"
          disabled={!acceptTerms || !ackInsurance || isPending}
          onClick={handleSubmit}
        >
          {isPending ? 'Submitting…' : 'Submit request'}
        </button>
      </div>
    </div>
  );
}

function SummaryPanel({ draft, guests, resorts, estimate }: { draft: BookingDraft; guests: GuestRecord[]; resorts: ResortOption[]; estimate: QuoteResult | null }) {
  const resort = resorts.find((item) => item.id === draft.primary_resort_id);
  return (
    <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Stay summary</p>
        <p className="text-sm text-slate-600">We’ll keep this updated as you complete each step.</p>
      </div>
      <dl className="space-y-3 text-sm text-slate-600">
        <SummaryRow label="Check-in" value={draft.check_in ?? 'TBD'} />
        <SummaryRow label="Check-out" value={draft.check_out ?? 'TBD'} />
        <SummaryRow label="Nights" value={draft.nights ? `${draft.nights}` : 'TBD'} />
        <SummaryRow label="Primary resort" value={resort?.name ?? 'Select a resort'} hint={resort?.location ?? undefined} />
        <SummaryRow label="Accessibility" value={draft.requires_accessibility ? 'Required' : 'No'} />
        <SummaryRow label="Lead guest" value={draft.lead_guest_name ?? 'Pending'} hint={draft.lead_guest_email ?? undefined} />
        <SummaryRow label="Guests" value={guests.length ? `${guests.length} traveler${guests.length === 1 ? '' : 's'}` : 'Pending'} />
        <SummaryRow label="Status" value={draft.status === 'submitted' ? 'Submitted' : 'Draft'} />
        {draft.primary_room ? <SummaryRow label="Room" value={ROOM_LABELS[draft.primary_room] ?? draft.primary_room} /> : null}
        {draft.primary_view ? <SummaryRow label="View" value={draft.primary_view} /> : null}
      </dl>
      {estimate ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]">Latest estimate</p>
          <p className="text-lg font-bold">{estimate.totalPoints.toLocaleString()} points</p>
          <p className="text-sm">≈ ${estimate.totalUSD.toLocaleString()} (includes {estimate.feePct}% service fee)</p>
        </div>
      ) : null}
      <Link href="/guest" className="text-sm font-semibold text-indigo-600">
        Return to guest dashboard →
      </Link>
    </aside>
  );
}

function SummaryRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</dt>
      <dd className="text-base font-semibold text-slate-900">{value}</dd>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function parseName(fullName: string | null) {
  if (!fullName) {
    return { title: null, firstName: null, lastName: null };
  }
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) {
    return { title: null, firstName: parts[0], lastName: null };
  }
  const title = parts.length > 2 ? parts[0] : null;
  const firstName = title ? parts[1] : parts[0];
  const lastName = parts[parts.length - 1];
  return { title, firstName, lastName };
}

function calculateNights(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) {
    return undefined;
  }
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff <= 0) {
    return undefined;
  }
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
