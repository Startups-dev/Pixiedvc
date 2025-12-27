'use client';

import { FormEvent, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { setRole, saveProfile, saveOwnerContracts, saveGuestPrefs, completeOnboarding, ContractInput } from './actions';
import { createClient } from '@/lib/supabase';

type Step = 1 | 2 | 3 | 4;

type GuestPrefsInput = {
  dates_pref?: string;
  favorite_resorts?: string[];
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [role, setRoleLocal] = useState<'owner' | 'guest' | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [rolePending, setRolePending] = useState(false);
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase
      .from('resorts')
      .select('id,name')
      .order('name')
      .then(({ data }) => setResorts(data ?? []));
  }, [supabase]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-semibold text-slate-900">Let’s get you set up</h1>
      <Progress step={step} role={role} />

      {step === 1 ? (
        <RoleStep
          onPick={async (nextRole) => {
            setRoleError(null);
            setRolePending(true);
            try {
              await setRole(nextRole);
              setRoleLocal(nextRole);
              setStep(2);
            } catch (error) {
              console.error('Failed to save role', error);
              setRoleError(error instanceof Error ? error.message : 'Unable to save role. Try again.');
            } finally {
              setRolePending(false);
            }
          }}
          error={roleError}
          pending={rolePending}
        />
      ) : null}

      {step === 2 ? (
        <ProfileStep
          onNext={async (payload) => {
            await saveProfile(payload);
            setStep(3);
          }}
        />
      ) : null}

      {step === 3 && role === 'owner' ? (
        <OwnerContractsStep
          resorts={resorts}
          onNext={async (payload) => {
            await saveOwnerContracts(payload);
            setStep(4);
          }}
        />
      ) : null}

      {step === 3 && role === 'guest' ? (
        <GuestPrefsStep
          onNext={async (payload) => {
            await saveGuestPrefs(payload);
            setStep(4);
          }}
        />
      ) : null}

      {step === 4 ? (
        <FinishStep
          onFinish={async () => {
            const { next } = await completeOnboarding();
            router.replace(next || '/');
          }}
        />
      ) : null}
    </div>
  );
}

function Progress({ step, role }: { step: Step; role: string | null }) {
  const items = ['Role', 'Profile', role === 'owner' ? 'Owner' : 'Guest', 'Finish'];

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
      {items.map((label, index) => {
        const active = step > index;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${
                active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'
              }`}
            >
              {index + 1}
            </div>
            <span>{label}</span>
            {index < items.length - 1 ? <div className="w-6 border-t border-slate-200" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function RoleStep({
  onPick,
  pending,
  error,
}: {
  onPick: (role: 'owner' | 'guest') => void | Promise<void>;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-slate-700">How will you use PixieDVC?</p>
      <div className="flex gap-4">
        <button
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold transition hover:border-emerald-500"
          onClick={() => onPick('owner')}
          disabled={pending}
        >
          I’m an Owner
        </button>
        <button
          className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold transition hover:border-emerald-500"
          onClick={() => onPick('guest')}
          disabled={pending}
        >
          I’m a Guest
        </button>
      </div>
      {pending ? <p className="text-sm text-slate-500">Saving your choice…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function ProfileStep({ onNext }: { onNext: (payload: { display_name?: string; phone?: string }) => void }) {
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onNext({ display_name: displayName, phone });
      }}
    >
      <div>
        <label className="text-sm text-slate-600">Display name</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Jane Pixie"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          required
        />
      </div>
      <div>
        <label className="text-sm text-slate-600">Phone number</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="(407) 555-0199"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
        Continue
      </button>
    </form>
  );
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type ContractForm = {
  resortId: string;
  useYear: string;
  contractYear: string;
  pointsOwned: string;
  pointsAvailable: string;
};

function OwnerContractsStep({
  resorts,
  onNext,
}: {
  resorts: { id: string; name: string }[];
  onNext: (payload: ContractInput[]) => void;
}) {
  const currentYear = String(new Date().getFullYear());
  const [contracts, setContracts] = useState<ContractForm[]>([
    { resortId: '', useYear: 'January', contractYear: currentYear, pointsOwned: '', pointsAvailable: '' },
  ]);
  const totalOwned = contracts.reduce((sum, contract) => sum + (Number(contract.pointsOwned) || 0), 0);
  const totalAvailable = contracts.reduce((sum, contract) => sum + (Number(contract.pointsAvailable) || 0), 0);

  function updateContract(index: number, patch: Partial<ContractForm>) {
    setContracts((prev) => prev.map((contract, i) => (i === index ? { ...contract, ...patch } : contract)));
  }

  function addContract() {
    setContracts((prev) => [...prev, { resortId: '', useYear: 'January', contractYear: currentYear, pointsOwned: '', pointsAvailable: '' }]);
  }

  function removeContract(index: number) {
    setContracts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = contracts
      .filter((contract) => contract.resortId)
      .map((contract) => ({
        resort_id: contract.resortId,
        use_year: contract.useYear,
        contract_year: contract.contractYear ? Number(contract.contractYear) : undefined,
        points_owned: contract.pointsOwned ? Number(contract.pointsOwned) : undefined,
        points_available: contract.pointsAvailable ? Number(contract.pointsAvailable) : undefined,
      }));

    onNext(payload);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {contracts.map((contract, index) => (
        <div key={index} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-600">Contract {index + 1}</p>
            {contracts.length > 1 ? (
              <button type="button" onClick={() => removeContract(index)} className="text-xs text-rose-500">
                Remove
              </button>
            ) : null}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Home resort</label>
              <select
                value={contract.resortId}
                onChange={(event) => updateContract(index, { resortId: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                required
              >
                <option value="">Select a resort</option>
                {resorts.map((resort) => (
                  <option key={resort.id} value={resort.id}>
                    {resort.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Use year</label>
              <select
                value={contract.useYear}
                onChange={(event) => updateContract(index, { useYear: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              >
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Contract year</label>
              <input
                type="number"
                value={contract.contractYear}
                onChange={(event) => updateContract(index, { contractYear: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Points owned</label>
              <input
                type="number"
                value={contract.pointsOwned}
                onChange={(event) => updateContract(index, { pointsOwned: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Points available for rent</label>
              <input
                type="number"
                value={contract.pointsAvailable}
                onChange={(event) => updateContract(index, { pointsAvailable: event.target.value })}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={addContract} className="text-sm font-semibold text-indigo-600">
          + Add another contract
        </button>
        <div className="text-sm text-slate-600">
          <p>Total points owned: {totalOwned}</p>
          <p>Total points available: {totalAvailable}</p>
        </div>
      </div>

      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
        Continue
      </button>
    </form>
  );
}

function GuestPrefsStep({ onNext }: { onNext: (payload: GuestPrefsInput) => void }) {
  const [dates, setDates] = useState('');
  const [resorts, setResorts] = useState('');

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onNext({ dates_pref: dates, favorite_resorts: resorts.split(',').map((item) => item.trim()).filter(Boolean) });
      }}
    >
      <div>
        <label className="text-sm text-slate-600">Target dates (optional)</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="July 2025"
          value={dates}
          onChange={(event) => setDates(event.target.value)}
        />
      </div>
      <div>
        <label className="text-sm text-slate-600">Favorite resorts</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Bay Lake, Riviera, Polynesian"
          value={resorts}
          onChange={(event) => setResorts(event.target.value)}
        />
      </div>
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" type="submit">
        Continue
      </button>
    </form>
  );
}

function FinishStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-slate-700">All set! We’ll tailor the app to your role.</p>
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={onFinish}>
        Finish onboarding
      </button>
    </div>
  );
}
