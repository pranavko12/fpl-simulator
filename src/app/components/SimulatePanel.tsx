'use client';

import React, { useMemo, useState } from 'react';
import BetterOptionModal, { BetterOptionsResp, ForecastOptionsResp, ElementType } from './BetterOptionModal';

type UiPicked = {
  id: string;
  name: string;
  element_type?: ElementType | null;
};

type GwStat = { gw: number; points: number; price: number; found: boolean };
type StatsIndex = Record<string, Record<number, GwStat>>;

export default function SimulatePanel({
  players,
  fromGw,
  toGw,
  stats,
  disabled,
}: {
  players: UiPicked[];
  fromGw: number;
  toGw: number;
  stats?: StatsIndex;
  disabled?: boolean;
}) {
  type Row = {
    id: string;
    name: string;
    pos: ElementType | null;
    fromPts: number;
    toPts: number;
    ptsDelta: number;
    fromPrice: number;
    toPrice: number;
    priceDelta: number;
    note: string;
  };

  const rows: Row[] = useMemo(() => {
    if (disabled) return [];
    if (!stats) return [];

    return players.map((p) => {
      const byGw = stats[String(p.id)] ?? {};
      const from = byGw[fromGw];
      const to = byGw[toGw];

      const fromOk = !!from?.found;
      const toOk = !!to?.found;

      const fromPts = fromOk ? from.points : 0;
      const toPts = toOk ? to.points : 0;

      const fromPrice = fromOk ? from.price : 0;
      const toPrice = toOk ? to.price : 0;

      const missing = !fromOk || !toOk;

      return {
        id: String(p.id),
        name: p.name,
        pos: (p.element_type ?? null) as ElementType | null,
        fromPts,
        toPts,
        ptsDelta: toPts - fromPts,
        fromPrice,
        toPrice,
        priceDelta: toPrice - fromPrice,
        note: missing ? 'Missing points or price for one or both GWs' : '',
      };
    });
  }, [disabled, players, stats, fromGw, toGw]);

  const totals = useMemo(() => {
    const sum = (vals: number[]) => vals.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);

    return {
      fromPts: sum(rows.map((r) => r.fromPts)),
      toPts: sum(rows.map((r) => r.toPts)),
      ptsDelta: sum(rows.map((r) => r.ptsDelta)),
      fromPrice: sum(rows.map((r) => r.fromPrice)),
      toPrice: sum(rows.map((r) => r.toPrice)),
      priceDelta: sum(rows.map((r) => r.priceDelta)),
    };
  }, [rows]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [tab, setTab] = useState<'range' | 'recent' | 'long'>('range');

  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeErr, setRangeErr] = useState<string | null>(null);
  const [rangeData, setRangeData] = useState<BetterOptionsResp | null>(null);

  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastErr, setForecastErr] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastOptionsResp | null>(null);

  const openBetter = async (row: Row) => {
    setOpenId(row.id);
    setTab('range');

    setRangeLoading(true);
    setRangeErr(null);
    setRangeData(null);

    setForecastLoading(true);
    setForecastErr(null);
    setForecastData(null);

    try {
      if (!row.pos) throw new Error('Player position missing');

      const urlRange =
        `/api/fpl?op=better_options` +
        `&playerId=${encodeURIComponent(row.id)}` +
        `&from=${encodeURIComponent(String(fromGw))}` +
        `&to=${encodeURIComponent(String(toGw))}`;

      const urlForecast = `/api/fpl?op=forecast_options&playerId=${encodeURIComponent(row.id)}`;

      const [resRange, resForecast] = await Promise.all([fetch(urlRange, { cache: 'no-store' }), fetch(urlForecast, { cache: 'no-store' })]);

      if (!resRange.ok) throw new Error(await resRange.text());
      const dataRange = (await resRange.json()) as BetterOptionsResp;
      setRangeData(dataRange);
      setRangeLoading(false);

      if (!resForecast.ok) throw new Error(await resForecast.text());
      const dataForecast = (await resForecast.json()) as ForecastOptionsResp;
      setForecastData(dataForecast);
      setForecastLoading(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load analysis';
      setRangeErr(msg);
      setRangeData(null);
      setRangeLoading(false);
      setForecastErr(msg);
      setForecastData(null);
      setForecastLoading(false);
    }
  };

  const closeBetter = () => {
    setOpenId(null);
    setTab('range');
    setRangeErr(null);
    setRangeData(null);
    setRangeLoading(false);
    setForecastErr(null);
    setForecastData(null);
    setForecastLoading(false);
  };

  if (!rows.length) return null;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50">
          <tr className="text-gray-700">
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3">Pos</th>
            <th className="px-4 py-3">Pts up to GW {fromGw}</th>
            <th className="px-4 py-3">Pts up to GW {toGw}</th>
            <th className="px-4 py-3">Pts Δ</th>
            <th className="px-4 py-3">Price @ {fromGw}</th>
            <th className="px-4 py-3">Price @ {toGw}</th>
            <th className="px-4 py-3">Price Δ</th>
            <th className="px-4 py-3">Note</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3">{r.pos ?? ''}</td>
              <td className="px-4 py-3">{r.fromPts}</td>
              <td className="px-4 py-3">{r.toPts}</td>
              <td className={`px-4 py-3 ${r.ptsDelta > 0 ? 'text-emerald-700' : r.ptsDelta < 0 ? 'text-red-700' : ''}`}>
                {r.ptsDelta > 0 ? '+' : ''}
                {r.ptsDelta}
              </td>
              <td className="px-4 py-3">{r.fromPrice ? r.fromPrice.toFixed(1) : ''}</td>
              <td className="px-4 py-3">{r.toPrice ? r.toPrice.toFixed(1) : ''}</td>
              <td className={`px-4 py-3 ${r.priceDelta > 0 ? 'text-emerald-700' : r.priceDelta < 0 ? 'text-red-700' : ''}`}>
                {r.priceDelta > 0 ? '+' : ''}
                {r.priceDelta.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{r.note}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => openBetter(r)}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Better option
                </button>
              </td>
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
            <td className="px-4 py-3">
              {totals.ptsDelta > 0 ? '+' : ''}
              {totals.ptsDelta}
            </td>
            <td className="px-4 py-3">{totals.fromPrice ? totals.fromPrice.toFixed(1) : ''}</td>
            <td className="px-4 py-3">{totals.toPrice ? totals.toPrice.toFixed(1) : ''}</td>
            <td className="px-4 py-3">
              {totals.priceDelta > 0 ? '+' : ''}
              {totals.priceDelta.toFixed(1)}
            </td>
            <td className="px-4 py-3" colSpan={2} />
          </tr>
        </tfoot>
      </table>

      <BetterOptionModal
        open={!!openId}
        tab={tab}
        setTab={setTab}
        fromGw={fromGw}
        toGw={toGw}
        rangeLoading={rangeLoading}
        rangeErr={rangeErr}
        rangeData={rangeData}
        forecastLoading={forecastLoading}
        forecastErr={forecastErr}
        forecastData={forecastData}
        onClose={closeBetter}
      />
    </div>
  );
}
