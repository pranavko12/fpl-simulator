'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Player } from '../../../types';

type Props = {
  players: Player[];
  onSelect: (p: Player) => void;
  onClose: () => void;
};

export default function PlayerModal({ players, onSelect, onClose }: Props) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus search on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, []);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return players.slice(0, 300);
    return players
      .filter((p) => {
        const a = (p.web_name || '').toLowerCase();
        const b = (p.first_name || '').toLowerCase();
        const c = (p.second_name || '').toLowerCase();
        return a.includes(needle) || b.includes(needle) || c.includes(needle);
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
              key={p.id}
              className="w-full text-left py-2 hover:bg-blue-50 px-2 rounded"
              onClick={() => onSelect(p)}
            >
              <div className="font-medium">
                {p.web_name}{' '}
                <span className="text-xs opacity-60">({p.element_type})</span>
              </div>
              <div className="text-xs opacity-70">
                £{p.price.toFixed(1)} • {p.total_points} pts
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
