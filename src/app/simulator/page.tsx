'use client';

import { useEffect, useState } from 'react';
import HeroSection from './../components/HeroSection';
import GameweekPicker from './../components/GameweekPicker';
import TeamGrid from './../components/TeamGrid';
import SimulateButton from './../components/SimulateButton';
import SeasonPicker from './../components/SeasonPicker';

type UiPlayer = {
  name: string;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number | null; // keep price
};

export default function SimulatorPage() {
  const [season, setSeason] = useState<string>('2025-2026'); // SeasonPicker can override
  const [players, setPlayers] = useState<UiPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);

  useEffect(() => {
    if (!season) return;
    setLoadingPlayers(true);
    setErrorPlayers(null);

    fetch(`/api/fpl?op=players&season=${encodeURIComponent(season)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const arr = Array.isArray(data?.players) ? data.players : [];
        // keep price when mapping
        const ui: UiPlayer[] = arr.map((p: any) => ({
          name: p.name ?? '',
          element_type: p.element_type ?? null,
          price: p.price ?? null,
        }));
        setPlayers(ui);
      })
      .catch((e) => setErrorPlayers(e?.message ?? 'Failed to load players'))
      .finally(() => setLoadingPlayers(false));
  }, [season]);

  return (
    <main className="font-sans text-[#1f1f1f]">
      {/* White content card */}
      <div className="max-w-5xl mx-auto px-4 py-10 bg-white rounded-xl shadow-lg space-y-12">
        <HeroSection />
        <SeasonPicker value={season} onChange={setSeason} />
        <GameweekPicker />
        <SimulateButton />
      </div>

      {/* Pitch section below */}
      <TeamGrid
        season={season}
        players={players}
        loading={loadingPlayers}
        error={errorPlayers}
      />
    </main>
  );
}
