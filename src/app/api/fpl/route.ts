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

function normalizePlayer(r: CsvRow): Player {
  const name =
    r.name ??
    r.web_name ??
    r.player_name ??
    r.second_name ??
    r.secondName ??
    '';
  const elementType = normalizeType(
    r.position ?? r.element_type ?? r.pos ?? r.elementType
  );
  const rawPrice =
    r.value ?? r.Value ?? r.now_cost ?? r.NowCost ?? r.price ?? r.Price ?? r.cost ?? r.Cost;
  const price = priceFromRaw(rawPrice);
  const idCandidate =
    r.id ??
    r.element ??
    r.code ??
    r.player_id ??
    r.PlayerID ??
    (name ? name.replace(/\s+/g, '_') : 'unknown');
  const team = r.team ?? r.Team ?? r.club ?? r.Club ?? '';

  return {
    id: String(idCandidate),
    name,
    element_type: elementType,
    price,
    team,
  };
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

async function seasonPlayers(season: string, gw?: number) {
  const { path: csvPath } = await resolveMergedCsvPath(season);
  if (!csvPath) return { players: [] as Player[] };

  const csv = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(csv);

  const filtered =
    typeof gw === 'number'
      ? rows.filter((r) => String(r.GW ?? r.gw ?? r.gameweek ?? r.Gameweek).trim() === String(gw))
      : rows;

  const seen = new Map<string, Player>();
  for (const r of filtered) {
    const p = normalizePlayer(r);
    if (!p.name) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
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
