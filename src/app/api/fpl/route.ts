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
};

function fromRoot(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function normalizeType(raw: unknown): ElementType {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (s === '1' || s === 'GK' || s === 'GKP' || s === 'GOALKEEPER') return 'GK';
  if (s === '2' || s === 'DEF' || s === 'DEFENDER' || s === 'DEFENDERS') return 'DEF';
  if (s === '3' || s === 'MID' || s === 'MIDFIELDER' || s === 'MIDFIELDERS') return 'MID';
  if (s === '4' || s === 'FWD' || s === 'FW' || s === 'FORWARD' || s === 'FORWARDS' || s === 'ST') return 'FWD';
  return null;
}

function normalizePlayer(r: CsvRow): Player {
  const rawValue = r.value ?? r.now_cost ?? r.price;
  const parsed = rawValue !== undefined && rawValue !== '' ? Number(String(rawValue)) : NaN;
  const price = Number.isFinite(parsed) ? parsed / 10 : null;

  return {
    id: String(r.id ?? r.element ?? r.code ?? r.name ?? 'unknown'),
    name: r.name ?? '',
    element_type: normalizeType(r.position ?? r.element_type ?? r.pos ?? r.elementType),
    price,
  };
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

function normalizeSeasonInput(s: string) {
  const m4 = s.match(/^(\d{4})[-/](\d{4})$/);
  const m2 = s.match(/^(\d{4})[-/](\d{2})$/);
  if (m4) {
    const y1 = m4[1];
    const y2 = m4[2];
    return { long: `${y1}-${y2}`, short: `${y1}-${y2.slice(2)}` };
  }
  if (m2) {
    const y1 = m2[1];
    const y2 = m2[2];
    return { long: `${y1}-${parseInt(y2, 10) + 2000}`, short: `${y1}-${y2}` };
  }
  return { long: s, short: s };
}

async function listSeasons() {
  const bases = [fromRoot('data', 'seasons'), fromRoot('data')];
  let seasonsDir: string | null = null;
  for (const b of bases) {
    try {
      const st = await stat(b);
      if (st.isDirectory()) {
        seasonsDir = b;
        break;
      }
    } catch {}
  }
  if (!seasonsDir) return [];
  const entries = await readdir(seasonsDir, { withFileTypes: true }).catch(() => [] as Dirent[]);
  return entries
    .filter((d) => (typeof d.isDirectory === 'function' ? d.isDirectory() : false) && (/^\d{4}-\d{2}$/.test(d.name) || /^\d{4}-\d{4}$/.test(d.name)))
    .map((d) => d.name)
    .sort();
}

async function resolveMergedCsvPath(seasonInput: string) {
  const tried: string[] = [];
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
    tried.push(p);
    try {
      const st = await stat(p);
      if (st.isFile()) return { path: p, tried };
    } catch {}
  }

  const found: string[] = [];
  const roots: string[] = [];
  for (const s of seasonsToTry) {
    roots.push(fromRoot('data', 'seasons', s), fromRoot('data', s));
  }
  async function walk(dir: string) {
    let entries: Dirent[] = [];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (/merged_gw.*\.csv$/i.test(e.name)) {
        found.push(full);
      }
    }
  }
  for (const r of roots) await walk(r);

  found.sort();
  if (found.length) return { path: found[0], tried: tried.concat(found) };
  return { path: null as unknown as string, tried };
}

async function seasonPlayers(season: string, debug: boolean, gw?: number) {
  const { path: csvPath, tried } = await resolveMergedCsvPath(season);
  if (!csvPath) {
    return { _debug: debug ? { resolved: null as string | null, tried } : undefined, players: [] as Player[] };
  }

  const csv = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(csv);

  const filteredRows: CsvRow[] =
    typeof gw === 'number'
      ? rows.filter((r) => {
          const v = r.GW ?? r.gw ?? r.gameweek ?? r.Gameweek;
          return v != null && String(v).trim() === String(gw);
        })
      : rows;

  const seen = new Map<string, Player>();
  for (const r of filteredRows) {
    const p = normalizePlayer(r);
    if (!p.name) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }
  const players = Array.from(seen.values());
  return { _debug: debug ? { resolved: csvPath, tried } : undefined, players };
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const op = searchParams.get('op');
  const season = searchParams.get('season');
  const debug = searchParams.get('debug') === '1';
  const gwParam = searchParams.get('gw');
  const cookieGw = req.cookies.get('fpl_gw')?.value;
  const gw = gwParam ? Number(gwParam) : cookieGw ? Number(cookieGw) : undefined;

  try {
    if (op === 'seasons') {
      const seasons = await listSeasons();
      return NextResponse.json({ seasons });
    }

    if (op === 'players') {
      if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 });
      const result = await seasonPlayers(season, debug, gw);
      return NextResponse.json({ season, gw, ...result });
    }

    return NextResponse.json({ error: 'unknown op' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'failed';
    console.error('[FPL API ERROR]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
