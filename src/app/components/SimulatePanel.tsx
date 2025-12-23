'use client';

import React, { useMemo, useState } from 'react';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

export type UiPicked = {
  id: string;
  name: string;
  element_type?: ElementType | null;
};

type GwStat = { points: number; found: boolean };
type StatsIndex = Record<string, Record<number, GwStat>>;

export default function SimulatePanel({
  players,
  fromGw,
  toGw,
  stats,
  className,
  disabled,
}: {
  players: UiPicked[];
  fromGw: number;
  toGw: number;
  stats: StatsIndex;
  className?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);

  const canShow = useMemo(() => {
    if (disabled) return false;
    if (!Array.isArray(players) || players.length !== 15) return false;
    if (!Number.isFinite(fromGw) || !Number.isFinite(toGw)) return false;
    if (fromGw > toGw) return false;
    return true;
  }, [disabled, players, fromGw, toGw]);

  type Row = {
    key: string;
    name: string;
    pos?: ElementType | null;
    fromPts: number;
    toPts: number;
    ptsDiff: number;
    note?: string;
  };

  const rows: Row[] = useMemo(() => {
    if (!canShow) return [];
    return players.map((p) => {
      const pid = String(p.id);
      const from = stats[pid]?.[fromGw];
      const to = stats[pid]?.[toGw];

      const fromPts = from?.found ? from.points : 0;
      const toPts = to?.found ? to.points : 0;

      const note =
        !from?.found || !to?.found
          ? 'Missing event points for one or both GWs'
          : undefined;

      return {
        key: pid,
        name: p.name,
        pos: p.element_type ?? null,
        fromPts,
        toPts,
        ptsDiff: toPts - fromPts,
        note,
      };
    });
  }, [canShow, players, stats, fromGw, toGw]);

  const totals = useMemo(() => {
    let fromPts = 0;
    let toPts = 0;
    for (const r of rows) {
      fromPts += r.fromPts;
      toPts += r.toPts;
    }
    return { fromPts, toPts, diff: toPts - fromPts };
  }, [rows]);

  const tooltip = useMemo(() => {
    if (!disabled && canShow) return 'View simulation table';
    if (disabled) return 'Pick 15 players and stay within budget';
    if (players.length !== 15) return `Select all 15 players (${players.length}/15)`;
    if (fromGw > toGw) return 'Sim From must be ≤ Sim To';
    return 'Cannot show simulation';
  }, [disabled, canShow, players.length, fromGw, toGw]);

  return (
    <div className={`w-full ${className || ''}`}>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        disabled={disabled}
        title={tooltip}
        className={[
          'rounded-xl px-5 py-3 text-base md:text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
          !disabled
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed focus:ring-transparent',
        ].join(' ')}
      >
        {show ? 'Hide Results' : 'Show Results'}
      </button>

      {show && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr className="text-gray-700">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">GW {fromGw} Pts</th>
                <th className="px-4 py-3">GW {toGw} Pts</th>
                <th className="px-4 py-3">Pts Δ</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.pos ?? ''}</td>
                  <td className="px-4 py-3">{r.fromPts}</td>
                  <td className="px-4 py-3">{r.toPts}</td>
                  <td
                    className={[
                      'px-4 py-3',
                      r.ptsDiff === 0 ? '' : r.ptsDiff > 0 ? 'text-emerald-700' : 'text-red-700',
                    ].join(' ')}
                  >
                    {r.ptsDiff >= 0 ? '+' : ''}
                    {r.ptsDiff}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.note ?? ''}</td>
                </tr>
              ))}
            </tbody>

            <tfoot className="bg-gray-50">
              <tr className="font-semibold">
                <td className="px-4 py-3" colSpan={2}>
                  Totals
                </td>
                <td className="px-4 py-3">{totals.fromPts}</td>
                <td className="px-4 py-3">{totals.toPts}</td>
                <td
                  className={[
                    'px-4 py-3',
                    totals.diff === 0 ? '' : totals.diff > 0 ? 'text-emerald-800' : 'text-red-800',
                  ].join(' ')}
                >
                  {totals.diff >= 0 ? '+' : ''}
                  {totals.diff}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
