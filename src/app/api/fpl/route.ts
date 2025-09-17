// src/app/api/fpl/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import type { Dirent } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD' | null;
type CsvRow = Record<string, string>;
type Player = {
  id: string;
  name: string;
  element_type: ElementType;
  price: number | null;
  team?: string;
  points?: number | null;
};

function fromRoot(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((s) => s.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
    const rec: CsvRow = {};
    headers.forEach((h, i) => (rec[h] = cells[i] ?? ''));
    return rec;
  });
}

function normalizeType(raw: unknown): ElementType {
  const s = String(raw ?? '').trim().toUpperCase();
  if (!s) return null;
  if (s === '1' || s === 'GK' || s === 'GKP' || s === 'GOALKEEPER') return 'GK';
  if (s === '2' || s === 'DEF' || s === 'DEFENDER' || s === 'DEFENDERS') return 'DEF';
  if (s === '3' || s === 'MID' || s === 'MIDFIELDER' || s === 'MIDFIELDERS') return 'MID';
  if (s === '4' || s === 'FWD' || s === 'FW' || s === 'FORWARD' || s === 'FORWARDS' || s === 'ST') return 'FWD';
  return null;
}

function priceFromRaw(raw: unknown): number | null {
  const n = Number(String(raw ?? '').trim());
  if (!Number.isFinite(n)) return null;
  return n / 10;
}

function normalizeSeasonInput(s: string) {
  const m4 = s.match(/^(\d{4})[-/](\d{4})$/);
  const m2 = s.match(/^(\d{4})[-/](\d{2})$/);
  if (m4) return { long: `${m4[1]}-${m4[2]}`, short: `${m4[1]}-${m4[2].slice(2)}` };
  if (m2) return { long: `${m2[1]}-${parseInt(m2[2], 10) + 2000}`, short: `${m2[1]}-${m2[2]}` };
  return { long: s, short: s };
}

async function resolveMergedCsvPath(seasonInput: string): Promise<{ path: string | null }> {
  const { long, short } = normalizeSeasonInput(seasonInput);
  const seasonsToTry = Array.from(new Set([long, short]));
  const candidates: string[] = [];
  for (const s of seasonsToTry) {
    [
      ['data', 'seasons', s, 'gws', 'merged_gw.csv'],
      ['data', 'seasons', s, 'gw', 'merged_gw.csv'],
      ['data', 'seasons', s, 'gws', 'merged_gw', 'merged_gw.csv'],
      ['data', s, 'gws', 'merged_gw.csv'],
      ['data', s, 'gw', 'merged_gw.csv'],
      ['data', s, 'gws', 'merged_gw', 'merged_gw.csv'],
    ].forEach((parts) => candidates.push(fromRoot(...parts)));
  }
  for (const p of candidates) {
    try {
      const st = await stat(p);
      if (st.isFile()) return { path: p };
    } catch {}
  }
  const found: string[] = [];
  const roots: string[] = [];
  for (const s of seasonsToTry) {
    roots.push(fromRoot('data', 'seasons', s), fromRoot('data', s));
  }
  async function walk(dir: string): Promise<void> {
    let entries: Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (/merged_gw.*\.csv$/i.test(e.name)) found.push(full);
    }
  }
  for (const r of roots) await walk(r);
  found.sort();
  return { path: found[0] ?? null };
}

function rowKey(r: CsvRow): string {
  const id =
    r.element ??
    r.id ??
    r.code ??
    r.player_id ??
    r.PlayerID;
  if (id != null && String(id).trim() !== '') return String(id).trim();
  const nm = (r.web_name || r.name || r.player_name || r.second_name || '').trim();
  return nm ? nm.toLowerCase().replace(/\s+/g, '_') : 'unknown';
}

