'use client';

import React, { useMemo, useState } from 'react';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPicked = {
  id: string;
  name: string;
  element_type: ElementType | null;
};

type Props = {
  players: UiPicked[];
  className?: string;
  disabled?: boolean;
};

type GwStat = {
  gw: number;
  points: number;
  price: number;
  found: boolean;
};

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: GwStat;
      to: GwStat;
    }
  >;
  missing?: Array<{ id: string; reason: string }>;
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function normalizePrice(raw: unknown): number | null {
  if (!isFiniteNumber(raw)) return null;

  // If backend sends "now_cost" style (e.g. 45 => 4.5), convert.
  // If backend already sends 4.5, keep it.
  if (raw >= 25) return raw / 10;
  return raw;
}

function fmtPrice(v: number | null): string {
  if (!isFiniteNumber(v)) return '—';
  return `${v.toFixed(1)}M`;
}

export default function SimulatePanel({ players, className, disabled }: Props) {
  const gwOptions = useMemo(() => Array.from({ length: 38 }, (_, i) => i + 1), []);

  const [fromGw, setFromGw] = useState<number>(1);
  const [toGw, setToGw] = useState<number>(1);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lastFinishedGw, setLastFinishedGw] = useState<number | null>(null);

  // Controls table visibility
  const [hasRun, setHasRun] = useState(false);

  // Data
  const [stats, setStats] = useState<ApiStatsResp['stats']>({});

  const idsCsv = useMemo(() => players.map((p) => String(p.id)).join(','), [players]);

  const canRun = !disabled && players.length > 0;

  async function run() {
    if (!canRun) return;

    setLoading(true);
    setErr(null);

    try {
      const url = `/api/fpl?op=stats&ids=${encodeURIComponent(idsCsv)}&from=${fromGw}&to=${toGw}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);

      const data = (await res.json()) as ApiStatsResp;

      setStats(data.stats ?? {});
      setLastFinishedGw(isFiniteNumber(data.lastFinishedGw) ? data.lastFinishedGw : null);

      // Only show table after user runs successfully at least once
      setHasRun(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Simulation failed');
      setStats({});
      setHasRun(false);
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    return players.map((p) => {
      const byId = stats[String(p.id)];
      const from = byId?.from;
      const to = byId?.to;

      const fromPts = isFiniteNumber(from?.points) ? from!.points : null;
      const toPts = isFiniteNumber(to?.points) ? to!.points : null;

      const fromPrice = normalizePrice(from?.price);
      const toPrice = normalizePrice(to?.price);

      const ptsDelta =
        isFiniteNumber(fromPts) && isFiniteNumber(toPts) ? toPts - fromPts : null;

      const priceDelta =
        isFiniteNumber(fromPrice) && isFiniteNumber(toPrice) ? toPrice - fromPrice : null;

      const missingPts = !from?.found || !to?.found;
      const missingPrice = !isFiniteNumber(from?.price) || !isFiniteNumber(to?.price);

      let note = '';
      if (missingPts && missingPrice) note = 'Missing points and price for one or both GWs';
      else if (missingPts) note = 'Missing points for one or both GWs';
      else if (missingPrice) note = 'Missing price for one or both GWs';

      return {
        id: p.id,
        name: p.name,
        pos: p.element_type ?? '',
        fromPts,
        toPts,
        ptsDelta,
        fromPrice,
        toPrice,
        priceDelta,
        note,
      };
    });
  }, [players, stats]);

  const totals = useMemo(() => {
    const sum = (vals: Array<number | null>) =>
      vals.reduce<number>((acc, v) => acc + (typeof v === 'number' && Number.isFinite(v) ? v : 0), 0);

    const fromPtsTotal = sum(rows.map((r) => r.fromPts));
    const toPtsTotal = sum(rows.map((r) => r.toPts));
    const ptsDeltaTotal = isFiniteNumber(toPtsTotal) && isFiniteNumber(fromPtsTotal) ? toPtsTotal - fromPtsTotal : 0;
    const fromPriceTotal = sum(rows.map((r) => r.fromPrice));
    const toPriceTotal = sum(rows.map((r) => r.toPrice));
    const priceDeltaTotal = isFiniteNumber(toPriceTotal) && isFiniteNumber(fromPriceTotal) ? toPriceTotal - fromPriceTotal : 0;

    return { fromPtsTotal, toPtsTotal, ptsDeltaTotal, fromPriceTotal, toPriceTotal, priceDeltaTotal };
  }, [rows]);

  return (
    <div className={className ?? ''}>
      <div className="w-[92vw] max-w-5xl rounded-2xl bg-white shadow-lg overflow-hidden">
        {/* Controls */}
        <div className="px-5 pt-4 pb-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">From GW</label>
              <select
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={fromGw}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFromGw(v);
                  if (v > toGw) setToGw(v);
                }}
                disabled={!canRun}
              >
                {gwOptions.map((gw) => (
                  <option key={gw} value={gw}>
                    Gameweek {gw}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-700">To GW</label>
              <select
                className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={toGw}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setToGw(v);
                  if (v < fromGw) setFromGw(v);
                }}
                disabled={!canRun}
              >
                {gwOptions.map((gw) => (
                  <option key={gw} value={gw}>
                    Gameweek {gw}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={run}
              disabled={!canRun || loading}
              className={[
                'ml-2 rounded-xl px-5 py-2 text-sm font-semibold',
                !canRun || loading ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800',
              ].join(' ')}
            >
              {loading ? 'Running' : 'Run'}
            </button>
          </div>

          <div className="text-xs text-slate-500 md:text-right">
            {lastFinishedGw != null ? `Last finished GW: ${lastFinishedGw}` : ''}
          </div>
        </div>

        {err && (
          <div className="px-5 pb-3 text-sm text-red-600">
            Error: {err}
          </div>
        )}

        {/* Table: only after Run */}
        {hasRun && (
          <div className="border-t border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Player</th>
                  <th className="px-3 py-3 text-left font-semibold">Pos</th>
                  <th className="px-3 py-3 text-right font-semibold">GW {fromGw} Pts</th>
                  <th className="px-3 py-3 text-right font-semibold">GW {toGw} Pts</th>
                  <th className="px-3 py-3 text-right font-semibold">Pts Δ</th>
                  <th className="px-3 py-3 text-right font-semibold">Price @ {fromGw}</th>
                  <th className="px-3 py-3 text-right font-semibold">Price @ {toGw}</th>
                  <th className="px-3 py-3 text-right font-semibold">Price Δ</th>
                  <th className="px-3 py-3 text-left font-semibold">Note</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-medium text-slate-900">{r.name}</td>
                    <td className="px-3 py-3 text-slate-700">{r.pos}</td>
                    <td className="px-3 py-3 text-right">{isFiniteNumber(r.fromPts) ? r.fromPts : '—'}</td>
                    <td className="px-3 py-3 text-right">{isFiniteNumber(r.toPts) ? r.toPts : '—'}</td>
                    <td className="px-3 py-3 text-right">
                      {isFiniteNumber(r.ptsDelta) ? (r.ptsDelta >= 0 ? `+${r.ptsDelta}` : `${r.ptsDelta}`) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right">{fmtPrice(r.fromPrice)}</td>
                    <td className="px-3 py-3 text-right">{fmtPrice(r.toPrice)}</td>
                    <td className="px-3 py-3 text-right">
                      {isFiniteNumber(r.priceDelta)
                        ? (r.priceDelta >= 0 ? `+${r.priceDelta.toFixed(1)}M` : `${r.priceDelta.toFixed(1)}M`)
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{r.note}</td>
                  </tr>
                ))}

                <tr className="border-t border-slate-200 bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-slate-900">Totals</td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3 text-right font-semibold">{totals.fromPtsTotal}</td>
                  <td className="px-3 py-3 text-right font-semibold">{totals.toPtsTotal}</td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {totals.ptsDeltaTotal >= 0 ? `+${totals.ptsDeltaTotal}` : `${totals.ptsDeltaTotal}`}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold">{fmtPrice(totals.fromPriceTotal)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{fmtPrice(totals.toPriceTotal)}</td>
                  <td className="px-3 py-3 text-right font-semibold">
                    {totals.priceDeltaTotal >= 0 ? `+${totals.priceDeltaTotal.toFixed(1)}M` : `${totals.priceDeltaTotal.toFixed(1)}M`}
                  </td>
                  <td className="px-3 py-3" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
