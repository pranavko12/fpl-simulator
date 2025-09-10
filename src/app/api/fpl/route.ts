import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Resolve from the project root (safe in dev/build). */
function fromRoot(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function normalizeType(raw: any): 'GK' | 'DEF' | 'MID' | 'FWD' | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return ({ 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' } as const)[raw] ?? null;
  const s = String(raw).trim().toUpperCase();
  if (['GK', 'GKP', 'GOALKEEPER'].includes(s)) return 'GK';
  if (['DEF', 'DEFENDER', 'DEFENDERS'].includes(s)) return 'DEF';
  if (['MID', 'MIDFIELDER', 'MIDFIELDERS'].includes(s)) return 'MID';
  if (['FWD', 'FW', 'FORWARD', 'FORWARDS', 'ST'].includes(s)) return 'FWD';
  return null;
}

/** ✅ Only use the `name` column exactly as it is */
function normalizePlayer(r: any) {
  return {
    id: String(r.id ?? r.element ?? r.code ?? r.name ?? 'unknown'),
    name: r.name, // keep as-is, no trimming
    element_type: normalizeType(r.element_type ?? r.position ?? r.pos ?? r.elementType),
  };
}

/** Minimal CSV parser for simple, comma-separated input. */
function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((s) => s.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
    const rec: any = {};
    headers.forEach((h, i) => (rec[h] = cells[i]));
    return rec;
  });
}

/** Find seasons folders under either data/seasons or data (supports both layouts). */
async function listSeasons() {
  const candidates = [fromRoot('data', 'seasons'), fromRoot('data')];

  let seasonsDir: string | null = null;
  for (const c of candidates) {
    try {
      const s = await stat(c);
      if (s.isDirectory()) {
        seasonsDir = c;
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!seasonsDir) return [];

  const entries = await readdir(seasonsDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((d) => d.isDirectory?.() && /^\d{4}-\d{4}$/.test(d.name))
    .map((d) => d.name)
    .sort();
}

/** Try known locations; if missing, search any CSV that contains "merged_gw". */
async function resolveMergedCsvPath(season: string) {
  const tried: string[] = [];

  const candidates = [
    ['data', 'seasons', season, 'gws', 'merged_gw.csv'],
    ['data', 'seasons', season, 'gw', 'merged_gw.csv'],
    ['data', 'seasons', season, 'gws', 'merged_gw', 'merged_gw.csv'],
    ['data', season, 'gws', 'merged_gw.csv'], // no `seasons`
    ['data', season, 'gw', 'merged_gw.csv'],  // no `seasons`
    ['data', season, 'gws', 'merged_gw', 'merged_gw.csv'], // no `seasons`
  ].map((p) => fromRoot(...p));

  for (const p of candidates) {
    tried.push(p);
    try {
      const st = await stat(p);
      if (st.isFile()) return { path: p, tried };
    } catch {
      // continue
    }
  }

  // Fallback: walk both possible season roots
  const roots = [fromRoot('data', 'seasons', season), fromRoot('data', season)];
  const found: string[] = [];

  async function walk(dir: string) {
    let entries: any[] = [];
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
  if (found.length) return { path: found[0], tried: tried.concat(found) };

  return { path: null as unknown as string, tried };
}

async function seasonPlayers(season: string, debug: boolean) {
  const { path: csvPath, tried } = await resolveMergedCsvPath(season);

  if (!csvPath) {
    return { _debug: debug ? { resolved: null, tried } : undefined, players: [] };
  }

  const csv = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(csv);

  const seen = new Map<string, any>();
  for (const r of rows) {
    const p = normalizePlayer(r);
    if (!p.name) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }
  const players = Array.from(seen.values());
  return { _debug: debug ? { resolved: csvPath, tried } : undefined, players };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const op = searchParams.get('op');         // 'seasons' | 'players'
  const season = searchParams.get('season'); // e.g. '2020-2021'
  const debug = searchParams.get('debug') === '1';

  try {
    if (op === 'seasons') {
      const seasons = await listSeasons();
      return NextResponse.json({ seasons });
    }

    if (op === 'players') {
      if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 });
      const result = await seasonPlayers(season, debug);
      return NextResponse.json({ season, ...result });
    }

    return NextResponse.json({ error: 'unknown op' }, { status: 400 });
  } catch (e: any) {
    console.error('[FPL API ERROR]', e?.message);
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 });
  }
}