function toGw(r: CsvRow): number | null {
  const v = r.GW ?? r.gw ?? r.gameweek ?? r.Gameweek;
  const n = Number(String(v ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

function parsePts(r: CsvRow): number | null {
  const raw = r.total_points ?? r.points ?? r.TotalPoints ?? r.Points ?? '';
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

function homeAway(r: CsvRow): 'H' | 'A' | '' {
  const v = String((r.was_home ?? r.home_away ?? r.venue ?? '').toString()).trim().toUpperCase();
  if (v === 'H' || v === 'HOME' || v === 'TRUE' || v === '1') return 'H';
  if (v === 'A' || v === 'AWAY' || v === 'FALSE' || v === '0') return 'A';
  return '';
}

function fixtureKey(r: CsvRow, gw: number): string | null {
  const fx = r.fixture ?? r.Fixture ?? r.FixtureID ?? r.FixtureId ?? '';
  if (String(fx).trim() !== '') return `${gw}|FX:${String(fx).trim()}`;
  const opp = (r.opponent_team ?? r.opponent ?? r.opp_team ?? r.opposition ?? '').toString().trim();
  const ha = homeAway(r);
  if (opp || ha) return `${gw}|OPP:${opp}|${ha}`;
  const ko = (r.kickoff_time ?? r.kickoff ?? '').toString().trim();
  if (ko) return `${gw}|KO:${ko.slice(0, 10)}`;
  return null;
}

async function seasonPlayers(season: string, gw?: number) {
  const { path: csvPath } = await resolveMergedCsvPath(season);
  if (!csvPath) return { players: [] as Player[] };

  const csv = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(csv);

  const perPlayerGwSum = new Map<string, Map<number, number>>();
  const perPlayerGwMax = new Map<string, Map<number, number>>();
  const seenFixture = new Map<string, Map<number, Set<string>>>();

  if (typeof gw === 'number') {
    for (const r of rows) {
      const g = toGw(r);
      if (g == null || g > gw) continue;

      const key = rowKey(r);
      const pts = parsePts(r);
      if (pts == null) continue;

      const fxKey = fixtureKey(r, g);

      if (fxKey) {
        let m = seenFixture.get(key);
        if (!m) { m = new Map(); seenFixture.set(key, m); }
        let s = m.get(g);
        if (!s) { s = new Set(); m.set(g, s); }
        if (s.has(fxKey)) continue; // duplicate of same fixture row
        s.add(fxKey);

        let sums = perPlayerGwSum.get(key);
        if (!sums) { sums = new Map(); perPlayerGwSum.set(key, sums); }
        sums.set(g, (sums.get(g) ?? 0) + pts);
      } else {
        let mx = perPlayerGwMax.get(key);
        if (!mx) { mx = new Map(); perPlayerGwMax.set(key, mx); }
        mx.set(g, Math.max(mx.get(g) ?? 0, pts));
      }
    }
  }

  const priceScope =
    typeof gw === 'number'
      ? rows.filter((r) => String(r.GW ?? r.gw ?? r.gameweek ?? r.Gameweek).trim() === String(gw))
      : rows;

  const seen = new Map<string, Player>();
  for (const r of priceScope) {
    const name =
      r.name ??
      r.web_name ??
      r.player_name ??
      r.second_name ??
      r.secondName ??
      '';
    if (!name) continue;

    const key = rowKey(r);
    const element_type = normalizeType(r.position ?? r.element_type ?? r.pos ?? r.elementType);
    const price = priceFromRaw(r.value ?? r.Value ?? r.now_cost ?? r.NowCost ?? r.price ?? r.Price ?? r.cost ?? r.Cost);
    const team = r.team ?? r.Team ?? r.club ?? r.Club ?? '';

    let cumPoints: number | null = null;
    if (typeof gw === 'number') {
      const sums = perPlayerGwSum.get(key);
      const maxs = perPlayerGwMax.get(key);
      let total = 0;
      if (sums) for (const [g, v] of sums.entries()) if (g <= gw) total += v;
      if (maxs) for (const [g, v] of maxs.entries()) if (g <= gw && (!sums || !sums.has(g))) total += v;
      cumPoints = total;
    }

    if (!seen.has(key)) {
      seen.set(key, {
        id: key,
        name,
        element_type,
        price,
        team,
        points: cumPoints,
      });
    }
  }

  return { players: Array.from(seen.values()) };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const op = q.get('op');
  const season = q.get('season') ?? undefined;
  const gw = q.get('gw') ? Number(q.get('gw')) : undefined;

  if (op === 'players') {
    if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 });
    const { players } = await seasonPlayers(season, gw);
    return NextResponse.json({ season, gw, players });
  }

  if (op === 'seasons') {
    return NextResponse.json({ seasons: [] });
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
