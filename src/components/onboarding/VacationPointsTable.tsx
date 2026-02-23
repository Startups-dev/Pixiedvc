'use client';

import * as React from 'react';

export type VacationPointsRow = {
  useYear: number;
  available: number;
  holding: number;
};

type Props = {
  value: VacationPointsRow[];
  onChange: (next: VacationPointsRow[]) => void;
};

export default function VacationPointsTable({ value, onChange }: Props) {
  const update = (idx: number, patch: Partial<VacationPointsRow>) => {
    const next = value.map((row, i) => (i === idx ? { ...row, ...patch } : row));
    onChange(next);
  };

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-700">Vacation Points</p>
      <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
        <span>Use Year</span>
        <span>Available</span>
        <span>In Holding</span>
      </div>
      <div className="mt-2 space-y-2">
        {value.map((row, idx) => (
          <div key={row.useYear} className="grid gap-2 sm:grid-cols-3">
            <div className="flex items-center rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
              {row.useYear}
            </div>
            <input
              type="number"
              min={0}
              step={1}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              value={row.available}
              onChange={(event) => {
                const nextValue = Math.max(0, Number(event.target.value) || 0);
                update(idx, { available: nextValue });
              }}
            />
            <input
              type="number"
              min={0}
              step={1}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"
              value={row.holding}
              onChange={(event) => {
                const nextValue = Math.max(0, Number(event.target.value) || 0);
                update(idx, { holding: nextValue });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
