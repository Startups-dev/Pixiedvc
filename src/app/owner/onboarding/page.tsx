'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase';

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
  const [resortId, setResortId] = useState('');
  const [useYear, setUseYear] = useState('February');
  const [pointsOwned, setPointsOwned] = useState(0);
  const [cardFile, setCardFile] = useState<File | null>(null);
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('resorts')
      .select('id,name')
      .order('name')
      .then(({ data }) => setResorts(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit() {
    setLoading(true);
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

    if (resortId && pointsOwned > 0) {
      await supabase.from('owner_memberships').insert({
        owner_id: user.id,
        resort_id: resortId,
        use_year: useYear,
        points_owned: pointsOwned,
        points_available: pointsOwned,
      });
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
    router.push('/owner/submitted');
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Owner Onboarding</h1>

      <label className="block">
        <span className="text-sm">Home Resort</span>
        <select
          value={resortId}
          onChange={(event) => setResortId(event.target.value)}
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

      <label className="block">
        <span className="text-sm">Use Year</span>
        <select
          value={useYear}
          onChange={(event) => setUseYear(event.target.value)}
          className="mt-1 w-full rounded-xl border p-2 capitalize"
        >
          {MONTHS.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm">Points Owned</span>
        <input
          type="number"
          value={pointsOwned}
          onChange={(event) => setPointsOwned(parseInt(event.target.value || '0', 10))}
          className="mt-1 w-full rounded-xl border p-2"
        />
      </label>

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
    </div>
  );
}
