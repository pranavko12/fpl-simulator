'use client';

import React, { useMemo, useState } from 'react';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPicked = {
  id: string;
  name: string;
  element_type?: ElementType | null;
};

type GwStat = { gw: number; points: number; price: number; found: boolean };
type StatsIndex = Record<string, Record<number, GwStat>>;

type BetterCandidate = {
  id: string;
  name: string;
  team: string;
  pos: ElementType;
  priceFrom: number;
  priceTo: number;
  priceDelta: number;
  pointsFrom: number;
  pointsTo: number;
  pointsDelta: number;
};

type BetterOptionsResp = {
  player: BetterCandidate;
  priceBand: { min: number; max: number };
  topByPriceIncrease: BetterCandidate[];
  topByPointsGained: BetterCandidate[];
  recommended: BetterCandidate | null;
  currentIsBestByPoints: boolean;
};

type ForecastCandidate = {
  id: string;
  name: string;
  team: string;
  pos: ElementType;
  price: number;
  epNextGw: number;
  epNext5: number;
};

type ForecastOptionsResp = {
  nextGw: number;
  player: ForecastCandidate;
  priceBand: { min: number; max: number };
  topNextGw: ForecastCandidate[];
  topNext5: ForecastCandidate[];
  recommendedNextGw: ForecastCandidate | null;
  recommendedNext5: ForecastCandidate | null;
  currentIsBestNextGw: boolean;
  currentIsBestNext5: boolean;
};

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

      const [resRange, resForecast] = await Promise.all([
        fetch(urlRange, { cache: 'no-store' }),
        fetch(urlForecast, { cache: 'no-store' }),
      ]);

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
      if (rangeLoading) {
        setRangeErr(msg);
        setRangeData(null);
        setRangeLoading(false);
      }
      if (forecastLoading) {
        setForecastErr(msg);
        setForecastData(null);
        setForecastLoading(false);
      }
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

      {openId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={closeBetter}>
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Better option analysis</div>
              <button className="rounded border px-3 py-1 text-sm" onClick={closeBetter}>
                Close
              </button>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  tab === 'range' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
                onClick={() => setTab('range')}
              >
                Better option in range
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  tab === 'recent' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
                onClick={() => setTab('recent')}
              >
                Recent
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                  tab === 'long' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
                onClick={() => setTab('long')}
              >
                Long term
              </button>
            </div>

            {tab === 'range' && (
              <>
                <div className="mt-3 text-sm text-slate-600">
                  Evaluated same position players within ±1.0m of the player’s price at GW {fromGw}.
                </div>

                {rangeLoading && <div className="mt-4 text-sm text-slate-600">Loading…</div>}
                {rangeErr && <div className="mt-4 text-sm text-red-600">{rangeErr}</div>}

                {rangeData && (
                  <div className="mt-4 space-y-5">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Price band used {rangeData.priceBand.min.toFixed(1)}M to {rangeData.priceBand.max.toFixed(1)}M
                      </div>

                      {rangeData.currentIsBestByPoints ? (
                        <div className="mt-2 text-sm text-emerald-700 font-semibold">Congrats it was a great pick!</div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-800 font-semibold">
                          We recommend <span className="text-emerald-700">{rangeData.recommended?.name ?? 'N/A'}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border p-4">
                        <div className="text-sm font-semibold">Top price increase</div>
                        <ul className="mt-3 space-y-2 text-sm">
                          {rangeData.topByPriceIncrease.map((c) => (
                            <li key={c.id} className="flex items-center justify-between">
                              <span className="font-medium">{c.name}</span>
                              <span className="text-slate-700">
                                {c.priceDelta >= 0 ? '+' : ''}
                                {c.priceDelta.toFixed(1)}M
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="rounded-xl border p-4">
                        <div className="text-sm font-semibold">Top points earned</div>
                        <ul className="mt-3 space-y-2 text-sm">
                          {rangeData.topByPointsGained.map((c) => (
                            <li key={c.id} className="flex items-center justify-between">
                              <span className="font-medium">{c.name}</span>
                              <span className="text-slate-700">
                                {c.pointsDelta >= 0 ? '+' : ''}
                                {c.pointsDelta}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-semibold">Current vs recommended</div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Player</th>
                              <th className="px-3 py-2 text-left">Pts Δ</th>
                              <th className="px-3 py-2 text-left">Price Δ</th>
                              <th className="px-3 py-2 text-left">Price @ {fromGw}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[rangeData.player, rangeData.recommended].filter(Boolean).map((c) => (
                              <tr key={c!.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{c!.name}</td>
                                <td className="px-3 py-2">
                                  {c!.pointsDelta >= 0 ? '+' : ''}
                                  {c!.pointsDelta}
                                </td>
                                <td className="px-3 py-2">
                                  {c!.priceDelta >= 0 ? '+' : ''}
                                  {c!.priceDelta.toFixed(1)}M
                                </td>
                                <td className="px-3 py-2">{c!.priceFrom.toFixed(1)}M</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'recent' && (
              <>
                <div className="mt-3 text-sm text-slate-600">Predicted expected points for next GW.</div>

                {forecastLoading && <div className="mt-4 text-sm text-slate-600">Loading…</div>}
                {forecastErr && <div className="mt-4 text-sm text-red-600">{forecastErr}</div>}

                {forecastData && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Next GW {forecastData.nextGw} price band {forecastData.priceBand.min.toFixed(1)}M to{' '}
                        {forecastData.priceBand.max.toFixed(1)}M
                      </div>

                      {forecastData.currentIsBestNextGw ? (
                        <div className="mt-2 text-sm text-emerald-700 font-semibold">Current pick is best for next GW.</div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-800 font-semibold">
                          Recommended <span className="text-emerald-700">{forecastData.recommendedNextGw?.name ?? 'N/A'}</span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-semibold">Top options next GW</div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Player</th>
                              <th className="px-3 py-2 text-left">Team</th>
                              <th className="px-3 py-2 text-left">Price</th>
                              <th className="px-3 py-2 text-left">xPts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forecastData.topNextGw.map((c) => (
                              <tr key={c.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{c.name}</td>
                                <td className="px-3 py-2">{c.team}</td>
                                <td className="px-3 py-2">{c.price.toFixed(1)}M</td>
                                <td className="px-3 py-2">{c.epNextGw.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {tab === 'long' && (
              <>
                <div className="mt-3 text-sm text-slate-600">Predicted expected points over next 5 GWs.</div>

                {forecastLoading && <div className="mt-4 text-sm text-slate-600">Loading…</div>}
                {forecastErr && <div className="mt-4 text-sm text-red-600">{forecastErr}</div>}

                {forecastData && (
                  <div className="mt-4 space-y-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Next 5 from GW {forecastData.nextGw} price band {forecastData.priceBand.min.toFixed(1)}M to{' '}
                        {forecastData.priceBand.max.toFixed(1)}M
                      </div>

                      {forecastData.currentIsBestNext5 ? (
                        <div className="mt-2 text-sm text-emerald-700 font-semibold">Current pick is best for next 5.</div>
                      ) : (
                        <div className="mt-2 text-sm text-slate-800 font-semibold">
                          Recommended <span className="text-emerald-700">{forecastData.recommendedNext5?.name ?? 'N/A'}</span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-semibold">Top options next 5</div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Player</th>
                              <th className="px-3 py-2 text-left">Team</th>
                              <th className="px-3 py-2 text-left">Price</th>
                              <th className="px-3 py-2 text-left">xPts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {forecastData.topNext5.map((c) => (
                              <tr key={c.id} className="border-t">
                                <td className="px-3 py-2 font-medium">{c.name}</td>
                                <td className="px-3 py-2">{c.team}</td>
                                <td className="px-3 py-2">{c.price.toFixed(1)}M</td>
                                <td className="px-3 py-2">{c.epNext5.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
