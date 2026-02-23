'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase';
import { getCanonicalResorts } from '@/lib/resorts/getResorts';
import VacationPointsTable, { type VacationPointsRow } from '@/components/onboarding/VacationPointsTable';

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

function defaultVacationPoints(): VacationPointsRow[] {
  return FIXED_USE_YEARS.map((year) => ({ useYear: year, available: 0, holding: 0 }));
}

export default function OwnerOnboarding() {
  const supabase = createClient();
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const [memberships, setMemberships] = useState<
    { id?: string | number | null; resortId: string; useYear: string; pointsOwned: number; vacationPoints: VacationPointsRow[] }[]
  >([{ resortId: '', useYear: 'February', pointsOwned: 0, vacationPoints: defaultVacationPoints() }]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [ownerLegalName, setOwnerLegalName] = useState('');
  const [coOwnerLegalName, setCoOwnerLegalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getCanonicalResorts(supabase, { select: 'id,name,slug,calculator_code' })
      .then(setResorts)
      .catch((error) => {
        console.error('Failed to load resorts', error);
        setResorts([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const { data: existingMemberships } = await supabase
        .from('owner_memberships')
        .select('id, owner_legal_full_name, co_owner_legal_full_name, resort_id, use_year, points_owned')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });
      if (existingMemberships?.length) {
        const membershipIds = existingMemberships
          .map((membership) => membership.id)
          .filter((id): id is number => typeof id === 'number');
        const { data: pointsRows } = membershipIds.length
          ? await supabase
              .from('owner_membership_use_year_points')
              .select('owner_membership_id, use_year, available, holding')
              .in('owner_membership_id', membershipIds)
          : { data: [] };
        const pointsByMembership = new Map<number, VacationPointsRow[]>();
        for (const membershipId of membershipIds) {
          pointsByMembership.set(membershipId, defaultVacationPoints());
        }
        for (const row of pointsRows ?? []) {
          const membershipPoints = pointsByMembership.get(row.owner_membership_id);
          if (!membershipPoints) continue;
          const target = membershipPoints.find((point) => point.useYear === row.use_year);
          if (!target) continue;
          target.available = Number(row.available ?? 0);
          target.holding = Number(row.holding ?? 0);
        }

        const primaryMembership = existingMemberships[0];
        setMembershipId((primaryMembership.id as string | null) ?? null);
        setOwnerLegalName(primaryMembership.owner_legal_full_name ?? '');
        setCoOwnerLegalName(primaryMembership.co_owner_legal_full_name ?? '');
        setMemberships(
          existingMemberships.map((membership) => ({
            id: membership.id ?? null,
            resortId: membership.resort_id ?? '',
            useYear: membership.use_year ?? 'February',
            pointsOwned: membership.points_owned ?? 0,
            vacationPoints:
              (typeof membership.id === 'number' ? pointsByMembership.get(membership.id) : null) ?? defaultVacationPoints(),
          })),
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit() {
    setLoading(true);
    setFormError(null);
    const trimmedOwnerName = ownerLegalName.trim();
    if (!trimmedOwnerName) {
      setFormError('Legal full name is required.');
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { error: ownerUpsertError } = await supabase
        .from('owners')
        .upsert({ id: user.id, user_id: user.id }, { onConflict: 'id' });
      if (ownerUpsertError) {
        setFormError('Unable to save owner profile. Please try again.');
        setLoading(false);
        return;
      }

      const { error: ownerRepairError } = await supabase
        .from('owners')
        .update({ user_id: user.id })
        .eq('id', user.id)
        .is('user_id', null);
      if (ownerRepairError) {
        setFormError('Unable to finalize owner profile. Please try again.');
        setLoading(false);
        return;
      }

      await supabase
        .from('owner_memberships')
        .update({
          owner_legal_full_name: trimmedOwnerName,
          co_owner_legal_full_name: coOwnerLegalName.trim() || null,
        })
        .eq('owner_id', user.id);

      const existingEntries = memberships.filter((entry) => entry.id);
      const newEntries = memberships.filter((entry) => !entry.id);

      const upsertMembershipPoints = async (ownerMembershipId: number | string, vacationPoints: VacationPointsRow[]) => {
        const rows = vacationPoints
          .filter((row) => FIXED_USE_YEARS.includes(row.useYear as (typeof FIXED_USE_YEARS)[number]))
          .map((row) => ({
            owner_membership_id: Number(ownerMembershipId),
            use_year: row.useYear,
            available: Math.max(0, Number(row.available) || 0),
            holding: Math.max(0, Number(row.holding) || 0),
            updated_at: new Date().toISOString(),
          }));
        if (!rows.length) return;
        await supabase
          .from('owner_membership_use_year_points')
          .upsert(rows, { onConflict: 'owner_membership_id,use_year' });
      };

      for (const entry of existingEntries) {
        if (!entry.resortId || entry.pointsOwned <= 0 || !entry.id) continue;
        const pointsAvailable = entry.vacationPoints.reduce((sum, row) => sum + (Number(row.available) || 0), 0);
        await supabase
          .from('owner_memberships')
          .update({
            resort_id: entry.resortId,
            use_year: entry.useYear,
            points_owned: entry.pointsOwned,
            points_available: pointsAvailable,
            owner_legal_full_name: trimmedOwnerName,
            co_owner_legal_full_name: coOwnerLegalName.trim() || null,
          })
          .eq('id', Number(entry.id));
        await upsertMembershipPoints(entry.id, entry.vacationPoints);
      }

      const newMembershipRows = newEntries
        .filter((entry) => entry.resortId && entry.pointsOwned > 0)
        .map((entry) => ({
          owner_id: user.id,
          resort_id: entry.resortId,
          use_year: entry.useYear,
          points_owned: entry.pointsOwned,
          points_available: entry.vacationPoints.reduce((sum, row) => sum + (Number(row.available) || 0), 0),
          owner_legal_full_name: trimmedOwnerName,
          co_owner_legal_full_name: coOwnerLegalName.trim() || null,
        }));

      if (newMembershipRows.length) {
        const { data: inserted } = await supabase
          .from('owner_memberships')
          .insert(newMembershipRows)
          .select('id')
          .order('id', { ascending: false });
        if (inserted?.length) {
          const createdMemberships = inserted.map((row) => row.id).filter((id): id is number => typeof id === 'number');
          const sourceEntries = newEntries.filter((entry) => entry.resortId && entry.pointsOwned > 0);
          await Promise.all(
            createdMemberships.map((id, idx) =>
              upsertMembershipPoints(id, sourceEntries[idx]?.vacationPoints ?? defaultVacationPoints()),
            ),
          );
        }
        if (inserted?.[0]?.id) {
          setMembershipId(String(inserted[0].id));
        }
      }

      setLoading(false);
      window.location.href = '/owner/onboarding/agreement';
    } catch (error) {
      setLoading(false);
      setFormError(error instanceof Error ? error.message : 'Unable to submit onboarding right now.');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Owner Onboarding</h1>

      <label className="block">
        <span className="text-sm">Legal full name (as on DVC membership)</span>
        <input
          type="text"
          value={ownerLegalName}
          onChange={(event) => setOwnerLegalName(event.target.value)}
          className="mt-1 w-full rounded-xl border p-2"
          required
        />
      </label>

      <label className="block">
        <span className="text-sm">Second owner full name (optional)</span>
        <input
          type="text"
          value={coOwnerLegalName}
          onChange={(event) => setCoOwnerLegalName(event.target.value)}
          className="mt-1 w-full rounded-xl border p-2"
        />
      </label>

      {memberships.map((entry, index) => (
        <div key={`membership-${index}`} className="rounded-xl border border-slate-200 p-4">
          <label className="block">
            <span className="text-sm">Home Resort</span>
            <select
              value={entry.resortId}
              onChange={(event) => {
                const next = [...memberships];
                next[index] = { ...next[index], resortId: event.target.value };
                setMemberships(next);
              }}
              className="mt-1 w-full rounded-xl border p-2"
            >
              <option value="">Select a resort</option>
              {resorts.map((resort) => (
                <option key={resort.id} value={resort.id}>
                  {resort.name}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm">Use Year</span>
            <select
              value={entry.useYear}
              onChange={(event) => {
                const next = [...memberships];
                next[index] = { ...next[index], useYear: event.target.value };
                setMemberships(next);
              }}
              className="mt-1 w-full rounded-xl border p-2 capitalize"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="text-sm">Points Owned</span>
            <input
              type="number"
              value={entry.pointsOwned}
              onChange={(event) => {
                const next = [...memberships];
                next[index] = {
                  ...next[index],
                  pointsOwned: parseInt(event.target.value || '0', 10),
                };
                setMemberships(next);
              }}
              className="mt-1 w-full rounded-xl border p-2"
            />
          </label>
          <VacationPointsTable
            value={entry.vacationPoints}
            onChange={(rows) => {
              const next = [...memberships];
              next[index] = { ...next[index], vacationPoints: rows };
              setMemberships(next);
            }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setMemberships((prev) => [
            ...prev,
            { resortId: '', useYear: 'February', pointsOwned: 0, vacationPoints: defaultVacationPoints() },
          ])
        }
        className="px-0 py-1 text-sm font-medium text-indigo-700 underline underline-offset-4 hover:text-indigo-600"
      >
        Add another resort
      </button>

      <button
        disabled={loading}
        onClick={onSubmit}
        className="mt-6 block rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Submitting…' : 'Submit for Verification'}
      </button>
      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
    </div>
  );
}
