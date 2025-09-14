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
    document.cookie = `fpl_gw=${v}; Path=/; Max-Age=${60 * 60 * 24 * 30}`; // alias for backend that reads fpl_gw
  };

  const handleTo = (v: number) => {
    setToGW(v);
    if (v < fromGW) setFromGW(v);
    document.cookie = `fpl_gw_to=${v}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
  };

  return (
    <div className="flex items-end gap-4">
      <div className="flex flex-col">
        <label htmlFor="gw-from" className="text-xs font-semibold text-slate-700">From</label>
        <select
          id="gw-from"
          value={fromGW}
          onChange={(e) => handleFrom(Number(e.target.value))}
          className="bg-[#121417] text-white border border-gray-700 px-4 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {options.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="gw-to" className="text-xs font-semibold text-slate-700">To</label>
        <select
          id="gw-to"
          value={toGW}
          onChange={(e) => handleTo(Number(e.target.value))}
          className="bg-[#121417] text-white border border-gray-700 px-4 py-2 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {options.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
