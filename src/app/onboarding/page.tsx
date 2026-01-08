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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    supabase
      .from('resorts')
      .select('id,name')
      .order('name')
      .then(({ data }) => {
        const unique = new Map<string, { id: string; name: string }>();
        for (const resort of data ?? []) {
          if (!unique.has(resort.name)) {
            unique.set(resort.name, resort);
          }
        }
        setResorts([...unique.values()]);
      });

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
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
          role={role}
          userEmail={userEmail}
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
          role={role}
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

function ProfileStep({
  onNext,
  role,
  userEmail,
}: {
  onNext: (payload: {
    display_name?: string;
    full_name?: string;
    phone?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    payout_email?: string;
    payout_email_same_as_login?: boolean;
    dvc_member_last4?: string;
  }) => void;
  role: 'owner' | 'guest' | null;
  userEmail: string | null;
}) {
  const isOwner = role === 'owner';
  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [payoutEmail, setPayoutEmail] = useState(userEmail ?? '');
  const [sameAsLogin, setSameAsLogin] = useState(true);
  const [dvcLast4, setDvcLast4] = useState('');

  useEffect(() => {
    if (sameAsLogin && userEmail) {
      setPayoutEmail(userEmail);
    }
  }, [sameAsLogin, userEmail]);

  const last4 = dvcLast4.trim();
  const last4Valid = !last4 || /^[0-9]{4}$/.test(last4);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!last4Valid) {
          return;
        }
        onNext({
          display_name: displayName || undefined,
          full_name: fullName || undefined,
          phone: phone || undefined,
          address_line1: address1 || undefined,
          address_line2: address2 || undefined,
          city: city || undefined,
          region: region || undefined,
          postal_code: postalCode || undefined,
          country: country || undefined,
          payout_email: payoutEmail || undefined,
          payout_email_same_as_login: sameAsLogin,
          dvc_member_last4: last4 || undefined,
        });
      }}
    >
      <div>
        <label className="text-sm text-slate-600">Display name (optional)</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Jane Pixie"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </div>
      <div>
        <label className="text-sm text-slate-600">Full legal name</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Jane Rivera"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          required={isOwner}
        />
      </div>
      <div>
        <label className="text-sm text-slate-600">Phone number</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="(407) 555-0199"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required={isOwner}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm text-slate-600">Address line 1</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="123 Dream St"
            value={address1}
            onChange={(event) => setAddress1(event.target.value)}
            required={isOwner}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-slate-600">Address line 2</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="Unit, suite, building"
            value={address2}
            onChange={(event) => setAddress2(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">City</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            required={isOwner}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">State / Region</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            required={isOwner}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Postal code</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            required={isOwner}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Country</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            required={isOwner}
          />
        </div>
      </div>

      {isOwner ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Payout email</p>
          <div className="mt-2 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={sameAsLogin}
                onChange={(event) => setSameAsLogin(event.target.checked)}
              />
              Same as login email
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              value={payoutEmail}
              onChange={(event) => setPayoutEmail(event.target.value)}
              disabled={sameAsLogin}
              required={isOwner}
            />
            <p className="text-xs text-slate-500">
              We’ll send rental agreements and payout notices here. Change it if you want a dedicated payout email.
            </p>
          </div>
        </div>
      ) : null}

      {isOwner ? (
        <div>
          <label className="text-sm text-slate-600">DVC member ID (last 4 digits, optional)</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            maxLength={4}
            value={dvcLast4}
            onChange={(event) => setDvcLast4(event.target.value.replace(/\D/g, ''))}
          />
          {!last4Valid ? (
            <p className="mt-1 text-xs text-rose-500">Enter exactly 4 digits or leave blank.</p>
          ) : null}
        </div>
      ) : null}

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
      <HowToFindContractInfo />
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

function HowToFindContractInfo() {
  const steps = [
    {
      title: 'Step 1: Open your DVC member dashboard',
      description: 'Log in to the DVC member site and open your contract summary.',
    },
    {
      title: 'Step 2: Locate Use Year and Contract Year',
      description: 'Find the month your points reset and the contract year listed.',
    },
    {
      title: 'Step 3: Confirm points owned and available',
      description: 'Use the points balance summary to fill in totals.',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        How to find your Use Year, Contract Year, and Points in the DVC Member site
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="rounded-2xl border border-dashed border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tutorial</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
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

function FinishStep({
  onFinish,
  role,
}: {
  onFinish: () => void;
  role: 'owner' | 'guest' | null;
}) {
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (role !== 'owner') return;
    supabase
      .from('owner_verifications')
      .select('status')
      .maybeSingle()
      .then(({ data }) => {
        setVerificationStatus(data?.status ?? 'not_started');
      });
  }, [role, supabase]);

  const statusLabel =
    verificationStatus === 'approved'
      ? 'Approved'
      : verificationStatus === 'submitted'
        ? 'Submitted'
        : verificationStatus === 'rejected'
          ? 'Rejected'
          : 'Not started';

  return (
    <div className="space-y-4">
      <p className="text-lg text-slate-700">All set! We’ll tailor the app to your role.</p>
      {role === 'owner' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Verification required</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {statusLabel}
            </span>
            {verificationStatus === 'approved' ? (
              <span className="text-sm text-emerald-600">Verified ✅ You can now receive matches.</span>
            ) : verificationStatus === 'submitted' ? (
              <span className="text-sm text-slate-600">Verification submitted — we’ll review shortly.</span>
            ) : (
              <a href="/owner/verification" className="text-sm font-semibold text-indigo-600 hover:underline">
                Submit verification
              </a>
            )}
          </div>
        </div>
      ) : null}
      <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={onFinish}>
        Finish onboarding
      </button>
    </div>
  );
}
