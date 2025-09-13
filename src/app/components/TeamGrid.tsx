'use client';

import React, { useMemo, useState } from 'react';

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

  const handleAddClick = (position: string) => {
    setModalPosition(position);
    setShowModal(true);
  };

  const filteredPlayers = useMemo(() => {
    if (!modalPosition) return [];
    const want = ELEMENT_TYPE_MAP[modalPosition as keyof typeof ELEMENT_TYPE_MAP];
    const haveTypes = players.some((p) => p.element_type);
    return haveTypes ? players.filter((p) => p.element_type === want) : players;
  }, [modalPosition, players]);

  return (
    <div className="py-8 px-4 flex justify-center">
      <div className="max-w-5xl w-full mx-auto space-y-8 rounded-2xl bg-[url('/pitch.png')] bg-cover bg-center shadow-lg p-6">
        <div className="flex items-center gap-3 justify-center mb-6">
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

        {Object.entries(positions).map(([pos, count]) => (
          <div key={pos}>
            <h3 className="text-center text-white text-lg font-semibold mb-3 drop-shadow">
              {pos}
            </h3>
            <div className="flex justify-center gap-8 flex-wrap">
              {Array.from({ length: count }).map((_, idx) => (
                <div
                  key={idx}
                  className="w-20 h-24 bg-white/10 border border-white rounded-lg flex items-center justify-center text-white text-sm hover:bg-white/20 transition cursor-pointer"
                  onClick={() => handleAddClick(pos)}
                >
                  + Add
                </div>
              ))}
            </div>
          </div>
        ))}

        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-h-[80vh] w-[90vw] max-w-xl overflow-y-auto shadow-lg relative">
              <button
                className="absolute top-2 right-3 text-gray-500 text-2xl font-bold"
                onClick={() => setShowModal(false)}
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
                  {filteredPlayers.map((p, i) => (
                    <li
                      key={`${p.name}-${i}`}
                      className="p-2 rounded hover:bg-blue-100 cursor-pointer transition"
                    >
                      {p.name}
                      <span className="text-xs text-slate-600">
                        {p.element_type ? ` (${p.element_type})` : ''}
                        {p.price !== null && p.price !== undefined && p.price !== '' ? ` - ${p.price}$` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
