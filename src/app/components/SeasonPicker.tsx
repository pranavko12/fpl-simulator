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
  useEffect(() => {
    if (!value && SEASONS.length) onChange(SEASONS[SEASONS.length - 1]);
    if (value) {
      document.cookie = `fpl_season=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
    }
  }, [value, onChange]);

  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white"
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
