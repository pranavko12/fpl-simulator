// src/app/simulator/page.tsx
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
  name?: string | null;
  element_type?: 'GK' | 'DEF' | 'MID' | 'FWD' | null;
  price?: number | string | null;
  team?: string | null;
  points?: number | string | null;
};

type GwStat = { price: number; points: number };
type StatsIndex = Record<string, Record<number, GwStat>>;

export default function SimulatorPage() {
  const [season, setSeason] = useState<string>('2025-2026');
  const [players, setPlayers] = useState<UiPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);
  const [showTeam, setShowTeam] = useState(false);
  const [statsIndex, setStatsIndex] = useState<StatsIndex>({});
  const [gwFrom, setGwFrom] = useState<number | null>(null);
  const [gwTo, setGwTo] = useState<number | null>(null);

  const toNum = (v: unknown): number => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    if (typeof v === 'string') {
      const n = Number(v.trim());
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  const handleSimulate = async () => {
    setLoadingPlayers(true);
    setErrorPlayers(null);
    try {
      const fromEl = document.getElementById('gw-from') as HTMLSelectElement | null;
      const toEl = document.getElementById('gw-to') as HTMLSelectElement | null;
      const from = fromEl ? Number(fromEl.value) : undefined;
      const to = toEl ? Number(toEl.value) : undefined;
      setGwFrom(from ?? null);
      setGwTo(to ?? null);

      const urlPlayers = `/api/fpl?op=players&season=${encodeURIComponent(season)}${from ? `&gw=${from}` : ''}`;
      const resPlayers = await fetch(urlPlayers, { cache: 'no-store' });
      if (!resPlayers.ok) throw new Error(`HTTP ${resPlayers.status}`);
      const dataPlayers = await resPlayers.json();

      const arr: ApiPlayer[] = Array.isArray(dataPlayers?.players) ? dataPlayers.players : [];
      const uiPlayers: UiPlayer[] = arr.map((p) => ({
        name: (p.name ?? '').trim(),
        element_type: p.element_type ?? null,
        price: toNum(p.price) || null,
        team: (p.team ?? '').trim(),
        points: toNum(p.points) || null,
      }));
      setPlayers(uiPlayers);

      const nextStats: StatsIndex = {};
      const loadGw = async (gw?: number) => {
        if (!gw) return;
        const url = `/api/fpl?op=players&season=${encodeURIComponent(season)}&gw=${gw}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows: ApiPlayer[] = Array.isArray(data?.players) ? data.players : [];
        for (const r of rows) {
          const key = (r.name ?? '').trim();
          if (!key) continue;
          if (!nextStats[key]) nextStats[key] = {};
          nextStats[key][gw] = { price: toNum(r.price), points: toNum(r.points) };
        }
      };

      await Promise.all([loadGw(from), loadGw(to)]);
      setStatsIndex(nextStats);
      setShowTeam(true);
    } catch (e) {
      setErrorPlayers(e instanceof Error ? e.message : 'Failed to load players');
      setStatsIndex({});
      setShowTeam(false);
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
          {errorPlayers && <p className="mt-3 text-sm text-red-600">Error: {errorPlayers}</p>}
        </div>
      </section>
      {showTeam && (
        <TeamGrid
          season={season}
          players={players}
          loading={loadingPlayers}
          error={errorPlayers}
          stats={statsIndex}
          gwFrom={gwFrom}
          gwTo={gwTo}
        />
      )}
    </main>
  );
}
