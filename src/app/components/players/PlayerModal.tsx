'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ModalPlayer = {
  id: string | number;
  name?: string;
  web_name?: string;
  first_name?: string;
  second_name?: string;
  element_type?: string | null;
  price?: number | string | null;
  points?: number | string | null;
  total_points?: number | string | null;
  team?: string | null;
};

type Props = {
  players: ModalPlayer[];
  onSelect: (p: ModalPlayer) => void;
  onClose: () => void;
};

export default function PlayerModal({ players, onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const displayName = (p: ModalPlayer) => {
    if (p.name && p.name.trim()) return p.name;
    const joined = [p.first_name, p.second_name].filter(Boolean).join(' ').trim();
    if (joined) return joined;
    return p.web_name ?? 'Unknown';
  };

  const toNum = (x: number | string | null | undefined): number | null => {
    if (x === null || x === undefined || x === '') return null;
    const n = Number(String(x).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : null;
  };

  const formatPrice = (x: number | string | null | undefined): string => {
    const n = toNum(x);
    return n === null ? '-' : `£${n.toFixed(1)}`;
  };

  const getPoints = (p: ModalPlayer): number => {
    const n = toNum(p.points ?? p.total_points);
    return n ?? 0;
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return players.slice(0, 300);
    return players
      .filter((p) => {
        const n = displayName(p).toLowerCase();
        const t = (p.team ?? '').toLowerCase();
        return n.includes(needle) || t.includes(needle);
      })
      .slice(0, 300);
  }, [players, q]);

  const onBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onMouseDown={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Select Player"
    >
      <div
        className="bg-white rounded-2xl p-4 w-full max-w-2xl shadow-lg"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Select Player</div>
          <button
            aria-label="Close"
            className="text-sm px-2 py-1 border rounded"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <input
          ref={inputRef}
          className="border rounded w-full px-3 py-2 mb-3"
          placeholder="Search players…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="max-h-[60vh] overflow-auto divide-y">
          {!filtered.length && (
            <div className="py-10 text-center text-sm opacity-60">
              No players match.
            </div>
          )}
          {filtered.map((p) => (
            <button
              key={String(p.id)}
              className="w-full text-left py-2 hover:bg-blue-50 px-2 rounded"
              onClick={() => onSelect(p)}
            >
              <div className="font-medium">
                {displayName(p)}{' '}
                {p.element_type ? (
                  <span className="text-xs opacity-60">({String(p.element_type)})</span>
                ) : null}
              </div>
              {p.team ? (
                <div className="text-sm font-semibold">{p.team}</div>
              ) : null}
              <div className="text-xs opacity-70">
                {getPoints(p)} pts • {formatPrice(p.price)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
