// src/app/components/SimulatePanel.tsx
'use client';

import React, { useMemo, useState } from 'react';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPlayerSim = {
  name: string;
  element_type?: ElementType | null;
};

type GwStat = { price: number; points: number };
type StatsIndex = Record<string, Record<number, GwStat>>;

export default function SimulatePanel({
  players,
  gwFrom,
  gwTo,
  stats,
  className,
}: {
  players: UiPlayerSim[];
  gwFrom: number | null;
  gwTo: number | null;
  stats: StatsIndex;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  const canSimulate = useMemo(() => {
    if (gwFrom == null || gwTo == null) return false;
    if (gwFrom > gwTo) return false;
    return players.length === 15;
  }, [players.length, gwFrom, gwTo]);

  type Row = {
    key: string;
    name: string;
    pos?: ElementType | null;
    fromPrice: number;
    fromPts: number;
    toPrice: number;
    toPts: number;
    priceDiff: number;
    ptsDiff: number;
  };

  const rows: Row[] = useMemo(() => {
    if (!canSimulate || gwFrom == null || gwTo == null) return [];
    return players.map((p) => {
      const key = p.name;
      const from = stats[key]?.[gwFrom];
      const to = stats[key]?.[gwTo];
      const fromPrice = from?.price ?? 0;
      const fromPts = from?.points ?? 0;
      const toPrice = to?.price ?? 0;
      const toPts = to?.points ?? 0;
      return {
        key,
        name: p.name,
        pos: p.element_type ?? null,
        fromPrice,
        fromPts,
        toPrice,
        toPts,
        priceDiff: toPrice - fromPrice,
        ptsDiff: toPts - fromPts,
      };
    });
  }, [canSimulate, gwFrom, gwTo, players, stats]);

  const totals = useMemo(() => {
    let priceDiff = 0,
      ptsDiff = 0,
      fromPts = 0,
      toPts = 0;
    for (const r of rows) {
      priceDiff += r.priceDiff;
      ptsDiff += r.ptsDiff;
      fromPts += r.fromPts;
      toPts += r.toPts;
    }
    return { priceDiff, ptsDiff, fromPts, toPts };
  }, [rows]);

  const tooltip = useMemo(() => {
    if (canSimulate) return 'Run simulation';
    if (players.length !== 15) return `Select all 15 players (${players.length}/15)`;
    if (gwFrom != null && gwTo != null && gwFrom > gwTo) return 'GW From must be ≤ GW To';
    return 'Choose both gameweeks';
  }, [canSimulate, players.length, gwFrom, gwTo]);

  return (
    <div className={`w-full ${className || ''}`}>
      <button
        type="button"
        onClick={() => setShow(true)}
        disabled={!canSimulate}
        title={tooltip}
        className={[
          'rounded-xl px-5 py-3 text-base md:text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
          canSimulate
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed focus:ring-transparent',
        ].join(' ')}
      >
        Simulate
      </button>

      {show && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-700">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">GW {gwFrom} Price</th>
                <th className="px-4 py-3">GW {gwFrom} Pts</th>
                <th className="px-4 py-3">GW {gwTo} Price</th>
                <th className="px-4 py-3">GW {gwTo} Pts</th>
                <th className="px-4 py-3">Price Δ</th>
                <th className="px-4 py-3">Pts Δ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.pos ?? ''}</td>
                  <td className="px-4 py-3">{r.fromPrice.toFixed(1)}</td>
                  <td className="px-4 py-3">{r.fromPts}</td>
                  <td className="px-4 py-3">{r.toPrice.toFixed(1)}</td>
                  <td className="px-4 py-3">{r.toPts}</td>
                  <td className={`px-4 py-3 ${r.priceDiff === 0 ? '' : r.priceDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.priceDiff >= 0 ? '+' : ''}
                    {r.priceDiff.toFixed(1)}
                  </td>
                  <td className={`px-4 py-3 ${r.ptsDiff === 0 ? '' : r.ptsDiff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.ptsDiff >= 0 ? '+' : ''}
                    {r.ptsDiff}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr className="font-semibold">
                <td className="px-4 py-3" colSpan={3}>
                  Totals
                </td>
                <td className="px-4 py-3">{totals.fromPts}</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3">{totals.toPts}</td>
                <td className={`px-4 py-3 ${totals.priceDiff === 0 ? '' : totals.priceDiff > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totals.priceDiff >= 0 ? '+' : ''}
                  {totals.priceDiff.toFixed(1)}
                </td>
                <td className={`px-4 py-3 ${totals.ptsDiff === 0 ? '' : totals.ptsDiff > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {totals.ptsDiff >= 0 ? '+' : ''}
                  {totals.ptsDiff}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
