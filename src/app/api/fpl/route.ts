// src/app/api/fpl/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ElementType = 'GK' | 'DEF' | 'MID' | 'FWD';

type BootstrapEvent = {
  id: number;
  finished: boolean;
  is_current: boolean;
  is_next: boolean;
};

type BootstrapTeam = { id: number; name: string; short_name: string };
type BootstrapElement = {
  id: number;
  web_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  total_points: number;
};

type BootstrapStatic = {
  events: BootstrapEvent[];
  teams: BootstrapTeam[];
  elements: BootstrapElement[];
};

type EntryResponse = { name?: string; player_first_name?: string; player_last_name?: string };

type PicksResponse = {
  picks: Array<{
    element: number;
    position: number; // 1..15
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
};

type ElementHistoryRow = {
  round: number;
  total_points: number; // GW points
  value?: number; // price * 10 at that GW (often present)
};

type ElementSummary = {
  history: ElementHistoryRow[];
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
};

type ApiStatsResp = {
  from: number;
  to: number;
  lastFinishedGw: number;
  stats: Record<
    string,
    {
      from: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
      to: { gw: number; points: number; price: number; found: boolean; priceFound: boolean };
    }
  >;
  missing: Array<{ id: string; reason: string }>;
};

function normalizeElementType(n: number): ElementType | null {
  if (n === 1) return 'GK';
  if (n === 2) return 'DEF';
  if (n === 3) return 'MID';
  if (n === 4) return 'FWD';
  return null;
}

function lastFinishedGw(events: BootstrapEvent[]): number {
  let last = 0;
  for (const e of events) {
    if (e.finished && Number.isFinite(e.id)) last = Math.max(last, e.id);
  }
  return last;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      'user-agent': 'fpl-simulator/1.0',
      accept: 'application/json',
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} for ${url}${txt ? `: ${txt}` : ''}`);
  }
  return (await res.json()) as T;
}

function parseIds(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;

  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

function priceAtOrBefore(hist: ElementHistoryRow[], gw: number): { price: number; found: boolean } {
  let bestRound = -1;
  let bestValue: number | null = null;

  for (const h of hist) {
    if (h.round <= gw && typeof h.value === 'number' && Number.isFinite(h.value)) {
      if (h.round > bestRound) {
        bestRound = h.round;
        bestValue = h.value;
      }
    }
  }

  if (bestValue == null) return { price: 0, found: false };
  return { price: bestValue / 10, found: true };
}

function cumulativePointsUpTo(hist: ElementHistoryRow[], gw: number): { points: number; found: boolean } {
  let sum = 0;
  let any = false;
  for (const h of hist) {
    if (h.round <= gw) {
      sum += Number(h.total_points) || 0;
      any = true;
    }
  }
  return { points: sum, found: any };
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const op = q.get('op');

  // ---------- players ----------
  if (op === 'players') {
    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const players = (boot.elements ?? []).map((e) => ({
      id: String(e.id),
      name: e.web_name,
      element_type: normalizeElementType(e.element_type),
      price: Number.isFinite(e.now_cost) ? e.now_cost / 10 : null,
      team: teamName.get(e.team) ?? '',
      points: Number.isFinite(e.total_points) ? e.total_points : null,
    }));

    const resp: ApiPlayersResp = { players };
    return NextResponse.json(resp);
  }

  // ---------- entry_team ----------
  if (op === 'entry_team') {
    const entryIdRaw = q.get('entryId') ?? '';
    const gwRaw = q.get('gw') ?? '';

    const entryId = Number(entryIdRaw);
    const gw = Number(gwRaw);

    if (!Number.isFinite(entryId) || entryId <= 0) {
      return NextResponse.json({ error: 'entryId required' }, { status: 400 });
    }
    if (!Number.isFinite(gw) || gw <= 0) {
      return NextResponse.json({ error: 'gw required' }, { status: 400 });
    }

    const boot = await fetchJson<BootstrapStatic>('https://fantasy.premierleague.com/api/bootstrap-static/');
    const lastGw = lastFinishedGw(boot.events ?? []);
    if (lastGw > 0 && gw > lastGw) {
      return NextResponse.json({ error: `GW (${gw}) is beyond last finished GW (${lastGw}).` }, { status: 400 });
    }

    const teamName = new Map<number, string>();
    for (const t of boot.teams ?? []) teamName.set(t.id, t.name);

    const elementById = new Map<number, BootstrapElement>();
    for (const e of boot.elements ?? []) elementById.set(e.id, e);

    const [entry, picks] = await Promise.all([
      fetchJson<EntryResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/`),
      fetchJson<PicksResponse>(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${gw}/picks/`),
    ]);

    const teamNameStr = typeof entry.name === 'string' ? entry.name : null;
    const managerNameStr =
      [entry.player_first_name, entry.player_last_name]
        .filter((x) => typeof x === 'string' && x.trim())
        .join(' ')
        .trim() || null;

    const squad: PrefillPlayer[] = (picks.picks ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => {
        const el = elementById.get(p.element);
        const pos = el ? normalizeElementType(el.element_type) : null;
        const price = el && Number.isFinite(el.now_cost) ? el.now_cost / 10 : null;
        const totalPoints = el && Number.isFinite(el.total_points) ? el.total_points : null;

        return {
          slot: p.position,
          isBench: p.position >= 12,
          id: String(p.element),
          name: el?.web_name ?? `#${p.element}`,
          element_type: pos,
          team: el ? teamName.get(el.team) ?? '' : '',
          price,
          points: totalPoints,
        };
      });

    const resp: ApiEntryTeamResp = {
      entryId,
      gw,
      teamName: teamNameStr,
      managerName: managerNameStr,
      squad,
    };

    return NextResponse.json(resp);
  }

  // ---------- stats (cumulative points + price at GW) ----------
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
          from: { gw: from, points: 0, price: 0, found: false, priceFound: false },
          to: { gw: to, points: 0, price: 0, found: false, priceFound: false },
        };
        continue;
      }

      const hist = Array.isArray(r.data.history) ? r.data.history : [];

      const fromPts = cumulativePointsUpTo(hist, from);
      const toPts = cumulativePointsUpTo(hist, to);

      const fromPrice = priceAtOrBefore(hist, from);
      const toPrice = priceAtOrBefore(hist, to);

      stats[r.id] = {
        from: { gw: from, points: fromPts.points, price: fromPrice.price, found: fromPts.found, priceFound: fromPrice.found },
        to: { gw: to, points: toPts.points, price: toPrice.price, found: toPts.found, priceFound: toPrice.found },
      };
    }

    const resp: ApiStatsResp = { from, to, lastFinishedGw: lastGw, stats, missing };
    return NextResponse.json(resp);
  }

  return NextResponse.json({ error: 'unknown op' }, { status: 400 });
}
