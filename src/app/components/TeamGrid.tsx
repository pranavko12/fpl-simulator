'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import SimulatePanel from './SimulatePanel';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPlayer = {
  id: string;
  code?: number | null;
  name: string;
  element_type?: ElementType | null;
  price?: number | null;
  team?: string;
  points?: number | null;
};

type PrefillPlayer = {
  slot: number;
  isBench: boolean;
  id: string;
  name: string;
  element_type: ElementType | null;
  team: string;
  price: number | null;
  points: number | null;
};

type Props = {
  players: UiPlayer[];
  loading?: boolean;
  error?: string | null;
  teamGw: number;
  prefill: PrefillPlayer[] | null;
  teamValue?: number | null;
};

type GwStat = { gw: number; points: number; price: number; found: boolean };
type StatsIndex = Record<string, Record<number, GwStat>>;

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; price: number; found: boolean; priceFound?: boolean };
      to: { gw: number; points: number; price: number; found: boolean; priceFound?: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

const FORMATIONS = [
  { label: '3-5-2', value: [3, 5, 2] },
  { label: '3-4-3', value: [3, 4, 3] },
  { label: '4-4-2', value: [4, 4, 2] },
  { label: '4-5-1', value: [4, 5, 1] },
  { label: '5-3-2', value: [5, 3, 2] },
  { label: '5-4-1', value: [5, 4, 1] },
] as const;

const ALLOWED_FORMATIONS: Array<[number, number, number]> = [
  [3, 5, 2],
  [3, 4, 3],
  [4, 4, 2],
  [4, 5, 1],
  [5, 3, 2],
  [5, 4, 1],
];

function pickClosestFormation(defs: number, mids: number, fwds: number): [number, number, number] {
  for (const f of ALLOWED_FORMATIONS) {
    if (f[0] === defs && f[1] === mids && f[2] === fwds) return f;
  }
  return [4, 4, 2];
}

const ELEMENT_TYPE_MAP: Record<string, ElementType> = {
  Goalkeeper: 'GK',
  Defenders: 'DEF',
  Midfielders: 'MID',
  Forwards: 'FWD',
};

function toNum(x: number | string | null | undefined): number {
  if (x == null || x === '') return 0;
  const n = Number(String(x).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function fmtM(n: number): string {
  return `${n.toFixed(1)}M`;
}

function playerPhotoUrl(p: UiPlayer, size: '110x140' | '250x250' = '110x140'): string | null {
  const code = typeof p.code === 'number' ? p.code : null;
  if (!code) return null;
  return `https://resources.premierleague.com/premierleague/photos/players/${size}/p${code}.png`;
}

export default function TeamGrid({ players, loading, error, teamGw, prefill, teamValue }: Props) {
  const [formation, setFormation] = useState<[number, number, number]>([4, 4, 2]);

  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('Any');
  const [searchQ, setSearchQ] = useState<string>('');
  const [sortKey, setSortKey] = useState<'points_desc' | 'price_desc' | 'price_asc'>('points_desc');

  const [simFromGw, setSimFromGw] = useState<number>(teamGw);
  const [simToGw, setSimToGw] = useState<number>(teamGw);
  const [statsIndex, setStatsIndex] = useState<StatsIndex | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    setSimFromGw(teamGw);
    setSimToGw(teamGw);
    setStatsIndex(null);
    setStatsError(null);
    setHasRun(false);
  }, [teamGw]);

  const positions = useMemo(() => {
    return {
      Goalkeeper: 1,
      Defenders: formation[0],
      Midfielders: formation[1],
      Forwards: formation[2],
      Bench: 4,
    };
  }, [formation]);

  const emptySelection = useMemo(() => {
    return {
      Goalkeeper: Array(positions.Goalkeeper).fill(null) as Array<UiPlayer | null>,
      Defenders: Array(positions.Defenders).fill(null) as Array<UiPlayer | null>,
      Midfielders: Array(positions.Midfielders).fill(null) as Array<UiPlayer | null>,
      Forwards: Array(positions.Forwards).fill(null) as Array<UiPlayer | null>,
      Bench: Array(positions.Bench).fill(null) as Array<UiPlayer | null>,
    };
  }, [positions]);

  const [selected, setSelected] = useState<Record<string, (UiPlayer | null)[]>>(emptySelection);

  useEffect(() => {
    setSelected((prev) => {
      const next: Record<string, (UiPlayer | null)[]> = { ...prev };
      for (const [pos, count] of Object.entries(positions)) {
        const arr = prev[pos] ?? [];
        next[pos] = arr.length > count ? arr.slice(0, count) : [...arr, ...Array(count - arr.length).fill(null)];
      }
      return next;
    });
  }, [positions]);

  useEffect(() => {
    if (!prefill || prefill.length !== 15) return;

    const starters = prefill
      .slice()
      .filter((p) => !p.isBench)
      .sort((a, b) => a.slot - b.slot);

    const bench = prefill
      .slice()
      .filter((p) => p.isBench)
      .sort((a, b) => a.slot - b.slot);

    const defsCount = starters.filter((p) => p.element_type === 'DEF').length;
    const midsCount = starters.filter((p) => p.element_type === 'MID').length;
    const fwdsCount = starters.filter((p) => p.element_type === 'FWD').length;

    const autoFormation = pickClosestFormation(defsCount, midsCount, fwdsCount);
    setFormation(autoFormation);

    const idToPlayer = new Map<string, UiPlayer>();
    for (const p of players) idToPlayer.set(String(p.id), p);

    const pick = (pp: PrefillPlayer): UiPlayer => {
      const live = idToPlayer.get(String(pp.id));
      if (live) return live;
      return {
        id: String(pp.id),
        name: pp.name,
        element_type: pp.element_type,
        team: pp.team,
        price: pp.price,
        points: pp.points,
        code: null,
      };
    };

    const gk = starters.find((p) => p.element_type === 'GK');
    const defs = starters.filter((p) => p.element_type === 'DEF');
    const mids = starters.filter((p) => p.element_type === 'MID');
    const fwds = starters.filter((p) => p.element_type === 'FWD');

    setSelected({
      Goalkeeper: [gk ? pick(gk) : null],
      Defenders: Array.from({ length: autoFormation[0] }, (_, i) => (defs[i] ? pick(defs[i]) : null)),
      Midfielders: Array.from({ length: autoFormation[1] }, (_, i) => (mids[i] ? pick(mids[i]) : null)),
      Forwards: Array.from({ length: autoFormation[2] }, (_, i) => (fwds[i] ? pick(fwds[i]) : null)),
      Bench: Array.from({ length: 4 }, (_, i) => (bench[i] ? pick(bench[i]) : null)),
    });

    setStatsIndex(null);
    setStatsError(null);
    setHasRun(false);
  }, [prefill, players]);

  const handleAddClick = (position: string, idx: number) => {
    setModalPosition(position);
    setModalIndex(idx);
    setTeamFilter('All');
    setMaxPriceFilter('Any');
    setSearchQ('');
    setSortKey('points_desc');
    setShowModal(true);
  };

  const pickedPlayers: UiPlayer[] = useMemo(() => {
    return Object.values(selected).flat().filter(Boolean) as UiPlayer[];
  }, [selected]);

  const alreadyPickedIds = useMemo(() => new Set(pickedPlayers.map((p) => String(p.id))), [pickedPlayers]);

  const filteredBySlot = useMemo(() => {
    if (!modalPosition) return [];
    if (modalPosition === 'Bench') return players;

    const want = ELEMENT_TYPE_MAP[modalPosition];
    const haveTypes = players.some((p) => p.element_type);
    return haveTypes ? players.filter((p) => p.element_type === want) : players;
  }, [modalPosition, players]);

  const teamOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of filteredBySlot) {
      const t = (p.team || '').trim();
      if (t) set.add(t);
    }
    return ['All', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [filteredBySlot]);

  const priceRange = useMemo(() => {
    const prices = filteredBySlot.map((p) => toNum(p.price)).filter((n) => Number.isFinite(n) && n > 0);
    if (!prices.length) return { steps: ['Any'] as string[] };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const minStep = Math.floor(min * 2) / 2;
    const maxStep = Math.ceil(max * 2) / 2;

    const steps: string[] = ['Any'];
    for (let v = minStep; v <= maxStep + 1e-9; v += 0.5) steps.push(v.toFixed(1));
    return { steps };
  }, [filteredBySlot]);

  const filteredPlayers = useMemo(() => {
    const needle = searchQ.trim().toLowerCase();

    let list = filteredBySlot.filter((p) => {
      const pid = String(p.id);
      if (alreadyPickedIds.has(pid)) return false;
      if (teamFilter !== 'All' && (p.team || '').trim() !== teamFilter) return false;

      const priceVal = toNum(p.price);
      if (maxPriceFilter !== 'Any') {
        const mx = Number(maxPriceFilter);
        if (Number.isFinite(mx) && priceVal > mx) return false;
      }

      if (needle && !(p.name || '').toLowerCase().includes(needle)) return false;
      return true;
    });

    list = list.slice().sort((a, b) => {
      const pa = typeof a.points === 'number' ? a.points : 0;
      const pb = typeof b.points === 'number' ? b.points : 0;
      const xa = toNum(a.price);
      const xb = toNum(b.price);

      if (sortKey === 'points_desc') return pb - pa || xa - xb;
      if (sortKey === 'price_desc') return xb - xa || pb - pa;
      if (sortKey === 'price_asc') return xa - xb || pb - pa;
      return 0;
    });

    return list;
  }, [filteredBySlot, alreadyPickedIds, teamFilter, maxPriceFilter, searchQ, sortKey]);

  const choosePlayer = (p: UiPlayer) => {
    if (!modalPosition || modalIndex == null) return;
    setSelected((prev) => {
      const arr = [...(prev[modalPosition] ?? [])];
      arr[modalIndex] = p;
      return { ...prev, [modalPosition]: arr };
    });
    setShowModal(false);
    setModalPosition(null);
    setModalIndex(null);

    setStatsIndex(null);
    setStatsError(null);
    setHasRun(false);
  };

  const totalSpent = useMemo(() => pickedPlayers.reduce((sum, p) => sum + toNum(p.price), 0), [pickedPlayers]);
  const budgetLeft = 100 - totalSpent;
  const isOverBudget = budgetLeft < 0;

  const hasFullSquad = pickedPlayers.length === 15;

  const isImported = !!prefill && prefill.length === 15;
  const canRun = hasFullSquad && (isImported ? true : !isOverBudget);

  const gwOptions = useMemo(() => Array.from({ length: 38 }, (_, i) => i + 1), []);

  const resetTeam = () => {
    setSelected(emptySelection);
    setStatsIndex(null);
    setStatsError(null);
    setHasRun(false);
  };

  async function runSimulationFetch(from: number, to: number) {
    if (!canRun) return;

    setStatsLoading(true);
    setStatsError(null);

    try {
      const ids = pickedPlayers.map((p) => String(p.id)).join(',');
      const url = `/api/fpl?op=stats&ids=${encodeURIComponent(ids)}&from=${from}&to=${to}`;
      const res = await fetch(url, { cache: 'no-store' });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as ApiStatsResp;

      const next: StatsIndex = {};
      for (const [id, v] of Object.entries(data.stats ?? {})) {
        next[id] = {
          [data.from]: { gw: data.from, points: v.from.points, price: v.from.price, found: !!v.from.found },
          [data.to]: { gw: data.to, points: v.to.points, price: v.to.price, found: !!v.to.found },
        };
      }

      setStatsIndex(next);
      setHasRun(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Simulation failed';
      setStatsIndex(null);
      setStatsError(msg);
      setHasRun(false);
    } finally {
      setStatsLoading(false);
    }
  }

  return (
    <div className="py-8 px-4 flex justify-center">
      <div className="max-w-5xl w-full mx-auto space-y-8 rounded-2xl bg-[url('/pitch.png')] bg-cover bg-center shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-center mb-6">
          <div className="flex items-center gap-3">
            <label className="text-white font-semibold text-base">Formation</label>
            <select
              className="px-3 py-2 rounded bg-white/90 text-gray-800 font-semibold shadow focus:outline-none"
              value={formation.join('-')}
              onChange={(e) => setFormation(e.target.value.split('-').map(Number) as [number, number, number])}
            >
              {FORMATIONS.map((f) => (
                <option key={f.label} value={f.value.join('-')}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`px-3 py-1 rounded text-sm font-semibold ${
              !isImported && budgetLeft < 0 ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-900'
            }`}
          >
            {typeof teamValue === 'number' && Number.isFinite(teamValue)
              ? `Team Value ${fmtM(teamValue)}`
              : `Spent ${fmtM(totalSpent)} (${fmtM(budgetLeft)} left)`}
          </div>

          <button
            type="button"
            onClick={resetTeam}
            className="px-3 py-1 rounded text-sm font-semibold bg-white/90 text-gray-900 hover:bg-white transition shadow"
            aria-label="Reset team to empty"
            title="Reset team"
          >
            Reset Team
          </button>

          <div className="ml-0 md:ml-4 text-sm font-semibold text-white/90">Team GW {teamGw}</div>
        </div>

        {Object.entries(positions).map(([pos, count]) => (
          <div key={pos}>
            <h3 className="text-center text-white text-lg font-semibold mb-3 drop-shadow">{pos}</h3>
            <div className="flex justify-center gap-8 flex-wrap">
              {Array.from({ length: count }).map((_, idx) => {
                const picked = selected[pos]?.[idx] ?? null;
                const url = picked ? playerPhotoUrl(picked) : null;

                return (
                  <div
                    key={idx}
                    className="w-28 h-28 bg-white/10 border border-white rounded-lg flex items-center justify-center text-white text-sm hover:bg-white/20 transition cursor-pointer text-center px-2"
                    onClick={() => handleAddClick(pos, idx)}
                    title={picked ? picked.name : '+ Add'}
                  >
                    {picked ? (
                      <div className="flex flex-col items-center gap-1">
                        {url ? (
                          <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/60 shadow">
                            <Image
                              src={url}
                              alt={picked.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <span className="font-semibold leading-tight line-clamp-2">{picked.name}</span>
                        <span className="text-xs text-slate-300">{picked.team}</span>
                      </div>
                    ) : (
                      '+ Add'
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-h-[80vh] w-[90vw] max-w-3xl overflow-y-auto shadow-lg relative">
              <button
                className="absolute top-2 right-3 text-gray-500 text-2xl font-bold"
                onClick={() => {
                  setShowModal(false);
                  setModalPosition(null);
                  setModalIndex(null);
                }}
                aria-label="Close"
              >
                ×
              </button>

              <h2 className="text-lg font-semibold mb-4">Select {modalPosition}</h2>

              {loading && <div className="text-sm text-slate-500">Loading players</div>}
              {error && <div className="text-sm text-red-600">Error {error}</div>}

              {!loading && !error && (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <select className="w-full rounded border px-3 py-2 text-sm" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                      {teamOptions.map((t) => (
                        <option key={t} value={t}>
                          {t === 'All' ? 'All Teams' : t}
                        </option>
                      ))}
                    </select>

                    <select className="w-full rounded border px-3 py-2 text-sm" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)}>
                      {priceRange.steps.map((s) => (
                        <option key={s} value={s}>
                          {s === 'Any' ? 'Max Price Any' : `Max Price ${s}M`}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search name"
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />

                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as 'points_desc' | 'price_desc' | 'price_asc')}
                    >
                      <option value="points_desc">Sort Most points</option>
                      <option value="price_desc">Sort Highest price</option>
                      <option value="price_asc">Sort Lowest price</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setTeamFilter('All');
                        setMaxPriceFilter('Any');
                        setSearchQ('');
                        setSortKey('points_desc');
                      }}
                      className="rounded border px-3 py-2 text-sm bg-slate-50 hover:bg-slate-100"
                    >
                      Reset Filters
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {filteredPlayers.length === 0 && <li className="text-sm text-slate-500">No players match</li>}
                    {filteredPlayers.map((p) => {
                      const priceVal = toNum(p.price);
                      const priceDisplay = priceVal ? `${priceVal.toFixed(1)}M` : '';
                      const pts = typeof p.points === 'number' ? p.points : 0;
                      const url = playerPhotoUrl(p);

                      return (
                        <li
                          key={p.id}
                          className="p-3 rounded hover:bg-blue-100 cursor-pointer transition flex items-center gap-3"
                          onClick={() => choosePlayer(p)}
                        >
                          {url ? (
                            <div className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-200">
                              <Image
                                src={url}
                                alt={p.name}
                                fill
                                sizes="40px"
                                className="object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-slate-200" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium truncate">
                                {p.name}
                                {p.element_type ? ` (${p.element_type})` : ''}
                              </span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-semibold text-slate-700">{pts} pts</span>
                                <span className="text-sm font-semibold text-slate-700">{priceDisplay}</span>
                              </div>
                            </div>
                            {p.team && <div className="mt-1 text-base font-bold text-slate-800">{p.team}</div>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-3 items-center">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-white/90">Sim From</label>
              <select
                className="px-3 py-2 rounded bg-white/90 text-gray-800 font-semibold shadow focus:outline-none"
                value={simFromGw}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSimFromGw(v);
                  if (v > simToGw) setSimToGw(v);
                }}
                disabled={!canRun}
              >
                {gwOptions.map((gw) => (
                  <option key={gw} value={gw}>
                    GW {gw}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-white/90">Sim To</label>
              <select
                className="px-3 py-2 rounded bg-white/90 text-gray-800 font-semibold shadow focus:outline-none"
                value={simToGw}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSimToGw(v);
                  if (v < simFromGw) setSimFromGw(v);
                }}
                disabled={!canRun}
              >
                {gwOptions.map((gw) => (
                  <option key={gw} value={gw}>
                    GW {gw}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => runSimulationFetch(simFromGw, simToGw)}
              disabled={!canRun || statsLoading}
              className={[
                'rounded-xl px-5 py-3 text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2',
                !canRun || statsLoading
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600',
              ].join(' ')}
            >
              {statsLoading ? 'Running…' : 'Run'}
            </button>
          </div>

          {statsError && (
            <div className="text-sm text-red-200 bg-red-950/30 border border-red-400/30 px-4 py-2 rounded">
              {statsError}
            </div>
          )}

          {!canRun && (
            <div className="text-center text-sm text-white/90">
              {hasFullSquad
                ? isImported
                  ? ''
                  : 'Over budget. Adjust picks or import a team.'
                : 'Select all 15 players to enable simulation.'}
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <SimulatePanel
            players={pickedPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              element_type: p.element_type ?? null,
            }))}
            fromGw={simFromGw}
            toGw={simToGw}
            stats={hasRun ? (statsIndex ?? undefined) : undefined}
            disabled={!canRun}
          />
        </div>
      </div>
    </div>
  );
}
