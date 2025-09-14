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
  name: string;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number | string | null;
  team?: string;
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
      if (arr.length > count) next[pos] = arr.slice(0, count);
      else next[pos] = [...arr, ...Array(count - arr.length).fill(null)];
    }
    return next;
  });
}, [positions]);


  const handleAddClick = (position: string, idx: number) => {
    setModalPosition(position);
    setModalIndex(idx);
    setShowModal(true);
  };

  const filteredPlayers = useMemo(() => {
    if (!modalPosition) return [];
    if (modalPosition === 'Bench') return players;
    const want = ELEMENT_TYPE_MAP[modalPosition as keyof typeof ELEMENT_TYPE_MAP];
    const haveTypes = players.some((p) => p.element_type);
    return haveTypes ? players.filter((p) => p.element_type === want) : players;
  }, [modalPosition, players]);

  const toNum = (x: number | string | null | undefined): number => {
    if (x == null || x === '') return 0;
    const n = Number(String(x).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };
  const totalSpent = useMemo(() => {
    const all = Object.values(selected).flat().filter(Boolean) as UiPlayer[];
    return all.reduce((sum, p) => sum + toNum(p.price), 0);
  }, [selected]);
  const budgetLeft = 100 - totalSpent;

  const fmtM = (n: number) => `${n.toFixed(1)}M`;

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
                  >
                    {picked ? (
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-semibold leading-tight line-clamp-2">
                          {picked.name}
                        </span>
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
            <div className="bg-white rounded-xl p-6 max-h-[80vh] w-[90vw] max-w-xl overflow-y-auto shadow-lg relative">
              <button
                className="absolute top-2 right-3 text-gray-500 text-2xl font-bold"
                onClick={() => {
                  setShowModal(false);
                  setModalPosition(null);
                  setModalIndex(null);
                }}
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4">
                Select {modalPosition} — {season}
              </h2>

              {loading && <div className="text-sm text-slate-500">Loading players…</div>}
              {error && <div className="text-sm text-red-600">Error: {error}</div>}

              {!loading && !error && (
                <ul className="space-y-2">
                  {filteredPlayers.length === 0 && (
                    <li className="text-sm text-slate-500">No players found.</li>
                  )}
                  {filteredPlayers.map((p, i) => {
                    const price = toNum(p.price);
                    return (
                      <li
                        key={`${p.name}-${i}`}
                        className="p-3 rounded hover:bg-blue-100 cursor-pointer transition flex flex-col"
                        onClick={() => choosePlayer(p)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {p.name}
                            {p.element_type ? ` (${p.element_type})` : ''}
                          </span>
                          <span className="text-sm font-semibold text-slate-700">
                            {price ? `${price.toFixed(1)}M` : ''}
                          </span>
                        </div>
                        {p.team && (
                          <div className="mt-1 text-base font-bold text-slate-800">{p.team}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
