'use client';

import { useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import GameweekPicker from '../components/GameweekPicker';
import Navbar from '../components/Navbar';
import TeamGrid from '../components/TeamGrid';

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type UiPlayer = {
  id: string;
  name: string;
  element_type?: ElementType | null;
  price?: number | null;
  team?: string;
  points?: number | null;
};

type PrefillPlayer = {
  slot: number;
  isBench: boolean;
  id: string;
  name: string;
  element_type: ElementType | null;
  team: string;
  price: number | null;
  points: number | null;
};

type ApiPlayersResp = {
  players: Array<{
    id: string;
    name: string;
    element_type: ElementType | null;
    price: number | null;
    team: string;
    points: number | null;
  }>;
};

type ApiEntryTeamResp = {
  entryId: number;
  gw: number;
  teamName: string | null;
  managerName: string | null;
  squad: PrefillPlayer[];
  teamValue?: number | null; // expected from API
};

export default function SimulatorPage() {
  const [players, setPlayers] = useState<UiPlayer[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [errorPlayers, setErrorPlayers] = useState<string | null>(null);

  const [entryId, setEntryId] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<PrefillPlayer[] | null>(null);

  const [teamGw, setTeamGw] = useState<number>(1);
  const [teamValue, setTeamValue] = useState<number | null>(null);

  async function loadPlayers() {
    setLoadingPlayers(true);
    setErrorPlayers(null);
    try {
      const res = await fetch('/api/fpl?op=players', { cache: 'no-store' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ApiPlayersResp;

      const ui = (data.players ?? [])
        .map((p) => ({
          id: String(p.id),
          name: String(p.name ?? '').trim(),
          element_type: p.element_type ?? null,
          price: typeof p.price === 'number' ? p.price : null,
          team: String(p.team ?? '').trim(),
          points: typeof p.points === 'number' ? p.points : null,
        }))
        .filter((p) => p.id && /^\d+$/.test(p.id) && p.name);

      setPlayers(ui);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load players';
      setErrorPlayers(msg);
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  async function importTeam() {
    setImportError(null);
    const trimmed = entryId.trim();
    if (!/^\d{1,10}$/.test(trimmed)) {
      setImportError('Enter a valid numeric Entry ID.');
      return;
    }

    try {
      const res = await fetch(
        `/api/fpl?op=entry_team&entryId=${encodeURIComponent(trimmed)}&gw=${teamGw}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as ApiEntryTeamResp;

      const squad = Array.isArray(data.squad) ? data.squad : [];
      if (squad.length !== 15) throw new Error('Could not import a full 15-player squad for that GW.');

      setPrefill(squad);

      const tv = typeof data.teamValue === 'number' && Number.isFinite(data.teamValue) ? data.teamValue : null;
      setTeamValue(tv);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to import team';
      setPrefill(null);
      setTeamValue(null);
      setImportError(msg);
    }
  }

  return (
    <main className="font-sans text-[#1f1f1f]">
      <Navbar />
      <HeroSection />

      <section className="px-6 -mt-10">
        <div className="mx-auto max-w-6xl rounded-2xl border border-emerald-200/40 bg-white/80 p-5 shadow-[0_8px_30px_rgba(31,38,135,0.12)] backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <GameweekPicker value={teamGw} onChange={setTeamGw} label="Team GW" />

              <div className="flex flex-col">
                <label className="text-xs font-semibold text-slate-700">Entry ID</label>
                <input
                  value={entryId}
                  onChange={(e) => setEntryId(e.target.value)}
                  placeholder="e.g. 3233026"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none bg-white"
                />
              </div>

              <button
                type="button"
                onClick={importTeam}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Import Team
              </button>
            </div>
          </div>

          {loadingPlayers && <p className="mt-3 text-sm text-slate-600">Loading players</p>}
          {errorPlayers && <p className="mt-3 text-sm text-red-600">Error {errorPlayers}</p>}
          {importError && <p className="mt-3 text-sm text-red-600">Error {importError}</p>}
          {prefill && <p className="mt-3 text-sm text-emerald-700">Imported 15 players for GW {teamGw}</p>}
        </div>
      </section>

      <TeamGrid
        players={players}
        loading={loadingPlayers}
        error={errorPlayers}
        teamGw={teamGw}
        prefill={prefill}
        teamValue={teamValue}
      />
    </main>
  );
}
