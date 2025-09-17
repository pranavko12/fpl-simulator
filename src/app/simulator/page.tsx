'use client';

import { useState } from 'react';
import HeroSection from '../components/HeroSection';
import SeasonPicker from '../components/SeasonPicker';
import GameweekPicker from '../components/GameweekPicker';
import Navbar from '../components/Navbar';
import SimulateButton from '../components/SimulateButton';
import TeamGrid from '../components/TeamGrid';

type UiPlayer = {
  name: string;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number | null;
  team?: string;
  points?: number | null;
};

type ApiPlayer = {
  name?: string;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number;
  team?: string;
  points?: number | null;
};

export default function SimulatorPage() {
  const [season, setSeason] = useState<string>('2025-2026');
  const [players, setPlayers] = useState<UiPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState(false);

  const handleSimulate = async () => {
    setLoadingPlayers(true);
    setErrorPlayers(null);
    try {
      const gwFromEl = document.getElementById('gw-from') as HTMLSelectElement | null;
      const gwFrom = gwFromEl ? Number(gwFromEl.value) : undefined;

      const url = `/api/fpl?op=players&season=${encodeURIComponent(season)}${
        gwFrom ? `&gw=${gwFrom}` : ''
      }`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const arr: ApiPlayer[] = Array.isArray(data?.players) ? data.players : [];
      const uiPlayers: UiPlayer[] = arr.map((p) => ({
        name: p.name ?? '',
        element_type: p.element_type ?? null,
        price: typeof p.price === 'number' ? p.price : null,
        team: p.team ?? '',
        points: typeof p.points === 'number' ? p.points : null,
      }));

      setPlayers(uiPlayers);
      setShowTeam(true);
    } catch (e) {
      setErrorPlayers(e instanceof Error ? e.message : 'Failed to load players');
    } finally {
      setLoadingPlayers(false);
    }
  };

  return (
    <main className="font-sans text-[#1f1f1f]">
      <Navbar />
      <HeroSection />

      <section className="px-6 -mt-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-emerald-200/40 bg-white/80 p-5 shadow-[0_8px_30px_rgba(31,38,135,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <SeasonPicker value={season} onChange={setSeason} />
              <GameweekPicker />
            </div>
            <div className="flex justify-start md:justify-end">
              <SimulateButton onClick={handleSimulate} />
            </div>
          </div>
        </div>
      </section>

      {showTeam && (
        <TeamGrid
          season={season}
          players={players}
          loading={loadingPlayers}
          error={errorPlayers}
        />
      )}
    </main>
  );
}
