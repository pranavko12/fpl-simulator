'use client';

import { useState } from 'react';

export default function GameweekPicker() {
  const [selectedGW, setSelectedGW] = useState(1);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
      <label htmlFor="gw" className="text-lg font-semibold text-gray-800">
        📅 Choose Starting Gameweek:
      </label>
      <select
        id="gw"
        value={selectedGW}
        onChange={(e) => {
          const gw = Number(e.target.value);
          setSelectedGW(gw);
          // ✅ make GW available to backend (no page.ts changes)
          document.cookie = `fpl_gw=${gw}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
        }}
        className="bg-[#1c1c1f] text-white border border-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {Array.from({ length: 38 }, (_, i) => {
          const gw = i + 1;
          return (
            <option key={gw} value={gw}>
              Gameweek {gw}
            </option>
          );
        })}
      </select>
    </div>
  );
}
