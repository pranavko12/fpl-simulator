export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

type RawPlayerCSV = {
  id?: string;
  first_name?: string;
  second_name?: string;
  web_name?: string;
  element_type?: string;
  now_cost?: string;
  total_points?: string;
  selected_by_percent?: string;
};

type RawPlayersRawCSV = {
  id?: string;       // real FPL element id
  code?: string;
  web_name?: string;
  first_name?: string;
  second_name?: string;
  team?: string;
};

const CLEAN = (s: string) =>
  (s ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/^"|"$/g, '');

function parseCSV<T = Record<string,string>>(text: string): T[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(CLEAN);
  const out: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(CLEAN);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => (row[h] = cols[idx] ?? ''));
    out.push(row);
  }
  return out as T[];
}

function toPos(et: string | undefined): Position {
  const x = (et || '').toUpperCase();
  if (x === 'GK' || x === 'DEF' || x === 'MID' || x === 'FWD') return x;
  return 'MID';
}

export async function GET() {
  try {
    const base = path.join(process.cwd(), 'data', '2024-25');

    // 1) load cleaned CSV (your UI data)
    const csv = await readFile(path.join(base, 'cleaned_players.csv'), 'utf8');
    const cleaned = parseCSV<RawPlayerCSV>(csv);

    // 2) try load players_raw.csv to get official element ids
    let rawMap = new Map<string, number>(); // key by web_name (upper) -> element id
    try {
      const rawCsv = await readFile(path.join(base, 'players_raw.csv'), 'utf8');
      const raw = parseCSV<RawPlayersRawCSV>(rawCsv);
      for (const r of raw) {
        const wn = CLEAN(r.web_name || '').toUpperCase();
        const elId = Number(r.id || 0);
        if (wn && elId) rawMap.set(wn, elId);
      }
    } catch {
      // 3) fallback: bootstrap-static
      const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json',
          'Referer': 'https://fantasy.premierleague.com/',
        },
      });
      if (res.ok) {
        const js = await res.json();
        const els = Array.isArray(js.elements) ? js.elements : [];
        for (const e of els) {
          const wn = CLEAN(String(e.web_name || '')).toUpperCase();
          const elId = Number(e.id || 0);
          if (wn && elId) rawMap.set(wn, elId);
        }
      }
    }

    // 4) build final JSON list with element_id
    const list = cleaned.map((r, idx) => {
      const first = CLEAN(r.first_name || '');
      const second = CLEAN(r.second_name || '');
      const web = CLEAN(r.web_name || `${first} ${second}`);
      const wnKey = web.toUpperCase();
      const element_id = rawMap.get(wnKey) ?? null;

      const now_cost = Number(r.now_cost || 0);
      const price = now_cost > 10 ? now_cost / 10 : now_cost;

      return {
        id: Number(r.id || idx + 1),        // keep CSV id (may be meaningless)
        element_id,                          // ✅ real FPL id (or null if not found)
        first_name: first,
        second_name: second,
        web_name: web,
        element_type: toPos(r.element_type),
        price,
        total_points: Number(r.total_points || 0),
        selected_by_percent: Number(r.selected_by_percent || 0),
      };
    });

    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Failed' }, { status: 500 });
  }
}
