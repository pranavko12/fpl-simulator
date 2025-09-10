'use client';

import { useState } from 'react';

export default function GameweekPicker() {
  const [selectedGW, setSelectedGW] = useState(20);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-4">
      <label htmlFor="gw" className="text-lg font-semibold text-gray-800">
        📅 Choose Starting Gameweek:
      </label>
      <select
        id="gw"
        value={selectedGW}
        onChange={(e) => setSelectedGW(Number(e.target.value))}
        className="bg-[#1c1c1f] text-white border border-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {Array.from({ length: 38 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            Gameweek {i + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
