'use client';

import { useState } from 'react';

export default function GameweekPicker() {
  const [fromGW, setFromGW] = useState(1);
  const [toGW, setToGW] = useState(1);
  const options = Array.from({ length: 38 }, (_, i) => i + 1);

  const handleFrom = (v: number) => {
    setFromGW(v);
    if (v > toGW) setToGW(v);
    document.cookie = `fpl_gw_from=${v}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
  };

  const handleTo = (v: number) => {
    setToGW(v);
    if (v < fromGW) setFromGW(v);
    document.cookie = `fpl_gw_to=${v}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
      <div className="flex items-center gap-2">
        <label htmlFor="gw-from" className="text-lg font-semibold text-gray-800">📅 From:</label>
        <select
          id="gw-from"
          value={fromGW}
          onChange={(e) => handleFrom(Number(e.target.value))}
          className="bg-[#1c1c1f] text-white border border-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {options.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="gw-to" className="text-lg font-semibold text-gray-800">➡️ To:</label>
        <select
          id="gw-to"
          value={toGW}
          onChange={(e) => handleTo(Number(e.target.value))}
          className="bg-[#1c1c1f] text-white border border-gray-700 px-4 py-2 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {options.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
