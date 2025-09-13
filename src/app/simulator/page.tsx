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
  price?: number | null;
};

type ApiPlayer = UiPlayer;

export default function SimulatorPage() {
  const [season, setSeason] = useState<string>('2025-2026');
  const [players, setPlayers] = useState<UiPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);

  useEffect(() => {
    if (!season) return;
    document.cookie = `fpl_season=${season}; Path=/; Max-Age=${60 * 60 * 24 * 30}`;
  }, [season]);

  const handleSimulate = async () => {
    setLoadingPlayers(true);
    setErrorPlayers(null);
    try {
      const cookies = Object.fromEntries(
        document.cookie.split('; ').map(c => {
          const [k, ...rest] = c.split('=');
          return [k, rest.join('=')];
        })
      );
      const gwFrom = cookies['fpl_gw_from'] ? Number(cookies['fpl_gw_from']) : undefined;
      const res = await fetch(
        `/api/fpl?op=players&season=${encodeURIComponent(season)}${gwFrom ? `&gw=${gwFrom}` : ''}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr: ApiPlayer[] = Array.isArray(data?.players) ? data.players : [];
      setPlayers(
        arr.map((p) => ({
          name: p.name ?? '',
          element_type: p.element_type ?? null,
          price: p.price ?? null,
        }))
      );
    } catch (e) {
      setErrorPlayers(e instanceof Error ? e.message : 'Failed to load players');
    } finally {
      setLoadingPlayers(false);
    }
  };

  return (
    <main className="font-sans text-[#1f1f1f]">
      <div className="max-w-5xl mx-auto px-4 py-10 bg-white rounded-xl shadow-lg space-y-12">
        <HeroSection />
        <SeasonPicker value={season} onChange={setSeason} />
        <GameweekPicker />
        <SimulateButton onClick={handleSimulate} />
      </div>

      <TeamGrid
        season={season}
        players={players}
        loading={loadingPlayers}
        error={errorPlayers}
      />
    </main>
  );
}
