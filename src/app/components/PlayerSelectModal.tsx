'use client';

import React from 'react';
import Image from 'next/image';

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

function toNum(x: number | string | null | undefined): number {
  if (x == null || x === '') return 0;
  const n = Number(String(x).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function playerPhotoUrl(p: UiPlayer): string | null {
  const code = typeof p.code === 'number' ? p.code : null;
  if (!code) return null;
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${code}.png`;
}

type Props = {
  open: boolean;
  modalPosition: string | null;
  loading?: boolean;
  error?: string | null;
  teamOptions: string[];
  priceSteps: string[];
  teamFilter: string;
  setTeamFilter: (v: string) => void;
  maxPriceFilter: string;
  setMaxPriceFilter: (v: string) => void;
  searchQ: string;
  setSearchQ: (v: string) => void;
  sortKey: 'points_desc' | 'price_desc' | 'price_asc';
  setSortKey: (v: 'points_desc' | 'price_desc' | 'price_asc') => void;
  onResetFilters: () => void;
  filteredPlayers: UiPlayer[];
  onChoosePlayer: (p: UiPlayer) => void;
  onClose: () => void;
};

export default function PlayerSelectModal({
  open,
  modalPosition,
  loading,
  error,
  teamOptions,
  priceSteps,
  teamFilter,
  setTeamFilter,
  maxPriceFilter,
  setMaxPriceFilter,
  searchQ,
  setSearchQ,
  sortKey,
  setSortKey,
  onResetFilters,
  filteredPlayers,
  onChoosePlayer,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-[700px] max-h-[60vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-base font-semibold">Select {modalPosition}</h2>
          <button className="text-gray-500 text-xl font-bold" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          {loading && <div className="text-sm text-slate-500">Loading players</div>}
          {error && <div className="text-sm text-red-600">Error {error}</div>}

          {!loading && !error && (
            <>
              <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                <select className="rounded border px-2 py-1 text-sm" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
                  {teamOptions.map((t) => (
                    <option key={t} value={t}>
                      {t === 'All' ? 'All Teams' : t}
                    </option>
                  ))}
                </select>

                <select className="rounded border px-2 py-1 text-sm" value={maxPriceFilter} onChange={(e) => setMaxPriceFilter(e.target.value)}>
                  {priceSteps.map((s) => (
                    <option key={s} value={s}>
                      {s === 'Any' ? 'Max Price Any' : `≤ ${s}M`}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Search"
                  className="rounded border px-2 py-1 text-sm"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />

                <select className="rounded border px-2 py-1 text-sm" value={sortKey} onChange={(e) => setSortKey(e.target.value as Props['sortKey'])}>
                  <option value="points_desc">Most points</option>
                  <option value="price_desc">Highest price</option>
                  <option value="price_asc">Lowest price</option>
                </select>

                <button onClick={onResetFilters} className="rounded border px-2 py-1 text-sm bg-slate-50 hover:bg-slate-100">
                  Reset
                </button>
              </div>

              <ul className="space-y-1">
                {filteredPlayers.length === 0 && <li className="text-sm text-slate-500">No players match</li>}
                {filteredPlayers.map((p) => {
                  const priceVal = toNum(p.price);
                  const url = playerPhotoUrl(p);

                  return (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-100 cursor-pointer"
                      onClick={() => onChoosePlayer(p)}
                    >
                      {url ? (
                        <Image src={url} alt={p.name} width={36} height={36} className="rounded-full" unoptimized />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-200" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-slate-600">{p.team}</div>
                      </div>
                      <div className="text-sm font-semibold text-slate-700">
                        {p.points ?? 0} pts {priceVal ? `· ${priceVal.toFixed(1)}M` : ''}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
