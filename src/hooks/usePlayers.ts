'use client';

import { useEffect, useState } from 'react';
import type { Player } from '../types';

interface UsePlayersResult {
  players: Player[];
  byId: Map<number, Player>;     // keyed by CSV id (unchanged)
  byElementId: Map<number, Player>; // ✅ keyed by real FPL element id
  loading: boolean;
  error: string | null;
}

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<Player[]>([]);
  const [byId, setById] = useState<Map<number, Player>>(new Map());
  const [byElementId, setByElementId] = useState<Map<number, Player>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/players', { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to fetch players: ${res.status}`);
        const list = (await res.json()) as Player[];

        setPlayers(list);
        setById(new Map(list.map(p => [p.id, p])));
        const emap = new Map<number, Player>();
        for (const p of list) if (p.element_id != null) emap.set(p.element_id, p);
        setByElementId(emap);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { players, byId, byElementId, loading, error };
}
