import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type BootstrapEvent = { id: number; finished: boolean };
type BootstrapTeam = { id: number; name: string };
type BootstrapElement = {
  id: number;
  web_name: string;
  element_type: 1 | 2 | 3 | 4;
  now_cost: number;
  team: number;
  total_points: number;
};

type BootstrapStatic = {
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
  elements: BootstrapElement[];
};

type Entry = {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
};

type PicksResp = {
  picks: Array<{
    element: number;
    position: number; // 1..15
  }>;
};

type ElementHistoryRow = { round: number; total_points: number };
type ElementSummary = { history: ElementHistoryRow[] };

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

type ApiEntryTeamResp = {
  entryId: number;
  gw: number;
  teamName: string | null;
  managerName: string | null;
  squad: PrefillPlayer[];
};

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; found: boolean };
      to: { gw: number; points: number; found: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

function elementTypeToUi(t: number): ElementType | null {
  if (t === 1) return 'GK';
  if (t === 2) return 'DEF';
  if (t === 3) return 'MID';
  if (t === 4) return 'FWD';
  return null;
}

function toPrice(now_cost: number | null | undefined): number | null {
  if (typeof now_cost !== 'number' || !Number.isFinite(now_cost)) return null;
  return now_cost / 10;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  return data as T;
}

function lastFinishedGw(events: BootstrapEvent[]): number {
  let last = 0;
  for (const e of events) {
    if (e && e.finished === true) last = Math.max(last, e.id);
  }
  return last;
}

function parseIds(csv: string): string[] {
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;

  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (true) {
      const idx = i;
      i += 1;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });

  await Promise.all(workers);
  return out;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const op = q.get('op');

  try {
    if (op === 'players') {
      const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');

      const teamName = new Map<number, string>();
      for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

      const players: ApiPlayersResp['players'] = (boot.elements ?? []).map((e) => ({
        id: String(e.id),
        name: String(e.web_name ?? '').trim(),
        element_type: elementTypeToUi(e.element_type),
        price: toPrice(e.now_cost),
        team: teamName.get(e.team) ?? '',
        points: typeof e.total_points === 'number' ? e.total_points : null,
      }));

      return NextResponse.json({ players } satisfies ApiPlayersResp);
    }

    if (op === 'entry_team') {
      const entryIdRaw = q.get('entryId') ?? '';
      const gwRaw = q.get('gw') ?? '';

      if (!/^\d{1,10}$/.test(entryIdRaw)) return NextResponse.json({ error: 'entryId required' }, { status: 400 });
      if (!/^\d{1,2}$/.test(gwRaw)) return NextResponse.json({ error: 'gw required' }, { status: 400 });

      const entryId = Number(entryIdRaw);
      const gw = Number(gwRaw);

      const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
      const lastGw = lastFinishedGw(boot.events ?? []);
      if (lastGw > 0 && gw > lastGw) {
        return NextResponse.json(
          { error: `Team GW (${gw}) is beyond last finished GW (${lastGw}).` },
          { status: 400 }
        );
      }

      const teamName = new Map<number, string>();
      for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

      const elementsById = new Map<number, BootstrapElement>();
      for (const e of boot.elements ?? []) elementsById.set(e.id, e);

      const [entry, picks] = await Promise.all([
        fetchJson<Entry>(`https://fantasy.premierleague.com/api/entry/${entryId}/`),
        fetchJson<PicksResp>(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`),
      ]);

      const managerName = `${String(entry.player_first_name ?? '').trim()} ${String(entry.player_last_name ?? '').trim()}`.trim();
      const teamDisplay = String(entry.name ?? '').trim();

      const squad: PrefillPlayer[] = (picks.picks ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((p) => {
          const el = elementsById.get(p.element);
          const name = el ? String(el.web_name ?? '').trim() : `#${p.element}`;
          const type = el ? elementTypeToUi(el.element_type) : null;
          const team = el ? teamName.get(el.team) ?? '' : '';
          const price = el ? toPrice(el.now_cost) : null;
          const points = el && typeof el.total_points === 'number' ? el.total_points : null;

          return {
            slot: p.position,
            isBench: p.position > 11,
            id: String(p.element),
            name,
            element_type: type,
            team,
            price,
            points,
          };
        });

      if (squad.length !== 15) {
        return NextResponse.json({ error: 'Could not import a full 15-player squad for that GW.' }, { status: 400 });
      }

      const resp: ApiEntryTeamResp = {
        entryId,
        gw,
        teamName: teamDisplay || null,
        managerName: managerName || null,
        squad,
      };

      return NextResponse.json(resp);
    }

    if (op === 'stats') {
      const idsRaw = q.get('ids') ?? '';
      const fromRaw = q.get('from') ?? '';
      const toRaw = q.get('to') ?? '';

      const from = Number(fromRaw);
      const to = Number(toRaw);

      if (!idsRaw) return NextResponse.json({ error: 'ids required' }, { status: 400 });
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return NextResponse.json({ error: 'from and to are required numbers' }, { status: 400 });
      }

      const ids = parseIds(idsRaw);
      if (!ids.length) return NextResponse.json({ error: 'no valid ids' }, { status: 400 });

      const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
      const lastGw = lastFinishedGw(boot.events ?? []);

      const maxGw = Math.max(from, to);
      if (lastGw > 0 && maxGw > lastGw) {
        return NextResponse.json(
          { error: `Simulation to-GW (${maxGw}) is beyond last finished GW (${lastGw}).` },
          { status: 400 }
        );
      }

      const missing: Array<{ id: string; reason: string }> = [];

      const results = await mapLimit(ids, 10, async (id) => {
        try {
          const data = await fetchJson<ElementSummary>(`https://fantasy.premierleague.com/api/element-summary/${id}/`);
          return { id, ok: true as const, data };
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'element-summary failed';
          return { id, ok: false as const, reason: msg };
        }
      });

      const stats: ApiStatsResp['stats'] = {};

      for (const r of results) {
        if (!r.ok) {
          missing.push({ id: r.id, reason: r.reason });
          stats[r.id] = {
            from: { gw: from, points: 0, found: false },
            to: { gw: to, points: 0, found: false },
          };
          continue;
        }

        const hist = Array.isArray(r.data.history) ? r.data.history : [];
        const fromRow = hist.find((h) => h.round === from);
        const toRow = hist.find((h) => h.round === to);

        stats[r.id] = {
          from: { gw: from, points: fromRow ? Number(fromRow.total_points) : 0, found: !!fromRow },
          to: { gw: to, points: toRow ? Number(toRow.total_points) : 0, found: !!toRow },
        };
      }

      const resp: ApiStatsResp = { from, to, lastFinishedGw: lastGw, stats, missing };
      return NextResponse.json(resp);
    }

    return NextResponse.json({ error: 'unknown op' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
