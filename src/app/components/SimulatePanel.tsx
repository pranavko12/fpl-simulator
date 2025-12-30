'use client';

import React, { useMemo, useState } from 'react';
import Image from 'next/image';

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
  code: number | null;
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
  code: number | null;
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

function photoUrl(code: number | null, size: '110x140' | '250x250' = '110x140') {
  if (!code) return '';
  return `https://resources.premierleague.com/premierleague/photos/players/${size}/p${code}.png`;
}

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-2 text-xs font-semibold rounded-full border transition',
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function CandidateRow({
  c,
  right,
  left,
  meta,
}: {
  c: { id: string; code: number | null; name: string; team: string; price: number };
  right: React.ReactNode;
  left?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const img = photoUrl(c.code, '110x140');
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative h-14 w-14 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
          {img ? (
            <Image
              src={img}
              alt={c.name}
              fill
              sizes="56px"
              className="object-cover"
              referrerPolicy="no-referrer"
              unoptimized
              onError={() => {}}
            />
          ) : (
            <div className="text-[10px] text-slate-500 font-semibold">No photo</div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-semibold text-slate-900 truncate">{c.name}</div>
            {left}
          </div>
          <div className="text-xs text-slate-600 truncate">
            {c.team} · {c.price.toFixed(1)}M
          </div>
          {meta ? <div className="mt-1 text-[11px] text-slate-500">{meta}</div> : null}
        </div>
      </div>

      <div className="shrink-0 text-right">{right}</div>
    </div>
  );
}

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

  function HeaderCard({
    title,
    subtitle,
    img,
    badge,
    right,
  }: {
    title: string;
    subtitle: string;
    img: string;
    badge?: React.ReactNode;
    right?: React.ReactNode;
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-16 w-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
              {img ? (
                <Image
                  src={img}
                  alt={title}
                  fill
                  sizes="64px"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                  unoptimized
                />
              ) : (
                <div className="text-[10px] text-slate-500 font-semibold">No photo</div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{title}</div>
                {badge}
              </div>
              <div className="text-xs text-slate-600 truncate">{subtitle}</div>
            </div>
          </div>

          <div className="shrink-0">{right}</div>
        </div>
      </div>
    );
  }

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={closeBetter}>
          <div
            className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800">
              <div className="text-sm font-semibold text-white">Better option analysis</div>
              <button
                className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
                onClick={closeBetter}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Pill active={tab === 'range'} onClick={() => setTab('range')}>
                  Better option in range
                </Pill>
                <Pill active={tab === 'recent'} onClick={() => setTab('recent')}>
                  Recent
                </Pill>
                <Pill active={tab === 'long'} onClick={() => setTab('long')}>
                  Long term
                </Pill>
              </div>

              {tab === 'range' && (
                <>
                  {rangeLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Loading range analysis…
                    </div>
                  )}

                  {rangeErr && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rangeErr}</div>
                  )}

                  {rangeData && (
                    <div className="space-y-4">
                      <HeaderCard
                        title={rangeData.player.name}
                        subtitle={`${rangeData.player.team} · ${rangeData.player.pos} · Range GW ${fromGw} to ${toGw}`}
                        img={photoUrl(rangeData.player.code, '250x250')}
                        badge={
                          rangeData.currentIsBestByPoints ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Best in range
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Baseline
                            </span>
                          )
                        }
                        right={
                          <div className="text-right">
                            <div className="text-xs text-white/70 hidden" />
                            <div className="text-xs font-semibold text-slate-700">
                              Band {rangeData.priceBand.min.toFixed(1)}M to {rangeData.priceBand.max.toFixed(1)}M
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Pts Δ {rangeData.player.pointsDelta >= 0 ? '+' : ''}
                              {rangeData.player.pointsDelta} · Price Δ {rangeData.player.priceDelta >= 0 ? '+' : ''}
                              {rangeData.player.priceDelta.toFixed(1)}M
                            </div>
                          </div>
                        }
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">Top points gained</div>
                            <div className="text-xs text-slate-500">
                              GW {fromGw} to {toGw}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {rangeData.topByPointsGained.map((c) => (
                              <CandidateRow
                                key={c.id}
                                c={{ id: c.id, code: c.code, name: c.name, team: c.team, price: c.priceFrom }}
                                left={
                                  c.id === rangeData.recommended?.id ? (
                                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                      Recommended
                                    </span>
                                  ) : null
                                }
                                meta={
                                  <span>
                                    Pts Δ {c.pointsDelta >= 0 ? '+' : ''}
                                    {c.pointsDelta} · Price Δ {c.priceDelta >= 0 ? '+' : ''}
                                    {c.priceDelta.toFixed(1)}M
                                  </span>
                                }
                                right={
                                  <div className="text-sm font-semibold text-slate-900">
                                    {c.pointsDelta >= 0 ? '+' : ''}
                                    {c.pointsDelta}
                                  </div>
                                }
                              />
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">Top price increase</div>
                            <div className="text-xs text-slate-500">
                              GW {fromGw} to {toGw}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {rangeData.topByPriceIncrease.map((c) => (
                              <CandidateRow
                                key={c.id}
                                c={{ id: c.id, code: c.code, name: c.name, team: c.team, price: c.priceFrom }}
                                meta={
                                  <span>
                                    Price Δ {c.priceDelta >= 0 ? '+' : ''}
                                    {c.priceDelta.toFixed(1)}M · Pts Δ {c.pointsDelta >= 0 ? '+' : ''}
                                    {c.pointsDelta}
                                  </span>
                                }
                                right={
                                  <div className="text-sm font-semibold text-slate-900">
                                    {c.priceDelta >= 0 ? '+' : ''}
                                    {c.priceDelta.toFixed(1)}M
                                  </div>
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'recent' && (
                <>
                  {forecastLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Loading predictions…
                    </div>
                  )}

                  {forecastErr && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{forecastErr}</div>
                  )}

                  {forecastData && (
                    <div className="space-y-4">
                      <HeaderCard
                        title={forecastData.player.name}
                        subtitle={`${forecastData.player.team} · ${forecastData.player.pos} · Next GW ${forecastData.nextGw}`}
                        img={photoUrl(forecastData.player.code, '250x250')}
                        badge={
                          forecastData.currentIsBestNextGw ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Best next GW
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Baseline
                            </span>
                          )
                        }
                        right={
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-700">
                              Band {forecastData.priceBand.min.toFixed(1)}M to {forecastData.priceBand.max.toFixed(1)}M
                            </div>
                            <div className="text-[11px] text-slate-500">Expected points next GW</div>
                          </div>
                        }
                      />

                      {forecastData.recommendedNextGw && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-sm font-semibold text-emerald-900">Recommended for next GW</div>
                          <div className="mt-3">
                            <CandidateRow
                              c={{
                                id: forecastData.recommendedNextGw.id,
                                code: forecastData.recommendedNextGw.code,
                                name: forecastData.recommendedNextGw.name,
                                team: forecastData.recommendedNextGw.team,
                                price: forecastData.recommendedNextGw.price,
                              }}
                              left={
                                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-white text-emerald-800 border border-emerald-200">
                                  Recommended
                                </span>
                              }
                              meta={<span>GW {forecastData.nextGw} xPts</span>}
                              right={
                                <div className="text-sm font-semibold text-emerald-900">
                                  {forecastData.recommendedNextGw.epNextGw.toFixed(2)}
                                </div>
                              }
                            />
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Top options</div>
                          <div className="text-xs text-slate-500">Next GW {forecastData.nextGw}</div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {forecastData.topNextGw.map((c) => (
                            <CandidateRow
                              key={c.id}
                              c={{ id: c.id, code: c.code, name: c.name, team: c.team, price: c.price }}
                              left={
                                c.id === forecastData.recommendedNextGw?.id ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    Recommended
                                  </span>
                                ) : null
                              }
                              meta={<span>GW {forecastData.nextGw} xPts</span>}
                              right={<div className="text-sm font-semibold text-slate-900">{c.epNextGw.toFixed(2)}</div>}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {tab === 'long' && (
                <>
                  {forecastLoading && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Loading predictions…
                    </div>
                  )}

                  {forecastErr && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{forecastErr}</div>
                  )}

                  {forecastData && (
                    <div className="space-y-4">
                      <HeaderCard
                        title={forecastData.player.name}
                        subtitle={`${forecastData.player.team} · ${forecastData.player.pos} · Next 5 from GW ${forecastData.nextGw}`}
                        img={photoUrl(forecastData.player.code, '250x250')}
                        badge={
                          forecastData.currentIsBestNext5 ? (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              Best next 5
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Baseline
                            </span>
                          )
                        }
                        right={
                          <div className="text-right">
                            <div className="text-xs font-semibold text-slate-700">
                              Band {forecastData.priceBand.min.toFixed(1)}M to {forecastData.priceBand.max.toFixed(1)}M
                            </div>
                            <div className="text-[11px] text-slate-500">Expected points next 5</div>
                          </div>
                        }
                      />

                      {forecastData.recommendedNext5 && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                          <div className="text-sm font-semibold text-emerald-900">Recommended for next 5</div>
                          <div className="mt-3">
                            <CandidateRow
                              c={{
                                id: forecastData.recommendedNext5.id,
                                code: forecastData.recommendedNext5.code,
                                name: forecastData.recommendedNext5.name,
                                team: forecastData.recommendedNext5.team,
                                price: forecastData.recommendedNext5.price,
                              }}
                              left={
                                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-white text-emerald-800 border border-emerald-200">
                                  Recommended
                                </span>
                              }
                              meta={<span>Next 5 xPts</span>}
                              right={
                                <div className="text-sm font-semibold text-emerald-900">
                                  {forecastData.recommendedNext5.epNext5.toFixed(2)}
                                </div>
                              }
                            />
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Top options</div>
                          <div className="text-xs text-slate-500">
                            GW {forecastData.nextGw} to {Math.min(38, forecastData.nextGw + 4)}
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {forecastData.topNext5.map((c) => (
                            <CandidateRow
                              key={c.id}
                              c={{ id: c.id, code: c.code, name: c.name, team: c.team, price: c.price }}
                              left={
                                c.id === forecastData.recommendedNext5?.id ? (
                                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    Recommended
                                  </span>
                                ) : null
                              }
                              meta={<span>Next 5 xPts</span>}
                              right={<div className="text-sm font-semibold text-slate-900">{c.epNext5.toFixed(2)}</div>}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
