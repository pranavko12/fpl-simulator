'use client';

import { useEffect } from 'react';

const SEASONS = [
  '2020-2021',
  '2021-2022',
  '2022-2023',
  '2023-2024',
  '2024-2025',
  '2025-2026',
];

export default function SeasonPicker({
  value,
  onChange,
  label = 'Season',
}: {
  value?: string;
  onChange: (season: string) => void;
  label?: string;
}) {
  // if no value provided, default to latest
  useEffect(() => {
    if (!value && SEASONS.length) onChange(SEASONS[SEASONS.length - 1]);
  }, [value, onChange]);

  return (
    <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      >
        {SEASONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
