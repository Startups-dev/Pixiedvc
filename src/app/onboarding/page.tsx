'use client';

import { FormEvent, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import {
  setRole,
  saveProfile,
  saveOwnerContracts,
  saveOwnerLegalInfo,
  saveGuestPrefs,
  completeOnboarding,
  ContractInput,
} from './actions';
import { createClient } from '@/lib/supabase';
import { getCanonicalResorts } from '@/lib/resorts/getResorts';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import VacationPointsTable, { type VacationPointsRow } from '@/components/onboarding/VacationPointsTable';

type Step = 1 | 2 | 3 | 4 | 5;

type GuestPrefsInput = {
  dates_pref?: string;
  favorite_resorts?: string[];
};

type OwnerLegalInfoInput = {
  owner_legal_full_name: string;
  co_owner_legal_full_name?: string;
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [role, setRoleLocal] = useState<'owner' | 'guest' | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [rolePending, setRolePending] = useState(false);
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const [profileData, setProfileData] = useState<{
    display_name?: string | null;
    full_name?: string | null;
    phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    payout_email?: string | null;
    payout_email_same_as_login?: boolean | null;
    dvc_member_last4?: string | null;
  } | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [ownerMemberships, setOwnerMemberships] = useState<
    Array<{
      resort_id: string | null;
      use_year: string | null;
      use_year_start: string | null;
      points_available: number | null;
      points_owned: number | null;
      borrowing_enabled?: boolean | null;
      max_points_to_borrow?: number | null;
      owner_legal_full_name?: string | null;
      co_owner_legal_full_name?: string | null;
      matching_mode?: string | null;
    }>
  >([]);
  const [ownerMembershipsLoaded, setOwnerMembershipsLoaded] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    getCanonicalResorts(supabase, { select: 'id,name,slug,calculator_code' })
      .then(setResorts)
      .catch((error) => {
        console.error('Failed to load resorts', error);
        setResorts([]);
      });

    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, [supabase]);

  useEffect(() => {
    let active = true;
    const loadOwnerMemberships = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        if (active) setOwnerMembershipsLoaded(true);
        return;
      }
    const { data, error } = await supabase
        .from('owner_memberships')
        .select(
          'resort_id, use_year, use_year_start, use_year_end, points_available, points_owned, borrowing_enabled, max_points_to_borrow, owner_legal_full_name, co_owner_legal_full_name, matching_mode',
        )
        .eq('owner_id', user.id);
      if (!active) return;
      if (error) {
        console.error('Failed to load owner memberships', error);
        setOwnerMemberships([]);
      } else {
        setOwnerMemberships(data ?? []);
      }
      setOwnerMembershipsLoaded(true);
    };
    loadOwnerMemberships();
    return () => {
      active = false;
    };
  }, [supabase]);
  useEffect(() => {
    if (step !== 2) return;
    let active = true;
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        if (active) setProfileLoaded(true);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select(
          'display_name, full_name, phone, address_line1, address_line2, city, region, postal_code, country, payout_email, payout_email_same_as_login, dvc_member_last4',
        )
        .eq('id', user.id)
        .maybeSingle();
      if (!active) return;
      setProfileData(data ?? null);
      setProfileLoaded(true);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[onboarding] loaded profile from db: {hasProfile:%s}', Boolean(data));
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [step, supabase]);

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
          profile={profileData}
          profileLoaded={profileLoaded}
          onNext={async (payload, skipSave) => {
            if (!skipSave) {
              await saveProfile(payload);
              setProfileData((prev) => ({ ...(prev ?? {}), ...payload }));
              if (process.env.NODE_ENV !== 'production') {
                console.debug('[onboarding] saved profile');
              }
            }
            setStep(3);
          }}
        />
      ) : null}

      {step === 3 && role === 'owner' ? (
        <OwnerContractsStep
          resorts={resorts}
          memberships={ownerMemberships}
          membershipsLoaded={ownerMembershipsLoaded}
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

      {step === 4 && role === 'owner' ? (
        <OwnerLegalInfoStep
          memberships={ownerMemberships}
          membershipsLoaded={ownerMembershipsLoaded}
          onNext={async (payload) => {
            await saveOwnerLegalInfo(payload);
            setStep(5);
          }}
        />
      ) : null}

      {step === 4 && role === 'guest' ? (
        <FinishStep
          role={role}
          onFinish={async (nextOverride) => {
            const { next } = await completeOnboarding();
            router.replace(nextOverride ?? next || '/');
          }}
        />
      ) : null}

      {step === 5 ? (
        <FinishStep
          role={role}
          onFinish={async (nextOverride) => {
            const { next } = await completeOnboarding();
            router.replace(nextOverride ?? next || '/');
          }}
        />
      ) : null}
    </div>
  );
}

