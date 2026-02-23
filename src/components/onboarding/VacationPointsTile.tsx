'use client';

import * as React from 'react';

type Row = {
  useYear: number;
  available: number;
  holding: number;
};

type Props = {
  value: Row[];
  onChange: (next: Row[]) => void;
  title?: string;
  subtitle?: string;
};

export default function VacationPointsTile({
  value,
  onChange,
  title = 'Vacation Points',
  subtitle = 'Manage Vacation Points',
}: Props) {
  const update = (idx: number, patch: Partial<Row>) => {
    const next = value.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-900">{title}</div>
        <div className="text-sm font-medium text-blue-600">{subtitle}</div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6 text-center">
        <div className="text-sm font-semibold text-gray-600">Use Year</div>
        <div className="text-sm font-semibold text-gray-600">Available</div>
        <div className="text-sm font-semibold text-gray-600">In Holding</div>

        {value.map((row, idx) => (
          <React.Fragment key={row.useYear}>
            {/* Use Year */}
            <div className="flex items-center justify-center text-2xl font-medium text-gray-900">
              {row.useYear}
            </div>

            {/* Available */}
            <div className="flex items-center justify-center">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-3xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                value={Number.isFinite(row.available) ? String(row.available) : ''}
                onChange={(e) => {
                  const n = e.target.value.replace(/[^\d]/g, '');
                  update(idx, { available: n === '' ? 0 : parseInt(n, 10) });
                }}
              />
            </div>

            {/* Holding */}
            <div className="flex items-center justify-center">
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-28 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-3xl font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                value={Number.isFinite(row.holding) ? String(row.holding) : ''}
                onChange={(e) => {
                  const n = e.target.value.replace(/[^\d]/g, '');
                  update(idx, { holding: n === '' ? 0 : parseInt(n, 10) });
                }}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
