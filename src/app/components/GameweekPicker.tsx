'use client';

import { useEffect, useMemo } from 'react';

export default function GameweekPicker({
  value,
  onChange,
  label = 'Gameweek',
}: {
  value: number;
  onChange: (gw: number) => void;
  label?: string;
}) {
  const options = useMemo(() => Array.from({ length: 38 }, (_, i) => i + 1), []);

  useEffect(() => {
    document.cookie = `fpl_team_gw=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
  }, [value]);

  return (
    <div className="flex flex-col">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-[#121417] text-white border border-gray-700 px-4 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {options.map((gw) => (
          <option key={gw} value={gw}>
            Gameweek {gw}
          </option>
        ))}
      </select>
    </div>
  );
}