function Progress({ step, role }: { step: Step; role: string | null }) {
  const items =
    role === 'owner'
      ? ['Role', 'Profile', 'Owner', 'Legal', 'Finish']
      : ['Role', 'Profile', 'Guest', 'Finish'];

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
      <p className="text-lg text-slate-700">Choose your path to get started.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          className="group flex h-full w-full flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:border-emerald-500 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          onClick={() => onPick('guest')}
          disabled={pending}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center self-center rounded-2xl bg-emerald-50">
            <img
              src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/icons/Guest%20Icon.png"
              alt=""
              className="h-12 w-12"
            />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">I’m planning a stay</p>
            <p className="mt-1 text-sm text-slate-600">
              Estimate points, explore resorts, and request a reservation with concierge support.
            </p>
          </div>
        </button>
        <button
          type="button"
          className="group flex h-full w-full flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-left transition hover:border-emerald-500 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          onClick={() => onPick('owner')}
          disabled={pending}
        >
          <span className="inline-flex h-12 w-12 items-center justify-center self-center rounded-2xl bg-emerald-50">
            <img
              src="https://iyfpphzlyufhndpedijv.supabase.co/storage/v1/object/public/icons/OwnerIcon.png"
              alt=""
              className="h-12 w-12"
            />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">I own DVC points</p>
            <p className="mt-1 text-sm text-slate-600">
              Rent your points through PixieDVC with verified guests and structured payouts.
            </p>
          </div>
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
  profile,
  profileLoaded,
}: {
  onNext: (
    payload: {
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
    },
    skipSave?: boolean,
  ) => void;
  role: 'owner' | 'guest' | null;
  userEmail: string | null;
  profile: {
    display_name?: string | null;
    full_name?: string | null;
    phone?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    region?: string | null;
    postal_code?: string | null;
    country?: string | null;
    payout_email?: string | null;
    payout_email_same_as_login?: boolean | null;
    dvc_member_last4?: string | null;
  } | null;
  profileLoaded: boolean;
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
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmEdit, setShowConfirmEdit] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const address1Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profileLoaded || !profile) return;
    if (isEditing) return;
    setDisplayName(profile.display_name ?? '');
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setAddress1(profile.address_line1 ?? '');
    setAddress2(profile.address_line2 ?? '');
    setCity(profile.city ?? '');
    setRegion(profile.region ?? '');
    setPostalCode(profile.postal_code ?? '');
    setCountry(profile.country ?? '');
    setPayoutEmail(profile.payout_email ?? userEmail ?? '');
    setSameAsLogin(profile.payout_email_same_as_login ?? true);
    setDvcLast4(profile.dvc_member_last4 ?? '');
  }, [profileLoaded, profile, isEditing, userEmail]);

  useEffect(() => {
    if (sameAsLogin && userEmail) {
      setPayoutEmail(userEmail);
    }
  }, [sameAsLogin, userEmail]);

  usePlacesAutocomplete({
    inputRef: address1Ref,
    debugLabel: "onboarding",
    onSelect: (address) => {
      if (address.line1) setAddress1(address.line1);
      if (address.city) setCity(address.city);
      if (address.state) setRegion(address.state);
      if (address.postalCode) setPostalCode(address.postalCode);
      if (address.country) setCountry(address.country);
    },
  });

  const last4 = dvcLast4.trim();
  const last4Valid = !last4 || /^[0-9]{4}$/.test(last4);
  const hasProfileData = Boolean(
    profile?.full_name ||
      profile?.phone ||
      profile?.address_line1 ||
      profile?.city ||
      profile?.region ||
      profile?.postal_code ||
      profile?.country,
  );
  const profileLocked = hasProfileData && !isEditing;
  const disableFields = profileLocked;

  if (!profileLoaded) {
    return <p className="text-sm text-slate-500">Loading profile…</p>;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!last4Valid) {
          return;
        }
        setSaveError(null);
        const payload = {
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
        };

        if (profileLocked) {
          await onNext(payload, true);
          return;
        }

        try {
          setIsSaving(true);
          await onNext(payload, false);
        } catch (error) {
          setSaveError(error instanceof Error ? error.message : 'Unable to save profile. Try again.');
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <p className="text-sm text-slate-500">Your profile information is saved automatically.</p>
      {profileLocked ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p>Your profile is locked to prevent accidental changes.</p>
          <button
            type="button"
            onClick={() => setShowConfirmEdit(true)}
            className="mt-2 text-xs font-semibold text-slate-600 underline"
          >
            Edit profile info
          </button>
        </div>
      ) : null}
      <div>
        <label className="text-sm text-slate-600">Display name (optional)</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Jane Pixie"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          disabled={disableFields}
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
          disabled={disableFields}
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
          disabled={disableFields}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-sm text-slate-600">Address line 1</label>
          <input
            ref={address1Ref}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="123 Dream St"
            value={address1}
            onChange={(event) => setAddress1(event.target.value)}
            required={isOwner}
            autoComplete="street-address"
            disabled={disableFields}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-slate-600">Address line 2</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            placeholder="Unit, suite, building"
            value={address2}
            onChange={(event) => setAddress2(event.target.value)}
            disabled={disableFields}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">City</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            required={isOwner}
            disabled={disableFields}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">State / Region</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            required={isOwner}
            disabled={disableFields}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Postal code</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            required={isOwner}
            disabled={disableFields}
          />
        </div>
        <div>
          <label className="text-sm text-slate-600">Country</label>
          <input
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            required={isOwner}
            disabled={disableFields}
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
                disabled={disableFields}
              />
              Same as login email
            </label>
            <input
              className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              value={payoutEmail}
              onChange={(event) => setPayoutEmail(event.target.value)}
              disabled={sameAsLogin}
              required={isOwner}
              readOnly={disableFields}
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
            disabled={disableFields}
          />
          {!last4Valid ? (
            <p className="mt-1 text-xs text-rose-500">Enter exactly 4 digits or leave blank.</p>
          ) : null}
        </div>
      ) : null}

      {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
      <button
        className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        type="submit"
        disabled={isSaving}
      >
        Continue
      </button>

      {showConfirmEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg">
            <h3 className="text-base font-semibold text-slate-900">Edit profile information?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Changing your legal name or address may affect agreements and payouts. Continue?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                onClick={() => setShowConfirmEdit(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                onClick={() => {
                  setShowConfirmEdit(false);
                  setIsEditing(true);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
const FIXED_USE_YEARS = [2025, 2026, 2027] as const;

function createDefaultYearMap() {
  return FIXED_USE_YEARS.reduce<Record<number, { available: number; holding: number }>>((acc, year) => {
    acc[year] = { available: 0, holding: 0 };
    return acc;
  }, {});
}

type ContractForm = {
  resortId: string;
  useYearMonth: string;
  years: Record<number, { available: number; holding: number }>;
  borrowing: { enabled: boolean; maxBorrow: number };
  fastMove: boolean;
  helpOpen: boolean;
};

function OwnerContractsStep({
  resorts,
  memberships,
  membershipsLoaded,
  onNext,
}: {
  resorts: { id: string; name: string }[];
  memberships: Array<{
    resort_id: string | null;
    use_year: string | null;
    use_year_start: string | null;
    points_available: number | null;
    points_owned: number | null;
    borrowing_enabled?: boolean | null;
    max_points_to_borrow?: number | null;
    matching_mode?: string | null;
  }>;
  membershipsLoaded: boolean;
  onNext: (payload: {
    contracts: ContractInput[];
    matching_mode: 'premium_only' | 'premium_then_standard';
    allow_standard_rate_fallback: boolean;
  }) => void;
}) {
  const currentYear = String(new Date().getFullYear());
  const [pricingAcknowledged, setPricingAcknowledged] = useState(false);
  const [matchingMode, setMatchingMode] = useState<'premium_only' | 'premium_then_standard'>('premium_only');
  const [contracts, setContracts] = useState<ContractForm[]>([
    {
      resortId: '',
      useYearMonth: '',
      years: createDefaultYearMap(),
      borrowing: { enabled: false, maxBorrow: 0 },
      fastMove: false,
      helpOpen: false,
    },
  ]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!membershipsLoaded) return;
    if (!memberships.length) {
      hydratedRef.current = true;
      return;
    }

    const grouped = new Map<string, ContractForm>();
    for (const membership of memberships) {
      if (!membership.resort_id || !membership.use_year || !membership.use_year_start) continue;
      const key = `${membership.resort_id}:${membership.use_year}`;
      const useYearStart = new Date(membership.use_year_start);
      if (Number.isNaN(useYearStart.getTime())) continue;
      const yearKey = useYearStart.getUTCFullYear();
      const available = membership.points_available ?? 0;
      const owned = membership.points_owned ?? available;
      const holding = Math.max(owned - available, 0);

      if (!grouped.has(key)) {
        grouped.set(key, {
          resortId: membership.resort_id,
          useYearMonth: membership.use_year,
          years: createDefaultYearMap(),
          borrowing: {
            enabled: Boolean(membership.borrowing_enabled),
            maxBorrow: membership.max_points_to_borrow ?? 0,
          },
          fastMove: false,
          helpOpen: false,
        });
      }

      const existing = grouped.get(key)!;
      existing.years[yearKey] = { available, holding };
      if (membership.matching_mode === 'premium_then_standard') {
        setMatchingMode('premium_then_standard');
      }
    }

    const nextContracts = Array.from(grouped.values());
    if (nextContracts.length) {
      setContracts(nextContracts);
    }
    hydratedRef.current = true;
  }, [memberships, membershipsLoaded]);
  const totalOwned = contracts.reduce((sum, contract) => {
    return (
      sum +
      Object.values(contract.years).reduce(
        (innerSum, row) => innerSum + (Number(row.available) || 0) + (Number(row.holding) || 0),
        0,
      )
    );
  }, 0);
  const totalAvailable = contracts.reduce((sum, contract) => {
    return (
      sum +
      Object.values(contract.years).reduce((innerSum, row) => innerSum + (Number(row.available) || 0), 0)
    );
  }, 0);

  function updateContract(index: number, patch: Partial<ContractForm>) {
    setContracts((prev) => prev.map((contract, i) => (i === index ? { ...contract, ...patch } : contract)));
  }

  function addContract() {
    setContracts((prev) => [
      ...prev,
      {
        resortId: '',
        useYearMonth: '',
        years: createDefaultYearMap(),
        borrowing: { enabled: false, maxBorrow: 0 },
        fastMove: false,
        helpOpen: false,
      },
    ]);
  }

  function removeContract(index: number) {
    setContracts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload: ContractInput[] = [];
    const today = new Date();

    for (const contract of contracts) {
      if (!contract.resortId || !contract.useYearMonth) continue;
      const monthIndex = MONTHS.findIndex((month) => month === contract.useYearMonth);
      if (monthIndex < 0) continue;
      const pointsRows = FIXED_USE_YEARS.map((year) => {
        const row = contract.years[year] ?? { available: 0, holding: 0 };
        return {
          use_year: year,
          available: Math.max(0, Number(row.available) || 0),
          holding: Math.max(0, Number(row.holding) || 0),
        };
      });
      const pointsAvailable = pointsRows.reduce((sum, row) => sum + row.available, 0);
      const pointsOwned = pointsRows.reduce((sum, row) => sum + row.available + row.holding, 0);
      const useYearStart = new Date(Date.UTC(today.getFullYear(), monthIndex, 1));
      payload.push({
        resort_id: contract.resortId,
        use_year: contract.useYearMonth,
        use_year_start: useYearStart.toISOString().slice(0, 10),
        points_owned: pointsOwned,
        points_available: pointsAvailable,
        borrowing_enabled: contract.borrowing.enabled,
        max_points_to_borrow: contract.borrowing.enabled ? contract.borrowing.maxBorrow : 0,
        vacation_points: pointsRows,
      });
    }

    onNext({
      contracts: payload,
      matching_mode: matchingMode,
      allow_standard_rate_fallback: matchingMode === 'premium_then_standard',
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Owner basics</p>
        <div className="mt-2 space-y-2">
          <span className="inline-flex rounded-full bg-[#0B1B3A]/10 px-3 py-1 text-xs font-semibold text-[#0B1B3A]">
            How DVC booking windows work
          </span>
          <p>DVC has two booking windows:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Premium window — bookings made more than 7 months before check-in</li>
            <li>Standard window — bookings made 7 months or less before check-in</li>
          </ul>
          <p>Premium bookings usually:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Have better availability</li>
            <li>Are easier to secure</li>
            <li>Work best for popular dates and room types</li>
          </ul>
          <p>
            Point value can change based on timing and demand. PixieDVC will always confirm details with you before
            moving forward.
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How matching works</p>
        <div className="mt-3 space-y-2">
          <span className="inline-flex rounded-full bg-[#0B1B3A]/10 px-3 py-1 text-xs font-semibold text-[#0B1B3A]">
            How your points are used
          </span>
          <p>If your points qualify for Premium bookings:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>We first try to place them in higher-value Premium reservations</li>
            <li>If a Premium match isn’t available, your points can be used for Standard reservations</li>
          </ul>
          <p>If a Premium booking isn’t possible, allow us to try Standard bookings so you match faster?</p>
        </div>
        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="matching-mode"
              className="mt-1 h-4 w-4"
              checked={matchingMode === 'premium_only'}
              onChange={() => setMatchingMode('premium_only')}
            />
            <span>Only use my points for Premium bookings</span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="matching-mode"
              className="mt-1 h-4 w-4"
              checked={matchingMode === 'premium_then_standard'}
              onChange={() => setMatchingMode('premium_then_standard')}
            />
            <span>Try Premium first, then allow Standard bookings if needed</span>
          </label>
          <p className="text-xs text-slate-500">(Allowing Standard bookings may help your points rent faster.)</p>
        </div>
        <p className="mt-3">We never book your points without your approval.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">How pricing works</p>
        <div className="mt-3 space-y-2">
          <span className="inline-flex rounded-full bg-[#0B1B3A]/10 px-3 py-1 text-xs font-semibold text-[#0B1B3A]">
            Typical point rates
          </span>
          <p>Standard window (7 months or less):</p>
          <p className="font-semibold text-slate-700">$16 per point</p>
          <p>Premium window (more than 7 months):</p>
          <p className="font-semibold text-slate-700">$18 per point</p>
          <p>
            Some stays — such as holidays, premium views, or high-demand room types — may qualify for higher concierge
            pricing.
          </p>
          <p>Final pricing depends on:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Booking window (Premium vs Standard)</li>
            <li>Date flexibility</li>
            <li>Overall demand at the time of booking</li>
          </ul>
          <p>Our goal is simple: price your points fairly to maximize successful rentals, not just list them.</p>
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
            checked={pricingAcknowledged}
            onChange={(event) => setPricingAcknowledged(event.target.checked)}
          />
          I understand pricing depends on booking window and demand.
        </label>
      </div>
      <HowToFindContractInfo />
      {contracts.map((contract, index) => {
        const showTable = true;
        const currentRow = contract.years[2025] ?? { available: 0, holding: 0 };

        return (
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
              <label className="text-xs font-semibold text-slate-500">Resort</label>
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
              <label className="text-xs font-semibold text-slate-500">What is the Use Year for this contract?</label>
              <select
                value={contract.useYearMonth}
                onChange={(event) => {
                  const nextMonth = event.target.value;
                  updateContract(index, { useYearMonth: nextMonth });
                }}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select month</option>
                {MONTHS.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">This is the month when new points are added to your account.</p>
              <button
                type="button"
                onClick={() => updateContract(index, { helpOpen: !contract.helpOpen })}
                className="mt-2 text-xs font-semibold text-slate-500 underline"
              >
                Don’t know your Use Year?
              </button>
            </div>
          </div>

          {contract.helpOpen ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Guided help</p>
              <div className="mt-2 space-y-2">
                <p>Log in to the DVC member site.</p>
                <p>Go to Vacation Points → Points Overview.</p>
                <p>Find the “Eligible for Travel” date range.</p>
                <p>The start month of that range is the Use Year.</p>
                <p>
                  If you see “Eligible for Travel: Sep 1, 2025 – Aug 31, 2026”, your Use Year month is September.
                </p>
                <p>Use Years are named for the year they start, not the year they end.</p>
              </div>
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">Optional AI assist</p>
                <p className="mt-1 text-xs text-slate-500">
                  Upload a screenshot to auto-detect your Use Year. Used only to pre-fill data — you must confirm
                  before saving. Images are not stored after processing.
                </p>
                <input type="file" accept="image/*" className="mt-2 text-xs" />
              </div>
            </div>
          ) : null}

          {showTable ? (
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={contract.borrowing.enabled}
                  onChange={(event) =>
                    updateContract(index, {
                      borrowing: {
                        ...contract.borrowing,
                        enabled: event.target.checked,
                        maxBorrow: event.target.checked ? contract.borrowing.maxBorrow : 0,
                      },
                    })
                  }
                />
                <span>I’m willing to borrow points from next year</span>
              </label>
              <p className="text-xs text-slate-500">Borrowing lets you use some of next year’s points for a booking sooner.</p>
              {contract.borrowing.enabled ? (
                <div>
                  <label className="text-xs font-semibold text-slate-500">Maximum points I’m willing to borrow</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    placeholder="0"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm"
                    value={contract.borrowing.maxBorrow}
                    onChange={(event) => {
                      const nextValue = Math.max(0, Number(event.target.value) || 0);
                      updateContract(index, { borrowing: { ...contract.borrowing, maxBorrow: nextValue } });
                    }}
                  />
                  <p className="mt-1 text-xs text-slate-500">We’ll never borrow more than this without asking.</p>
                  <p className="mt-1 text-xs text-slate-400">You can adjust this after you enter your points.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {showTable ? (
            <div className="mt-4">
              <VacationPointsTable
                value={FIXED_USE_YEARS.map((year) => ({
                  useYear: year,
                  available: contract.years[year]?.available ?? 0,
                  holding: contract.years[year]?.holding ?? 0,
                }))}
                onChange={(rows: VacationPointsRow[]) => {
                  const nextYears = { ...contract.years };
                  rows.forEach((row) => {
                    nextYears[row.useYear] = { available: row.available, holding: row.holding };
                  });
                  updateContract(index, { years: nextYears });
                }}
              />

              {Number(currentRow.available) > 0 ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p>⚠️ These points are close to expiration.</p>
                  <p className="mt-1">Points in this window often rent best when priced for a quick match.</p>
                  <label className="mt-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-amber-300"
                      checked={contract.fastMove}
                      onChange={(event) => updateContract(index, { fastMove: event.target.checked })}
                    />
                    <span>Place these points in Fast-Move / Liquidation listings</span>
                  </label>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-slate-500">
                Enter the numbers exactly as shown in your DVC Vacation Points dashboard.
              </p>
            </div>
          ) : null}
        </div>
      );})}

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
      description: 'Log in to the DVC member website and open your Contract Summary page.',
    },
    {
      title: 'Step 2: Find your Use Year',
      description: 'Locate the month your points reset each year (your Use Year). This tells you when new points are added to your account.',
    },
    {
      title: 'Step 3: Check your available points by year',
      description: 'Review your Points Balance Summary to see how many points you have available for each year. For example: 2025: 98 points, 2026: 120 points, 2027: 120 points. Use these numbers when entering your points into PixieDVC.',
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
            <p className="mt-2 text-sm font-semibold text-slate-900">{step.title}</p>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OwnerLegalInfoStep({
  memberships,
  membershipsLoaded,
  onNext,
}: {
  memberships: Array<{
    owner_legal_full_name?: string | null;
    co_owner_legal_full_name?: string | null;
  }>;
  membershipsLoaded: boolean;
  onNext: (payload: OwnerLegalInfoInput) => void;
}) {
  const [ownerLegalName, setOwnerLegalName] = useState('');
  const [coOwnerLegalName, setCoOwnerLegalName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!membershipsLoaded) return;
    const existing = memberships.find(
      (membership) => membership.owner_legal_full_name || membership.co_owner_legal_full_name,
    );
    if (existing) {
      setOwnerLegalName(existing.owner_legal_full_name ?? '');
      setCoOwnerLegalName(existing.co_owner_legal_full_name ?? '');
    }
    hydratedRef.current = true;
  }, [memberships, membershipsLoaded]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = ownerLegalName.trim();
        if (!trimmed) {
          setError('Legal owner name is required.');
          return;
        }
        setError(null);
        onNext({
          owner_legal_full_name: trimmed,
          co_owner_legal_full_name: coOwnerLegalName.trim() || undefined,
        });
      }}
    >
      <div>
        <label className="text-sm text-slate-600">Legal owner full name</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Jane Rivera"
          value={ownerLegalName}
          onChange={(event) => setOwnerLegalName(event.target.value)}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Enter the full legal name exactly as it appears on your Disney Vacation Club contract.
        </p>
      </div>
      <div>
        <label className="text-sm text-slate-600">Co-owner legal full name (optional)</label>
        <input
          className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          placeholder="Second owner name"
          value={coOwnerLegalName}
          onChange={(event) => setCoOwnerLegalName(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">If your DVC contract has a second owner.</p>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
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

function FinishStep({
  onFinish,
  role,
}: {
  onFinish: (next?: string) => void;
  role: 'owner' | 'guest' | null;
}) {
  return (
    <div className="space-y-4">
      <p className="text-lg text-slate-700">
        You&apos;re all set! Your account is ready. We&apos;ll verify your first reservation automatically when a booking
        is completed.
      </p>
      {role === 'guest' ? (
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => onFinish('/calculator')}
          >
            Start guided planning
          </button>
          <button
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
            onClick={() => onFinish('/resorts')}
          >
            Browse resorts
          </button>
        </div>
      ) : (
        <button className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => onFinish()}>
          Finish onboarding
        </button>
      )}
    </div>
  );
}
