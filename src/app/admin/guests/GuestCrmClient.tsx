'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type GuestCrmRecord = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  totalRequests: number;
  confirmedTrips: number;
  lastRequestAt: string | null;
  lastTripAt: string | null;
  lifetimeValue: string | null;
};

export default function GuestCrmClient({ guests }: { guests: GuestCrmRecord[] }) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return guests;
    return guests.filter((guest) => {
      const haystack = `${guest.name ?? ''} ${guest.email ?? ''} ${guest.phone ?? ''}`.toLowerCase();
      return haystack.includes(text);
    });
  }, [guests, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-[#9aa3b2]">{filtered.length} guests</div>
        <div className="w-full md:w-80">
          <input
            type="search"
            placeholder="Search guest, email, phone"
            className="w-full rounded-2xl border border-[#23293a] bg-[#0f1115] px-4 py-2 text-sm text-[#e6e8ec] placeholder:text-[#6b7280]"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-[#23293a] bg-[#151922]">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] gap-4 border-b border-[#23293a] px-6 py-4 text-xs uppercase tracking-[0.2em] text-[#6b7280] md:grid">
          <span>Guest</span>
          <span>Contact</span>
          <span>Flags</span>
          <span>Total requests</span>
          <span>Confirmed trips</span>
          <span>Last request</span>
          <span>Last trip</span>
          <span>Lifetime value</span>
        </div>
        <div className="divide-y divide-[#23293a]">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#9aa3b2]">
              No guests found. Adjust your search to try again.
            </div>
          ) : (
            filtered.map((guest) => (
              <Link
                key={guest.id}
                href={`/admin/guests/${guest.id}`}
                onClick={() => setSelectedId(guest.id)}
                className={`block px-6 py-4 transition ${
                  selectedId === guest.id ? 'bg-[#1c2230]' : 'hover:bg-[#1c2230]'
                }`}
              >
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_0.8fr_0.8fr_0.7fr] md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-[#e6e8ec]">{guest.name ?? 'Unknown guest'}</p>
                    <p className="text-xs text-[#9aa3b2]">{guest.email ?? 'No email'}</p>
                  </div>
                  <div className="text-sm text-[#e6e8ec]">
                    {guest.phone ?? 'No phone'}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-[#6b7280]">
                    <span className="rounded-full border border-[#23293a] px-2 py-1">VIP</span>
                    <span className="rounded-full border border-[#23293a] px-2 py-1">Repeat</span>
                    <span className="rounded-full border border-[#23293a] px-2 py-1">Flagged</span>
                  </div>
                  <div className="text-sm text-[#e6e8ec]">{guest.totalRequests}</div>
                  <div className="text-sm text-[#e6e8ec]">{guest.confirmedTrips}</div>
                  <div className="text-sm text-[#e6e8ec]">{formatDate(guest.lastRequestAt)}</div>
                  <div className="text-sm text-[#e6e8ec]">{formatDate(guest.lastTripAt)}</div>
                  <div className="text-sm text-[#e6e8ec]">{guest.lifetimeValue ?? '—'}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}
