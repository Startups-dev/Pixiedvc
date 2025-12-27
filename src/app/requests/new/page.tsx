'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase';

export default function NewRequest() {
  const supabase = createClient();
  const [resorts, setResorts] = useState<{ id: string; name: string }[]>([]);
  const [resortId, setResortId] = useState('');
  const [roomType, setRoomType] = useState('Studio');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [maxPpp, setMaxPpp] = useState<number | ''>('');
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
      window.location.href = '/login';
      return;
    }

    const { error } = await supabase.from('renter_requests').insert({
      renter_id: user.id,
      resort_id: resortId || null,
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      adults,
      children,
      max_price_per_point: maxPpp === '' ? null : maxPpp,
      status: 'submitted',
    });

    setLoading(false);
    if (!error) {
      alert('Request submitted!');
      window.location.href = '/';
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">New Stay Request</h1>

      <label className="block">
        <span className="text-sm">Resort (optional)</span>
        <select
          value={resortId}
          onChange={(event) => setResortId(event.target.value)}
          className="mt-1 w-full rounded-xl border p-2"
        >
          <option value="">Any resort</option>
          {resorts.map((resort) => (
            <option key={resort.id} value={resort.id}>
              {resort.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm">Room Type</span>
        <input value={roomType} onChange={(event) => setRoomType(event.target.value)} className="mt-1 w-full rounded-xl border p-2" />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm">Check-in</span>
          <input type="date" value={checkIn} onChange={(event) => setCheckIn(event.target.value)} className="mt-1 w-full rounded-xl border p-2" />
        </label>
        <label className="block">
          <span className="text-sm">Check-out</span>
          <input type="date" value={checkOut} onChange={(event) => setCheckOut(event.target.value)} className="mt-1 w-full rounded-xl border p-2" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm">Adults</span>
          <input
            type="number"
            value={adults}
            onChange={(event) => setAdults(parseInt(event.target.value || '0', 10))}
            className="mt-1 w-full rounded-xl border p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm">Children</span>
          <input
            type="number"
            value={children}
            onChange={(event) => setChildren(parseInt(event.target.value || '0', 10))}
            className="mt-1 w-full rounded-xl border p-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm">Max $/point (optional)</span>
        <input
          type="number"
          step="0.01"
          value={maxPpp}
          onChange={(event) => setMaxPpp(event.target.value === '' ? '' : Number(event.target.value))}
          className="mt-1 w-full rounded-xl border p-2"
        />
      </label>

      <button disabled={loading} onClick={onSubmit} className="rounded-xl bg-indigo-600 px-4 py-2 text-white">
        {loading ? 'Submitting…' : 'Submit Request'}
      </button>
    </div>
  );
}
