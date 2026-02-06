'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';
import { getCanonicalResorts } from '@/lib/resorts/getResorts';

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

export default function OwnerOnboarding() {
  const supabase = createClient();
  const router = useRouter();
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const [memberships, setMemberships] = useState<
    { id?: string | null; resortId: string; useYear: string; pointsOwned: number }[]
  >([{ resortId: '', useYear: 'February', pointsOwned: 0 }]);
  const [membershipId, setMembershipId] = useState<string | null>(null);
  const [ownerLegalName, setOwnerLegalName] = useState('');
  const [coOwnerLegalName, setCoOwnerLegalName] = useState('');
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
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
      const { data: membership } = await supabase
        .from('owner_memberships')
        .select('id, owner_legal_full_name, co_owner_legal_full_name, resort_id, use_year, points_owned')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (membership) {
        setMembershipId(membership.id ?? null);
        setOwnerLegalName(membership.owner_legal_full_name ?? '');
        setCoOwnerLegalName(membership.co_owner_legal_full_name ?? '');
        setMemberships([
          {
            id: membership.id ?? null,
            resortId: membership.resort_id ?? '',
            useYear: membership.use_year ?? 'February',
            pointsOwned: membership.points_owned ?? 0,
          },
        ]);
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
      await supabase.from('owners').insert({ id: user.id }).select().single();
    } catch {
      // ignore duplicate inserts; owner row may already exist
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

    for (const entry of existingEntries) {
      if (!entry.resortId || entry.pointsOwned <= 0 || !entry.id) continue;
      await supabase
        .from('owner_memberships')
        .update({
          resort_id: entry.resortId,
          use_year: entry.useYear,
          points_owned: entry.pointsOwned,
          points_available: entry.pointsOwned,
          owner_legal_full_name: trimmedOwnerName,
          co_owner_legal_full_name: coOwnerLegalName.trim() || null,
        })
        .eq('id', entry.id);
    }

    const membershipRows = newEntries
      .filter((entry) => entry.resortId && entry.pointsOwned > 0)
      .map((entry) => ({
        owner_id: user.id,
        resort_id: entry.resortId,
        use_year: entry.useYear,
        points_owned: entry.pointsOwned,
        points_available: entry.pointsOwned,
        owner_legal_full_name: trimmedOwnerName,
        co_owner_legal_full_name: coOwnerLegalName.trim() || null,
      }));

    if (membershipRows.length) {
      const { data: inserted } = await supabase
        .from('owner_memberships')
        .insert(membershipRows)
        .select('id')
        .limit(1);
      if (inserted?.[0]?.id) {
        setMembershipId(inserted[0].id);
      }
    }

    const bucket = 'owner-docs';
    const stamp = Date.now();

    async function uploadOne(file: File, kind: string) {
      const path = `${user.id}/${kind}-${stamp}-${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: false, metadata: { owner: user.id } });
      if (!error) {
        await supabase.from('owner_documents').insert({ owner_id: user.id, kind, storage_path: path });
      }
    }

    if (cardFile) {
      await uploadOne(cardFile, 'member_card');
    }
    if (govIdFile) {
      await uploadOne(govIdFile, 'id');
    }

    setLoading(false);
    router.push('/owner/dashboard');
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
        </div>
      ))}

      <button
        type="button"
        onClick={() => setMemberships((prev) => [...prev, { resortId: '', useYear: 'February', pointsOwned: 0 }])}
        className="rounded-xl border border-slate-300 px-4 py-2 text-slate-700"
      >
        Add another resort
      </button>

      <label className="block">
        <span className="text-sm">DVC Member Card (image/PDF)</span>
        <input type="file" accept="image/*,application/pdf" onChange={(event) => setCardFile(event.target.files?.[0] ?? null)} className="mt-1" />
      </label>

      <label className="block">
        <span className="text-sm">Government ID (redacted)</span>
        <input type="file" accept="image/*,application/pdf" onChange={(event) => setGovIdFile(event.target.files?.[0] ?? null)} className="mt-1" />
      </label>

      <button disabled={loading} onClick={onSubmit} className="rounded-xl bg-indigo-600 px-4 py-2 text-white">
        {loading ? 'Submitting…' : 'Submit for Verification'}
      </button>
      {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
    </div>
  );
}
