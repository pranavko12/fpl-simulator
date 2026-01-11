'use client';

import React from 'react';
import Image from 'next/image';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

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
              <Image src={img} alt={title} fill sizes="64px" className="object-cover" referrerPolicy="no-referrer" unoptimized />
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

export default function BetterOptionModal({
  open,
  tab,
  setTab,
  fromGw,
  toGw,
  rangeLoading,
  rangeErr,
  rangeData,
  forecastLoading,
  forecastErr,
  forecastData,
  onClose,
}: {
  open: boolean;
  tab: 'range' | 'recent' | 'long';
  setTab: (v: 'range' | 'recent' | 'long') => void;
  fromGw: number;
  toGw: number;
  rangeLoading: boolean;
  rangeErr: string | null;
  rangeData: BetterOptionsResp | null;
  forecastLoading: boolean;
  forecastErr: string | null;
  forecastData: ForecastOptionsResp | null;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <div
        className="w-full max-w-4xl max-h-[70vh] rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="text-sm font-semibold text-white">Better option analysis</div>
          <button className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Loading range analysis…</div>
              )}

              {rangeErr && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{rangeErr}</div>}

              {rangeData && (
                <div className="space-y-4">
                  <HeaderCard
                    title={rangeData.player.name}
                    subtitle={`${rangeData.player.team} · ${rangeData.player.pos} · Range GW ${fromGw} to ${toGw}`}
                    img={photoUrl(rangeData.player.code, '250x250')}
                    badge={
                      rangeData.currentIsBestByPoints ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Best in range</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">Baseline</span>
                      )
                    }
                    right={
                      <div className="text-right">
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Loading predictions…</div>
              )}

              {forecastErr && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{forecastErr}</div>}

              {forecastData && (
                <div className="space-y-4">
                  <HeaderCard
                    title={forecastData.player.name}
                    subtitle={`${forecastData.player.team} · ${forecastData.player.pos} · Next GW ${forecastData.nextGw}`}
                    img={photoUrl(forecastData.player.code, '250x250')}
                    badge={
                      forecastData.currentIsBestNextGw ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Best next GW</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">Baseline</span>
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
                          right={<div className="text-sm font-semibold text-emerald-900">{forecastData.recommendedNextGw.epNextGw.toFixed(2)}</div>}
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
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Recommended</span>
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">Loading predictions…</div>
              )}

              {forecastErr && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{forecastErr}</div>}

              {forecastData && (
                <div className="space-y-4">
                  <HeaderCard
                    title={forecastData.player.name}
                    subtitle={`${forecastData.player.team} · ${forecastData.player.pos} · Next 5 from GW ${forecastData.nextGw}`}
                    img={photoUrl(forecastData.player.code, '250x250')}
                    badge={
                      forecastData.currentIsBestNext5 ? (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Best next 5</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">Baseline</span>
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
                          right={<div className="text-sm font-semibold text-emerald-900">{forecastData.recommendedNext5.epNext5.toFixed(2)}</div>}
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
                              <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">Recommended</span>
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
  );
}

export type { BetterOptionsResp, ForecastOptionsResp, ElementType };
