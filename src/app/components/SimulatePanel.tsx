// src/app/components/SimulatePanel.tsx
'use client';

import React, { useMemo, useState } from 'react';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPicked = {
  id: string;
  name: string;
  element_type?: ElementType | null;
};

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
      to: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

function posLabel(p?: ElementType | null) {
  return p ?? '';
}

export default function SimulatePanel({
  players,
  className,
  disabled,
}: {
  players: UiPicked[];
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [fromGw, setFromGw] = useState<number>(1);
  const [toGw, setToGw] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<ApiStatsResp | null>(null);

  const canRun = useMemo(
    () => !disabled && players.length === 15 && fromGw > 0 && toGw > 0 && fromGw <= toGw,
    [disabled, players.length, fromGw, toGw]
  );

  const run = async () => {
    if (!canRun || busy) return;
    setBusy(true);
    setErr(null);
    setStats(null);

    try {
      const ids = players
        .map((p) => p.id)
        .filter((x) => /^\d+$/.test(x))
        .join(',');
      if (!ids) throw new Error('No valid player ids');

      const res = await fetch(`/api/fpl?op=stats&ids=${encodeURIComponent(ids)}&from=${fromGw}&to=${toGw}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ApiStatsResp;
      setStats(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setBusy(false);
    }
  };

  type Row = {
    id: string;
    name: string;
    pos: ElementType | null;
    fromPts: number;
    toPts: number;
    ptsDiff: number;
    fromPrice: number;
    toPrice: number;
    priceDiff: number;
    note: string;
  };

  const rows: Row[] = useMemo(() => {
    if (!stats) return [];

    return players.map((p) => {
      const s = stats.stats[p.id];
      const fromPts = s?.from?.points ?? 0;
      const toPts = s?.to?.points ?? 0;

      const fromPrice = s?.from?.price ?? 0;
      const toPrice = s?.to?.price ?? 0;

      const missingPts = !s?.from?.found || !s?.to?.found;
      const missingPrice = !s?.from?.priceFound || !s?.to?.priceFound;

      let note = '';
      if (missingPts && missingPrice) note = 'Missing points and price for one or both GWs';
      else if (missingPts) note = 'Missing points for one or both GWs';
      else if (missingPrice) note = 'Missing price for one or both GWs';

      return {
        id: p.id,
        name: p.name,
        pos: (p.element_type ?? null) as ElementType | null,
        fromPts,
        toPts,
        ptsDiff: toPts - fromPts,
        fromPrice,
        toPrice,
        priceDiff: toPrice - fromPrice,
        note,
      };
    });
  }, [players, stats]);

  const totals = useMemo(() => {
    let fromPts = 0;
    let toPts = 0;
    let ptsDiff = 0;

    let fromPrice = 0;
    let toPrice = 0;
    let priceDiff = 0;

    for (const r of rows) {
      fromPts += r.fromPts;
      toPts += r.toPts;
      ptsDiff += r.ptsDiff;

      fromPrice += r.fromPrice;
      toPrice += r.toPrice;
      priceDiff += r.priceDiff;
    }

    return { fromPts, toPts, ptsDiff, fromPrice, toPrice, priceDiff };
  }, [rows]);

  const fmtPrice = (n: number) => n.toFixed(1);

  return (
    <div className={`w-full ${className || ''}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className={[
          'rounded-xl px-5 py-3 text-base md:text-lg font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
          !disabled
            ? 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600'
            : 'bg-gray-300 text-gray-600 cursor-not-allowed focus:ring-transparent',
        ].join(' ')}
      >
        Simulate
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700">From GW</label>
                <select
                  value={fromGw}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFromGw(v);
                    if (v > toGw) setToGw(v);
                  }}
                  className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
                    <option key={gw} value={gw}>
                      Gameweek {gw}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700">To GW</label>
                <select
                  value={toGw}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setToGw(v);
                    if (v < fromGw) setFromGw(v);
                  }}
                  className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                >
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
                    <option key={gw} value={gw}>
                      Gameweek {gw}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={run}
                disabled={!canRun || busy}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                title={!canRun ? 'Need 15 players and From GW ≤ To GW' : 'Run simulation'}
              >
                {busy ? 'Simulating…' : 'Run'}
              </button>
            </div>

            {typeof stats?.lastFinishedGw === 'number' && stats.lastFinishedGw > 0 ? (
              <div className="text-xs text-slate-500">
                Last finished GW: <span className="font-semibold">{stats.lastFinishedGw}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">Last finished GW: -</div>
            )}
          </div>

          {err && <div className="mt-3 text-sm text-red-600">Error: {err}</div>}

          {stats && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-gray-700">
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Pos</th>

                    <th className="px-4 py-3">Pts up to GW {fromGw}</th>
                    <th className="px-4 py-3">Pts up to GW {toGw}</th>
                    <th className="px-4 py-3">Pts Δ</th>

                    <th className="px-4 py-3">Price @ GW {fromGw}</th>
                    <th className="px-4 py-3">Price @ GW {toGw}</th>
                    <th className="px-4 py-3">Price Δ</th>

                    <th className="px-4 py-3">Note</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">{posLabel(r.pos)}</td>

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

                      <td className="px-4 py-3">{fmtPrice(r.fromPrice)}</td>
                      <td className="px-4 py-3">{fmtPrice(r.toPrice)}</td>
                      <td
                        className={[
                          'px-4 py-3',
                          r.priceDiff === 0 ? '' : r.priceDiff > 0 ? 'text-emerald-700' : 'text-red-700',
                        ].join(' ')}
                      >
                        {r.priceDiff >= 0 ? '+' : ''}
                        {r.priceDiff.toFixed(1)}
                      </td>

                      <td className="px-4 py-3 text-xs text-slate-500">{r.note}</td>
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
                        totals.ptsDiff === 0 ? '' : totals.ptsDiff > 0 ? 'text-emerald-700' : 'text-red-700',
                      ].join(' ')}
                    >
                      {totals.ptsDiff >= 0 ? '+' : ''}
                      {totals.ptsDiff}
                    </td>

                    <td className="px-4 py-3">{fmtPrice(totals.fromPrice)}</td>
                    <td className="px-4 py-3">{fmtPrice(totals.toPrice)}</td>
                    <td
                      className={[
                        'px-4 py-3',
                        totals.priceDiff === 0 ? '' : totals.priceDiff > 0 ? 'text-emerald-700' : 'text-red-700',
                      ].join(' ')}
                    >
                      {totals.priceDiff >= 0 ? '+' : ''}
                      {totals.priceDiff.toFixed(1)}
                    </td>

                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
