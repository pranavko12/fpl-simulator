'use client';

import React, { useEffect, useMemo, useState } from 'react';

const FORMATIONS = [
  { label: '3-5-2', value: [3, 5, 2] },
  { label: '3-4-3', value: [3, 4, 3] },
  { label: '4-4-2', value: [4, 4, 2] },
  { label: '4-5-1', value: [4, 5, 1] },
  { label: '5-3-2', value: [5, 3, 2] },
  { label: '5-4-1', value: [5, 4, 1] },
] as const;

const ELEMENT_TYPE_MAP = {
  Goalkeeper: 'GK',
  Defenders: 'DEF',
  Midfielders: 'MID',
  Forwards: 'FWD',
} as const;

type UiPlayer = {
  id?: string;
  name: string;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number | string | null;
  team?: string;
  points?: number | null;
};

export default function TeamGrid({
  season,
  players,
  loading,
  error,
}: {
  season: string;
  players: UiPlayer[];
  loading?: boolean;
  error?: string | null;
}) {
  const [formation, setFormation] = useState<[number, number, number]>([4, 4, 2]);
  const [showModal, setShowModal] = useState(false);
  const [modalPosition, setModalPosition] = useState<string | null>(null);
  const [modalIndex, setModalIndex] = useState<number | null>(null);

  const [teamFilter, setTeamFilter] = useState<string>('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('Any');
  const [searchQ, setSearchQ] = useState<string>('');
  const [sortKey, setSortKey] = useState<'points_desc' | 'price_desc' | 'price_asc'>('points_desc');

  const [selected, setSelected] = useState<Record<string, (UiPlayer | null)[]>>({
    Goalkeeper: [null],
    Defenders: Array(4).fill(null),
    Midfielders: Array(4).fill(null),
    Forwards: Array(2).fill(null),
    Bench: Array(4).fill(null),
  });

  const positions = useMemo(
    () => ({
      Goalkeeper: 1,
      Defenders: formation[0],
      Midfielders: formation[1],
      Forwards: formation[2],
      Bench: 4,
    }),
    [formation]
  );

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

  const handleAddClick = (position: string, idx: number) => {
    setModalPosition(position);
    setModalIndex(idx);
    setTeamFilter('All');
    setMaxPriceFilter('Any');
    setSearchQ('');
    setSortKey('points_desc');
    setShowModal(true);
  };

  const toNum = (x: number | string | null | undefined): number => {
    if (x == null || x === '') return 0;
    const n = Number(String(x).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };

  const filteredBySlot = useMemo(() => {
    if (!modalPosition) return [];
    if (modalPosition === 'Bench') return players;
    const want = ELEMENT_TYPE_MAP[modalPosition as keyof typeof ELEMENT_TYPE_MAP];
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
    const prices = filteredBySlot
      .map((p) => toNum(p.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!prices.length) return { steps: ['Any'] as string[] };
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const minStep = Math.floor(min * 2) / 2;
    const maxStep = Math.ceil(max * 2) / 2;
    const steps: string[] = ['Any'];
    for (let v = minStep; v <= maxStep + 1e-9; v += 0.5) steps.push(v.toFixed(1));
    return { steps };
  }, [filteredBySlot]);

  const alreadyPickedIds = useMemo(() => {
    return new Set(
      Object.values(selected)
        .flat()
        .filter(Boolean)
        .map((p) => (p?.id ? p.id : p?.name))
    );
  }, [selected]);

  const filteredPlayers = useMemo(() => {
    const needle = searchQ.trim().toLowerCase();
    let list = filteredBySlot.filter((p) => {
      const pid = p.id || p.name;
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
  };

  const totalSpent = useMemo(() => {
    const all = Object.values(selected).flat().filter(Boolean) as UiPlayer[];
    return all.reduce((sum, p) => sum + toNum(p.price), 0);
  }, [selected]);

  const budgetLeft = 100 - totalSpent;
  const fmtM = (n: number) => `${n.toFixed(1)}M`;

  const resetTeam = () => {
    setSelected({
      Goalkeeper: Array(positions.Goalkeeper).fill(null),
      Defenders: Array(positions.Defenders).fill(null),
      Midfielders: Array(positions.Midfielders).fill(null),
      Forwards: Array(positions.Forwards).fill(null),
      Bench: Array(positions.Bench).fill(null),
    });
  };

  return (
    <div className="py-8 px-4 flex justify-center">
      <div className="max-w-5xl w-full mx-auto space-y-8 rounded-2xl bg-[url('/pitch.png')] bg-cover bg-center shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-center gap-3 justify-center mb-6">
          <div className="flex items-center gap-3">
            <label className="text-white font-semibold text-base">Formation:</label>
            <select
              className="px-3 py-2 rounded bg-white/90 text-gray-800 font-semibold shadow focus:outline-none"
              value={formation.join('-')}
              onChange={(e) =>
                setFormation(e.target.value.split('-').map(Number) as [number, number, number])
              }
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
              budgetLeft < 0 ? 'bg-red-600 text-white' : 'bg-white/90 text-gray-900'
            }`}
          >
            {fmtM(budgetLeft)} left
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
        </div>

        {Object.entries(positions).map(([pos, count]) => (
          <div key={pos}>
            <h3 className="text-center text-white text-lg font-semibold mb-3 drop-shadow">{pos}</h3>
            <div className="flex justify-center gap-8 flex-wrap">
              {Array.from({ length: count }).map((_, idx) => {
                const picked = selected[pos]?.[idx] ?? null;
                return (
                  <div
                    key={idx}
                    className="w-28 h-28 bg-white/10 border border-white rounded-lg flex items-center justify-center text-white text-sm hover:bg-white/20 transition cursor-pointer text-center px-2"
                    onClick={() => handleAddClick(pos, idx)}
                    title={picked ? picked.name : '+ Add'}
                  >
                    {picked ? (
                      <div className="flex flex-col items-center gap-1">
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
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
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
                &times;
              </button>

              <h2 className="text-lg font-semibold mb-4">
                Select {modalPosition} — {season}
              </h2>

              {loading && <div className="text-sm text-slate-500">Loading players…</div>}
              {error && <div className="text-sm text-red-600">Error: {error}</div>}

              {!loading && !error && (
                <>
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                    >
                      {teamOptions.map((t) => (
                        <option key={t} value={t}>
                          {t === 'All' ? 'All Teams' : t}
                        </option>
                      ))}
                    </select>

                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={maxPriceFilter}
                      onChange={(e) => setMaxPriceFilter(e.target.value)}
                    >
                      {priceRange.steps.map((s) => (
                        <option key={s} value={s}>
                          {s === 'Any' ? 'Max Price: Any' : `Max Price: ${s}M`}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Search name…"
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />

                    <select
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as any)}
                    >
                      <option value="points_desc">Sort: Most points</option>
                      <option value="price_desc">Sort: Highest price</option>
                      <option value="price_asc">Sort: Lowest price</option>
                    </select>

                    <button
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
                    {filteredPlayers.length === 0 && (
                      <li className="text-sm text-slate-500">No players match.</li>
                    )}
                    {filteredPlayers.map((p, i) => {
                      const priceVal = toNum(p.price);
                      const priceDisplay = priceVal ? `${priceVal.toFixed(1)}M` : '';
                      const pts = typeof p.points === 'number' ? p.points : 0;
                      return (
                        <li
                          key={`${p.id || p.name}-${i}`}
                          className="p-3 rounded hover:bg-blue-100 cursor-pointer transition flex flex-col"
                          onClick={() => choosePlayer(p)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {p.name}
                              {p.element_type ? ` (${p.element_type})` : ''}
                            </span>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-slate-700">{pts} pts</span>
                              <span className="text-sm font-semibold text-slate-700">{priceDisplay}</span>
                            </div>
                          </div>
                          {p.team && (
                            <div className="mt-1 text-base font-bold text-slate-800">{p.team}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
